// 'use client'

// import { useRef } from 'react'
// import { ChevronLeft, ChevronRight } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { ProductCard } from '@/components/product-card'
// import { Database } from '@/lib/supabase/database.types'

// type Product = Database['public']['Tables']['products']['Row']

// interface ProductCarouselProps {
//   title: string
//   products: Product[]
// }

// export function ProductCarousel({ title, products }: ProductCarouselProps) {
//   const scrollRef = useRef<HTMLDivElement>(null)

//   const scroll = (direction: 'left' | 'right') => {
//     if (scrollRef.current) {
//       const scrollAmount = 400
//       const newScrollPosition =
//         scrollRef.current.scrollLeft +
//         (direction === 'left' ? -scrollAmount : scrollAmount)
//       scrollRef.current.scrollTo({
//         left: newScrollPosition,
//         behavior: 'smooth',
//       })
//     }
//   }

//   return (
//     <section className="relative py-16">
//       <div className="container mx-auto px-4 lg:px-8">
//         <div className="mb-12 text-center">
//           <h2 className="font-serif text-3xl font-bold uppercase tracking-[0.3em] text-luxury-navy lg:text-4xl">
//             {title}
//           </h2>
//         </div>
//         <div className="relative">
//           {/* Left Arrow */}
//           <button
//             onClick={() => scroll('left')}
//             className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all hover:bg-luxury-navy hover:text-white active:scale-95 lg:-left-12"
//             aria-label="Previous products"
//           >
//             <ChevronLeft className="h-6 w-6" />
//           </button>
          
//           {/* Right Arrow */}
//           <button
//             onClick={() => scroll('right')}
//             className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all hover:bg-luxury-navy hover:text-white active:scale-95 lg:-right-12"
//             aria-label="Next products"
//           >
//             <ChevronRight className="h-6 w-6" />
//           </button>
//         <div
//           ref={scrollRef}
//           className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
//           style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
//         >
//           {products.map((product) => (
//             <div key={product.id} className="w-[280px] flex-shrink-0">
//               <ProductCard product={product} />
//             </div>
//           ))}
//         </div>
//       </div>
//       </div>
//     </section>
//   )
// }

'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCarouselProps {
  title: string
  products: Product[]
}

export function ProductCarousel({ title, products }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -360 : 360,
      behavior: 'smooth',
    })
  }

  return (
    <section className="relative bg-[#FAF9F7] py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Title */}
        <div className="mb-16 text-center">
          <h2
            className="
              font-canela
              text-3xl
              uppercase
              tracking-[0.4em]
              text-[#C9B27C]
              lg:text-4xl
            "
          >
            {title}
          </h2>
          <div className="mx-auto mt-6 h-px w-16 bg-[#C9B27C]/50" />
        </div>

        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={() => scroll('left')}
            aria-label="Previous"
            className="
              absolute left-0 top-1/2 z-10
              hidden -translate-x-1/2 -translate-y-1/2
              rounded-full
              bg-[#0F1F36]/90
              p-3
              text-[#C9B27C]
              shadow-xl
              backdrop-blur
              transition
              hover:bg-[#162742]
              lg:flex
            "
          >
            <ChevronLeft size={22} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll('right')}
            aria-label="Next"
            className="
              absolute right-0 top-1/2 z-10
              hidden translate-x-1/2 -translate-y-1/2
              rounded-full
              bg-[#0F1F36]/90
              p-3
              text-[#C9B27C]
              shadow-xl
              backdrop-blur
              transition
              hover:bg-[#162742]
              lg:flex
            "
          >
            <ChevronRight size={22} />
          </button>

          {/* Track */}
          <div
            ref={scrollRef}
            className="
              flex gap-10
              overflow-x-auto
              scroll-smooth
              snap-x snap-mandatory
              pb-8
              scrollbar-hide
            "
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="
                  snap-start
                  flex-shrink-0
                  w-[260px]
                  sm:w-[300px]
                  lg:w-[340px]
                "
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


