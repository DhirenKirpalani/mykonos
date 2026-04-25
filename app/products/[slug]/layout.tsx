import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params
  const supabase = createClient()
  
  // Fetch product data
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single() as { data: any }

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  // Get the first product image
  const productImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : '/images/mykonos-logo.png'

  // Format price for description
  const price = product.price_idr 
    ? `Rp ${product.price_idr.toLocaleString('id-ID')}`
    : `$${product.price_usd}`

  const description = product.description 
    ? product.description.substring(0, 160) 
    : `Discover ${product.name} - ${price}. Experience exquisite luxury fragrances and perfumes.`

  return {
    title: `${product.name} | Mykonos Perfumery`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: [
        {
          url: productImage,
          width: 1200,
          height: 1200,
          alt: product.name,
        },
      ],
      type: 'website',
      siteName: 'Mykonos - Modern & Vibrant Perfumery',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [productImage],
    },
  }
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>
}
