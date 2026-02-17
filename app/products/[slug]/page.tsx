import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { ProductCarousel } from '@/components/product-carousel'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { Breadcrumb, BreadcrumbItem } from '@/components/breadcrumb'
import { ProductImageGallery } from '@/components/product-image-gallery'
import { Database } from '@/lib/supabase/database.types'
import { Star } from 'lucide-react'

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
              
              {/* Rating & Sales */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-medium text-gray-900">4.9</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#FFCE3D] text-[#FFCE3D]" />
                    ))}
                  </div>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-gray-600">5.3k Ratings</span>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-gray-600">10RB+ Sold</span>
              </div>
            </div>

            {/* Price */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-baseline gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-3xl font-medium text-[#EE4D2D]">
                      {formatPrice(product.sale_price!)}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="rounded bg-[#EE4D2D] px-2 py-0.5 text-xs font-medium text-white">
                      {Math.round(((product.price - product.sale_price!) / product.price) * 100)}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-medium text-[#EE4D2D]">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">15% After Voucher</span>
                </div>
              )}
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

            {/* Shipping */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-start gap-3">
                <svg className="mt-1 h-5 w-5 text-[#26AA99]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Shipping</p>
                  <p className="mt-1 text-sm text-gray-600">Get by 19 - 22 Feb</p>
                </div>
              </div>
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
              <ProductDetailClient productId={product.id} productName={product.name} />
            </div>

            {/* Product Description */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Product Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Size:</span> {product.size}</p>
                <p><span className="font-medium">Collection:</span> {product.collection}</p>
                <p><span className="font-medium">Fragrance Family:</span> {fragranceFamily}</p>
              </div>
            </div>

            {/* Share */}
            <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
              <span className="text-sm text-gray-600">Share:</span>
              <div className="flex items-center gap-3">
                <button className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                  <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" />
                  </svg>
                </button>
                <button className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                  <svg className="h-5 w-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </button>
                <button className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                  <svg className="h-5 w-5 text-[#E4405F]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 0C7.284 0 6.944.012 5.877.06 4.813.11 4.086.278 3.45.525a4.658 4.658 0 00-1.675 1.09A4.658 4.658 0 00.685 3.29C.438 3.925.27 4.652.22 5.716.172 6.783.16 7.123.16 9.84s.012 3.057.06 4.123c.05 1.064.218 1.791.465 2.427a4.658 4.658 0 001.09 1.675 4.658 4.658 0 001.675 1.09c.636.247 1.363.415 2.427.465 1.067.048 1.407.06 4.123.06s3.057-.012 4.123-.06c1.064-.05 1.791-.218 2.427-.465a4.658 4.658 0 001.675-1.09 4.658 4.658 0 001.09-1.675c.247-.636.415-1.363.465-2.427.048-1.066.06-1.407.06-4.123s-.012-3.057-.06-4.123c-.05-1.064-.218-1.791-.465-2.427a4.658 4.658 0 00-1.09-1.675A4.658 4.658 0 0016.55.525C15.914.278 15.187.11 14.123.06 13.056.012 12.716 0 10 0zm0 1.802c2.67 0 2.986.01 4.04.058.975.045 1.504.207 1.857.344.467.182.8.398 1.15.748.35.35.566.683.748 1.15.137.353.3.882.344 1.857.048 1.054.058 1.37.058 4.04s-.01 2.986-.058 4.04c-.045.975-.207 1.504-.344 1.857-.182.467-.398.8-.748 1.15-.35.35-.683.566-1.15.748-.353.137-.882.3-1.857.344-1.054.048-1.37.058-4.04.058s-2.986-.01-4.04-.058c-.975-.045-1.504-.207-1.857-.344a3.097 3.097 0 01-1.15-.748 3.097 3.097 0 01-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.054-.058-1.37-.058-4.04s.01-2.986.058-4.04c.045-.975.207-1.504.344-1.857.182-.467.398-.8.748-1.15.35-.35.683-.566 1.15-.748.353-.137.882-.3 1.857-.344 1.054-.048 1.37-.058 4.04-.058z" />
                    <path d="M10 13.365A3.365 3.365 0 1110 6.635a3.365 3.365 0 010 6.73zm0-8.532a5.167 5.167 0 100 10.334 5.167 5.167 0 000-10.334zm6.578-.438a1.208 1.208 0 11-2.416 0 1.208 1.208 0 012.416 0z" />
                  </svg>
                </button>
              </div>
              <button className="ml-auto flex items-center gap-2 text-sm text-[#EE4D2D] hover:text-[#d43f1f] transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>Favorite (6.6k)</span>
              </button>
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
