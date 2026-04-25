import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: { slug: string }
  children: React.ReactNode
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = params
    const supabase = createClient()
    
    console.log('🔍 [METADATA] Generating for slug:', slug)
    
    // Fetch product data
    const { data: product, error } = await supabase
      .from('products')
      .select('name, description, price_idr, price_usd, image_urls')
      .eq('slug', slug)
      .single() as { data: any, error: any }

    if (error || !product) {
      console.error('❌ [METADATA] Product not found:', slug, error)
      return {
        title: 'Product Not Found | Mykonos',
        description: 'The product you are looking for could not be found.',
      }
    }
    
    console.log('✅ [METADATA] Product found:', product.name)

  // Get the first product image and ensure it's an absolute URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mykonos-test.vercel.app'
  let productImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : `${baseUrl}/images/mykonos-logo.png`
  
  // Ensure URL is absolute
  if (productImage && !productImage.startsWith('http')) {
    productImage = `${baseUrl}${productImage}`
  }

  // Format price for description
  const price = product.price_idr 
    ? `Rp ${product.price_idr.toLocaleString('id-ID')}`
    : `$${product.price_usd}`

  const description = product.description 
    ? product.description.substring(0, 160) 
    : `Discover ${product.name} - ${price}. Experience exquisite luxury fragrances and perfumes.`

  const metadata = {
    title: `${product.name} | Mykonos Perfumery`,
    description,
    openGraph: {
      title: product.name,
      description,
      url: `${baseUrl}/products/${slug}`,
      images: [
        {
          url: productImage,
          width: 1200,
          height: 1200,
          alt: product.name,
        },
      ],
      type: 'website' as const,
      siteName: 'Mykonos - Modern & Vibrant Perfumery',
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: product.name,
      description,
      images: [productImage],
    },
  }
  
    console.log('📱 [METADATA] Generated:', {
      title: metadata.title,
      ogImage: productImage,
      ogTitle: metadata.openGraph.title,
    })
    
    return metadata
  } catch (error) {
    console.error('❌ [METADATA] Error generating metadata:', error)
    return {
      title: 'Mykonos - Modern & Vibrant Perfumery',
      description: 'Discover exquisite luxury fragrances and perfumes.',
    }
  }
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>
}
