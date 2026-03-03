import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateShippingJobRequest, CreateShippingJobResponse } from '@/lib/types/shipping';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
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

    if (userError || !userData || !['admin', 'inventory_manager'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const body: CreateShippingJobRequest = await request.json();
    const { order_id, courier_provider_id, shipping_method_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    const { data: jobData, error: jobError } = await supabase.rpc('create_shipping_job', {
      p_order_id: order_id,
      p_courier_provider_id: courier_provider_id || null,
      p_shipping_method_id: shipping_method_id || null,
    });

    if (jobError) {
      console.error('Failed to create shipping job:', jobError);
      return NextResponse.json(
        { error: jobError.message || 'Failed to create shipping job' },
        { status: 400 }
      );
    }

    const { data: job, error: fetchError } = await supabase
      .from('shipping_jobs')
      .select('id, order_id, order_number, status')
      .eq('id', jobData)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { error: 'Job created but failed to fetch details' },
        { status: 500 }
      );
    }

    const response: CreateShippingJobResponse = {
      job_id: job.id,
      order_id: job.order_id,
      order_number: job.order_number,
      status: job.status,
      message: 'Shipping job created successfully. Order will be processed by worker service.',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in fulfill endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
