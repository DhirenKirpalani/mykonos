import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ProductCarousel } from '@/components/product-carousel'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { Breadcrumb, BreadcrumbItem } from '@/components/breadcrumb'
import { ProductImageGallery } from '@/components/product-image-gallery'
import { ProductPriceDisplay } from '@/components/ProductPriceDisplay'
import { ProductShippingInfo } from '@/components/ProductShippingInfo'
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
  const hasDiscount = product.sale_price && product.sale_price < product.price

  // Build breadcrumb items following website route
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Catalog', href: '/products' },
    { label: fragranceFamily, href: `/products?category=${encodeURIComponent(fragranceFamily)}` },
    { label: product.name, href: `/products/${product.slug}` },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-3 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Image Gallery */}
          <div>
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

            {/* Product Title */}
            <div>
              <h1 className="mb-3 text-2xl font-medium text-gray-900">
                {product.name}
              </h1>
            </div>

            {/* Price - Dynamic based on region */}
            <div className="rounded-lg bg-gray-50 p-4">
              <ProductPriceDisplay product={product} />
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
            <div className="border-t border-gray-200 pt-4">
              <ProductShippingInfo product={product} />
            </div>

            {/* Shopping Guarantee */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-start gap-3">
                <svg className="mt-1 h-5 w-5 text-[#EE4D2D]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Shopping Guarantee</p>
                  <p className="mt-1 text-sm text-gray-600">
                    15 Days Return • 100% Original • Product Assurance Protection
                  </p>
                </div>
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="border-t border-gray-200 pt-4">
              <ProductDetailClient 
                productId={product.id} 
                productName={product.name}
                minQuantity={(product as any).min_purchase_quantity || 1}
                maxQuantity={(product as any).max_purchase_quantity || undefined}
                stockQuantity={product.stock_quantity || 0}
                price={product.price}
                priceIdr={(product as any).price_idr}
                salePrice={product.sale_price}
                compareAtPrice={(product as any).compare_at_price}
              />
            </div>

            {/* Product Description */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="mb-4 text-xl font-bold text-gray-900">Product Description</h3>
              <div 
                className="prose prose-sm max-w-none text-gray-600 leading-relaxed mb-6"
                dangerouslySetInnerHTML={{ __html: product.description || '' }}
              />
              
              {/* Product Specifications */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <h4 className="mb-4 text-base font-semibold text-gray-900">Product Specifications</h4>
                <div className="grid gap-3">
                  {(product as any).volume_ml && (
                    <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <span className="w-40 text-sm font-medium text-gray-700">Size</span>
                      <span className="text-sm text-gray-900">{(product as any).volume_ml}ml</span>
                    </div>
                  )}
                  {product.collection && (
                    <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <span className="w-40 text-sm font-medium text-gray-700">Collection</span>
                      <span className="text-sm text-gray-900">{product.collection}</span>
                    </div>
                  )}
                  {fragranceFamily && (
                    <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <span className="w-40 text-sm font-medium text-gray-700">Fragrance Family</span>
                      <span className="text-sm text-gray-900">{fragranceFamily}</span>
                    </div>
                  )}
                  {(product as any).gender && (
                    <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <span className="w-40 text-sm font-medium text-gray-700">Gender</span>
                      <span className="text-sm text-gray-900">{(product as any).gender}</span>
                    </div>
                  )}
                  {(product as any).formulation && (
                    <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <span className="w-40 text-sm font-medium text-gray-700">Formulation</span>
                      <span className="text-sm text-gray-900">{(product as any).formulation}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fragrance Notes */}
              {((product as any).top_notes || (product as any).middle_notes || (product as any).base_notes) && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <h4 className="mb-4 text-base font-semibold text-gray-900">Fragrance Notes</h4>
                  <div className="space-y-4">
                    {(product as any).top_notes && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-gray-700">Top Notes</p>
                        <p className="text-sm text-gray-600">{(product as any).top_notes}</p>
                      </div>
                    )}
                    {(product as any).middle_notes && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-gray-700">Middle Notes</p>
                        <p className="text-sm text-gray-600">{(product as any).middle_notes}</p>
                      </div>
                    )}
                    {(product as any).base_notes && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-gray-700">Base Notes</p>
                        <p className="text-sm text-gray-600">{(product as any).base_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {((product as any).country_of_origin || (product as any).bpom_number) && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <h4 className="mb-4 text-base font-semibold text-gray-900">Additional Information</h4>
                  <div className="grid gap-3">
                    {(product as any).country_of_origin && (
                      <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                        <span className="w-40 text-sm font-medium text-gray-700">Country of Origin</span>
                        <span className="text-sm text-gray-900">{(product as any).country_of_origin}</span>
                      </div>
                    )}
                    {(product as any).bpom_number && (
                      <div className="flex items-center border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                        <span className="w-40 text-sm font-medium text-gray-700">No. BPOM</span>
                        <span className="text-sm text-gray-900">{(product as any).bpom_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
