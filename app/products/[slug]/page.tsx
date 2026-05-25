'use client'

import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { ProductCarousel } from '@/components/product-carousel'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ArrowLeft, Info, ChevronDown, Truck, Droplets } from 'lucide-react'
import Link from 'next/link'
import { ProductImageGallery } from '@/components/product-image-gallery'
import { ProductPriceDisplay } from '@/components/ProductPriceDisplay'
import { ProductShippingInfo } from '@/components/ProductShippingInfo'
import { ExpandableSpecifications } from '@/components/ExpandableSpecifications'
import { LoadingSpinner } from '@/components/common'
import { VoucherCountdown } from '@/components/VoucherCountdown'
import { Database } from '@/lib/supabase/database.types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState, useEffect } from 'react'

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

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const { t, locale } = useLanguage()
  const productTranslations = t.products
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [voucher, setVoucher] = useState<{ discount_type: 'percentage' | 'fixed', discount_value: number, valid_until: string } | null>(null)
  const [relatedVouchers, setRelatedVouchers] = useState<any[]>([])
  const [activeDiscounts, setActiveDiscounts] = useState<Map<string, any>>(new Map())
  const [popularProducts, setPopularProducts] = useState<Product[]>([])
  const [showDescription, setShowDescription] = useState(false)
  const [showFragranceNotes, setShowFragranceNotes] = useState(false)
  const [showShipping, setShowShipping] = useState(false)

  const handleVoucherExpire = () => {
    setVoucher(null)
  }

  useEffect(() => {
    async function loadProduct() {
      const productData = await getProduct(params.slug)
      if (!productData) {
        notFound()
      }
      setProduct(productData)
      document.title = `${productData.name} — MYKONOS`
      const fragranceFamily = productData.fragrance_family || 'Uncategorized'
      const related = await getRelatedProducts(fragranceFamily, productData.id)
      setRelatedProducts(related)
      // Fetch popular products for the "You May Also Like" section
      try {
        const popRes = await fetch('/api/products?filter=popular&limit=12')
        const popData = await popRes.json()
        setPopularProducts((popData.products || []).filter((p: Product) => p.id !== productData.id))
      } catch {}
      
      // Fetch active discount campaigns for this product (all variants)
      try {
        const now = new Date().toISOString()
        const { data: discountData, error: discountError } = await supabase
          .from('discount_products')
          .select(`
            *,
            discounts!inner(
              id,
              name,
              start_date,
              end_date,
              is_active
            )
          `)
          .eq('product_id', productData.id)
          .eq('is_active', true)
          .eq('discounts.is_active', true)
          .lte('discounts.start_date', now)
          .gte('discounts.end_date', now)

        if (!discountError && discountData && discountData.length > 0) {
          // Create a map of variant_id -> discount data
          const discountMap = new Map()
          discountData.forEach(discount => {
            const key = discount.variant_id || 'no-variant'
            discountMap.set(key, discount)
          })
          setActiveDiscounts(discountMap)
          console.log('🎯 Active discounts loaded:', discountData.length, 'variants')
        }
      } catch (error) {
        console.error('Error fetching discount:', error)
      }
      
      // Fetch active vouchers for this product and related products
      try {
        const { data: vouchers, error } = await supabase
          .from('promo_codes')
          .select('discount_type, discount_value, scope, applicable_product_ids, valid_until')
          .eq('is_active', true)
          .lte('valid_from', new Date().toISOString())
          .gte('valid_until', new Date().toISOString())

        if (!error && vouchers && vouchers.length > 0) {
          // Find voucher for current product
          const applicableVoucher = vouchers.find(v => 
            v.scope === 'all' || 
            (v.scope === 'specific_products' && v.applicable_product_ids?.includes(productData.id))
          )
          if (applicableVoucher) {
            setVoucher({
              discount_type: applicableVoucher.discount_type as 'percentage' | 'fixed',
              discount_value: applicableVoucher.discount_value,
              valid_until: applicableVoucher.valid_until
            })
          }
          
          // Set vouchers for related products (for ProductCarousel)
          setRelatedVouchers(vouchers)
        }
      } catch (error) {
        console.error('Error fetching vouchers:', error)
      }
      
      setLoading(false)
    }
    loadProduct()
  }, [params.slug])

  if (loading || !product) {
    return <LoadingSpinner />
  }

  const fragranceFamily = product.fragrance_family || 'Uncategorized'
  const hasDiscount = product.sale_price && product.sale_price < product.price_idr

  // Build breadcrumb items following website route
  const breadcrumbItems = [
    { label: t.common.products, href: '/products' },
    { label: product.name, href: `/products/${product.slug}` },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-4 lg:px-8">
        {/* Back Button - Mobile only */}
        <div className="mb-4 md:hidden">
          <Link href="/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span>{t.common.back}</span>
          </Link>
        </div>

        {/* Breadcrumb - Desktop only */}
        <div className="mb-6 hidden md:block">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Image Gallery */}
          <div className="w-full">
            <ProductImageGallery 
              images={(() => {
                // Get variant images if available
                const hasVariants = (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0
                const variantImages = hasVariants 
                  ? (product as any).variants
                      .flatMap((v: any) => Array.isArray(v.image_url) ? v.image_url : (v.image_url ? [v.image_url] : []))
                      .filter((url: any) => typeof url === 'string' && url.trim() !== '')
                  : []
                
                // Combine variant images with product images
                const allImages = variantImages.length > 0 
                  ? [...variantImages, ...product.image_urls]
                  : product.image_urls
                
                return allImages
              })()} 
              productName={product.name} 
              voucher={voucher} 
              onVoucherExpire={handleVoucherExpire}
              isOutOfStock={(() => {
                // Check if product has variants
                const hasVariants = (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0
                if (hasVariants) {
                  // If has variants, check if ALL variants are out of stock
                  return (product as any).variants.every((v: any) => v.stock_quantity === 0)
                }
                // Otherwise check product-level stock
                return product.stock_quantity === 0
              })()}
              locale={locale}
            />
          </div>

          {/* Product Details */}
          <div className="space-y-0">

            {/* Gold top accent */}
            <div className="h-px bg-gradient-to-r from-luxury-gold/60 via-luxury-gold/20 to-transparent mb-6" />

            {/* Brand + Title + Rating */}
            <div className="pb-6">
              {(product as any).brand && (
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-luxury-gold">
                  {(product as any).brand}
                </p>
              )}
              <h1 className="mb-4 font-serif text-2xl md:text-4xl font-bold text-luxury-navy leading-tight">
                {product.name}
              </h1>
              {((product as any).rating > 0 || (product as any).products_sold > 0) && (
                <div className="flex items-center gap-3 text-base">
                  {(product as any).rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <svg className="h-5 w-5 text-luxury-gold fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-semibold text-luxury-navy">{((product as any).rating as number).toFixed(1)}</span>
                    </div>
                  )}
                  {(product as any).rating > 0 && (product as any).products_sold > 0 && (
                    <span className="text-luxury-gold/40">·</span>
                  )}
                  {(product as any).products_sold > 0 && (
                    <span className="text-gray-500 text-sm tracking-wide">
                      {(product as any).products_sold >= 1000
                        ? `${Math.floor((product as any).products_sold / 1000)}k+`
                        : `${(product as any).products_sold}`} {productTranslations.sold}
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="ml-1 inline-flex items-center rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white tracking-wide">
                      {productTranslations.flashSale}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Thin divider */}
            <div className="h-px bg-gray-100 mb-6" />

            {/* Price */}
            <div className="pb-6">
              <ProductPriceDisplay
                product={product}
                showRange={true}
                voucher={voucher}
                activeDiscounts={activeDiscounts}
              />
              {voucher && (
                <div className="mt-3 inline-flex items-center gap-2 bg-luxury-gold/8 border border-luxury-gold/30 rounded px-3 py-1.5">
                  <span className="text-xs font-semibold text-luxury-navy tracking-wide uppercase">
                    Diskon {voucher.discount_type === 'percentage'
                      ? `${voucher.discount_value}%`
                      : `Rp${voucher.discount_value.toLocaleString('id-ID')}`}
                  </span>
                </div>
              )}
            </div>

            {/* Thin divider */}
            <div className="h-px bg-gray-100 mb-6" />

            {/* ── Accordion: Description / Fragrance Notes / Shipping ── */}
            <div className="border-t border-gray-200 divide-y divide-gray-200 mb-6">

              {/* Description */}
              {product.description && (
                <div>
                  <button
                    onClick={() => setShowDescription(v => !v)}
                    className="w-full flex items-center gap-4 py-4 text-left"
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      <Info className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-900">Description</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showDescription ? 'rotate-180' : ''}`} />
                  </button>
                  {showDescription && (
                    <div
                      className="pb-5 pl-12 pr-2 text-sm text-gray-600 leading-6 [&_p]:mb-2 [&_p:empty]:hidden [&_p:empty]:m-0 [&_br+br]:hidden"
                      dangerouslySetInnerHTML={{
                        __html: product.description
                          .replace(/<p>(\s|&nbsp;)*<\/p>/gi, '')
                          .replace(/(<br\s*\/?>[\s\n]*){2,}/gi, '<br>')
                      }}
                    />
                  )}
                </div>
              )}

              {/* Fragrance Notes */}
              {((product as any).top_notes || (product as any).middle_notes || (product as any).base_notes) && (
                <div>
                  <button
                    onClick={() => setShowFragranceNotes(v => !v)}
                    className="w-full flex items-center gap-4 py-4 text-left"
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      <Droplets className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-900">Fragrance Notes</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showFragranceNotes ? 'rotate-180' : ''}`} />
                  </button>
                  {showFragranceNotes && (
                    <div className="pb-5 pl-12 pr-2 space-y-2">
                      {(product as any).top_notes && (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-800">{productTranslations.topNotes}:</span>{' '}
                          {(product as any).top_notes}
                        </p>
                      )}
                      {(product as any).middle_notes && (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-800">{productTranslations.middleNotes}:</span>{' '}
                          {(product as any).middle_notes}
                        </p>
                      )}
                      {(product as any).base_notes && (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-800">{productTranslations.baseNotes}:</span>{' '}
                          {(product as any).base_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping */}
              <div>
                <button
                  onClick={() => setShowShipping(v => !v)}
                  className="w-full flex items-center gap-4 py-4 text-left"
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-900">Shipping</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showShipping ? 'rotate-180' : ''}`} />
                </button>
                {showShipping && (
                  <div className="pb-5 pl-12 pr-2">
                    <ProductShippingInfo product={product} />
                  </div>
                )}
              </div>

            </div>

            {/* Specifications */}
            <ExpandableSpecifications product={product} fragranceFamily={fragranceFamily} />

            {/* Action Buttons */}
            <div className="pb-6">
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
                compareAtPrice={(product as any).compare_at_price}
                voucher={voucher}
                activeDiscounts={activeDiscounts}
                productData={{
                  id: product.id,
                  name: product.name,
                  image_urls: (product as any).image_urls || [],
                  price: (product as any).price_usd || 0,
                  price_idr: (product as any).price_idr,
                  stock_quantity: product.stock_quantity || 0,
                  min_purchase_quantity: (product as any).min_purchase_quantity,
                  max_purchase_quantity: (product as any).max_purchase_quantity,
                  variants: (product as any).variants || []
                }}
              />
            </div>

          </div>
        </div>
      </div>

      {popularProducts.length > 0 && (
        <div className="border-t border-gray-200">
          <ProductCarousel
            title={locale === 'id' ? 'Mungkin Kamu Suka' : 'You May Also Like'}
            products={popularProducts}
            backgroundColor="bg-white"
            titleColor="text-luxury-navy"
            variant="bestselling"
            vouchers={relatedVouchers}
            hideSubtitle={true}
            compactTitle={true}
            hideViewAll={true}
            noBorders={true}
          />
        </div>
      )}
    </div>
  )
}
