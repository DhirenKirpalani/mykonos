import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'Product Image'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .single() as { data: any }

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: '#0A1E3D',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
          }}
        >
          MYKONOS
        </div>
      ),
      {
        ...size,
      }
    )
  }

  const productImage = product.image_urls?.[0]

  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {productImage && (
          <img
            src={productImage}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 10 }}>
            {product.name}
          </div>
          <div style={{ fontSize: 32, color: '#D4AF37' }}>
            {product.price_idr 
              ? `Rp ${product.price_idr.toLocaleString('id-ID')}`
              : `$${product.price_usd}`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
