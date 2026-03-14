import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ProductCarousel } from '@/components/product-carousel'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { Breadcrumb, BreadcrumbItem } from '@/components/breadcrumb'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductImageGallery } from '@/components/product-image-gallery'
import { ProductPriceDisplay } from '@/components/ProductPriceDisplay'
import { ProductShippingInfo } from '@/components/ProductShippingInfo'
import { CollapsibleDescription } from '@/components/CollapsibleDescription'
import { ExpandableSpecifications } from '@/components/ExpandableSpecifications'
import { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

type Product = Database['public']['Tables']['products']['Row']

async function getProduct(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single() as { data: Product | null; error: any }

  if (error || !data) {
    return null
  }

  return data
}

async function getRelatedProducts(fragranceFamily: string, currentId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('fragrance_family', fragranceFamily)
    .neq('id', currentId)
    .limit(4) as { data: Product[] | null; error: any }

  if (error || !data) {
    return []
  }

  return data
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const product = await getProduct(params.slug)

  if (!product) {
    notFound()
  }

  const fragranceFamily = product.fragrance_family || 'Uncategorized'
  const relatedProducts = await getRelatedProducts(fragranceFamily, product.id)
  const hasDiscount = product.sale_price && product.sale_price < product.price_idr

  // Build breadcrumb items following website route
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Catalog', href: '/products' },
    { label: fragranceFamily, href: `/products?category=${encodeURIComponent(fragranceFamily)}` },
    { label: product.name, href: `/products/${product.slug}` },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-3 lg:px-8">
        {/* Back Button - Mobile only */}
        <div className="mb-3 md:hidden">
          <Link href="/products" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
        </div>

        {/* Breadcrumb - Desktop only */}
        <div className="mb-3 hidden md:block">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="w-full">
            <ProductImageGallery images={product.image_urls} productName={product.name} />
          </div>

          {/* Product Details */}
          <div className="space-y-3">
            {/* Flash Sale Badge */}
            {hasDiscount && (
              <div className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1 text-sm font-medium text-white">
                <span>Flash Sale</span>
              </div>
            )}

            {/* Price Display - Above Title */}
            {product && (
              <div className="mb-3">
                <ProductPriceDisplay 
                  product={product}
                  showRange={true}
                />
              </div>
            )}

            {/* Product Title */}
            <div>
              <h1 className="mb-2 text-lg md:text-2xl font-medium text-gray-900">
                {product.name}
              </h1>
              {/* Rating and Sold */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-gray-900">4.9</span>
                  <svg className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  {(product as any).products_sold >= 1000
                    ? `${Math.floor((product as any).products_sold / 1000)}RB+`
                    : `${(product as any).products_sold || 0}`} Terjual
                </span>
              </div>
            </div>

            {/* Vouchers */}
            {hasDiscount && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Shop Vouchers</p>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded border border-[#EE4D2D] bg-white px-3 py-1.5 text-xs font-medium text-[#EE4D2D]">
                    Rp5k OFF
                  </div>
                  <div className="rounded border border-[#EE4D2D] bg-white px-3 py-1.5 text-xs font-medium text-[#EE4D2D]">
                    Rp10k OFF
                  </div>
                  <div className="rounded border border-[#EE4D2D] bg-white px-3 py-1.5 text-xs font-medium text-[#EE4D2D]">
                    Rp15k OFF
                  </div>
                </div>
              </div>
            )}

            {/* Shipping - Dynamic based on pre-order */}
            <div className="py-3">
              <ProductShippingInfo product={product} />
            </div>

            {/* Shopping Guarantee */}
            <div className="flex items-start gap-3 border-t border-gray-100 py-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#EE4D2D]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Shopping Guarantee</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  15 Days Return • 100% Original • Product Assurance Protection
                </p>
              </div>
            </div>

            {/* Action Buttons - Hidden on mobile (shown in sticky bar) */}
            <ProductDetailClient 
              product={product}
              productId={product.id} 
              productName={product.name}
              productSlug={product.slug}
              minQuantity={(product as any).min_purchase_quantity || 1}
              maxQuantity={(product as any).max_purchase_quantity || undefined}
              stockQuantity={product.stock_quantity || 0}
              price={(product as any).price_usd}
              priceIdr={(product as any).price_idr}
              salePrice={product.sale_price}
              compareAtPrice={(product as any).compare_at_price}
              productData={{
                id: product.id,
                name: product.name,
                image_urls: (product as any).image_urls || [],
                price: (product as any).price_usd || 0,
                price_idr: (product as any).price_idr,
                sale_price: product.sale_price,
                stock_quantity: product.stock_quantity || 0,
                min_purchase_quantity: (product as any).min_purchase_quantity,
                max_purchase_quantity: (product as any).max_purchase_quantity,
                variants: (product as any).variants || []
              }}
            />

            {/* Product Specifications */}
            <ExpandableSpecifications product={product} fragranceFamily={fragranceFamily} />

            {/* Product Description */}
            <CollapsibleDescription description={product.description || ''} />
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="border-t border-border/40 bg-luxury-gray-light">
          <ProductCarousel title="You May Also Like" products={relatedProducts} />
        </div>
      )}
    </div>
  )
}
