import { notFound } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Heart } from 'lucide-react'
import { ProductCarousel } from '@/components/product-carousel'

async function getProduct(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function getRelatedProducts(category: string, currentId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .neq('id', currentId)
    .limit(4)

  if (error) {
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

  const relatedProducts = await getRelatedProducts(product.category, product.id)
  const hasDiscount = product.sale_price && product.sale_price < product.price

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-luxury-gray-light">
              <Image
                src={product.image_urls[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {product.is_new && (
                <div className="absolute left-4 top-4 rounded-full bg-luxury-gold px-3 py-1 text-xs font-medium text-white">
                  NEW
                </div>
              )}
              {hasDiscount && (
                <div className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
                  SALE
                </div>
              )}
            </div>
            {product.image_urls.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.image_urls.slice(1).map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-lg bg-luxury-gray-light"
                  >
                    <Image
                      src={url}
                      alt={`${product.name} ${index + 2}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 25vw, 12vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-luxury-gold">
                {product.collection}
              </p>
              <h1 className="mb-2 font-serif text-4xl font-bold lg:text-5xl">
                {product.name}
              </h1>
              <p className="text-lg text-muted-foreground">{product.size}</p>
            </div>

            <div className="flex items-center gap-3">
              {hasDiscount ? (
                <>
                  <span className="font-serif text-3xl font-bold text-luxury-gold">
                    {formatPrice(product.sale_price!)}
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="font-serif text-3xl font-bold">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            <div className="border-t border-border/40 pt-6">
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            <div className="space-y-3">
              <Button variant="luxury" size="lg" className="w-full">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                <Heart className="mr-2 h-5 w-5" />
                Add to Wishlist
              </Button>
            </div>

            <div className="border-t border-border/40 pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-1 h-5 w-5 text-luxury-gold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Free Shipping</p>
                    <p className="text-sm text-muted-foreground">
                      On orders over $150
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-1 h-5 w-5 text-luxury-gold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Complimentary Gift Wrapping</p>
                    <p className="text-sm text-muted-foreground">
                      Beautifully packaged
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-1 h-5 w-5 text-luxury-gold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Authentic Products</p>
                    <p className="text-sm text-muted-foreground">
                      100% genuine guarantee
                    </p>
                  </div>
                </div>
              </div>
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
