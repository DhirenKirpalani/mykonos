import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !['admin', 'inventory_manager', 'support_agent'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log('[Admin Order API] Fetching order with ID:', params.id);
    
    // Check if params.id looks like a UUID or order_number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    
    console.log('[Admin Order API] Is UUID:', isUUID);
    console.log('[Admin Order API] Querying by:', isUUID ? 'id' : 'order_number');
    
    // Fetch order without nested relationships to avoid PostgREST cache issues
    let orderQuery = supabase.from('orders').select('*');
    
    if (isUUID) {
      orderQuery = orderQuery.eq('id', params.id);
    } else {
      orderQuery = orderQuery.eq('order_number', params.id);
    }

    const { data: order, error: orderError } = await orderQuery.single();

    console.log('[Admin Order API] Order data:', order);
    console.log('[Admin Order API] Order error:', orderError);

    if (orderError || !order) {
      console.error('[Admin Order API] Failed to fetch order:', orderError);
      return NextResponse.json(
        { 
          error: 'Order not found',
          details: orderError?.message,
          searchedBy: isUUID ? 'id' : 'order_number',
          searchValue: params.id
        },
        { status: 404 }
      );
    }

    // Fetch user data separately
    const { data: orderUserData } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', order.user_id)
      .single();

    // Fetch order items separately
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, quantity, unit_price, product_id')
      .eq('order_id', order.id);

    // Fetch product details for each order item
    if (orderItems && orderItems.length > 0) {
      const productIds = orderItems.map(item => item.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku')
        .in('id', productIds);

      // Attach product data to order items
      orderItems.forEach(item => {
        const product = products?.find(p => p.id === item.product_id);
        (item as any).product = product;
      });
    }

    // Combine all data
    const fullOrder = {
      ...order,
      user: orderUserData,
      order_items: orderItems || []
    };

    console.log('[Admin Order API] Successfully fetched order');
    return NextResponse.json(fullOrder);

  } catch (error) {
    console.error('Unexpected error in admin order endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
