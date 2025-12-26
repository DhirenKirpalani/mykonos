import Link from 'next/link'
import Image from 'next/image'
import { Flower2, Apple, Cake, Sparkles, Waves, Star } from 'lucide-react'

const categories = [
  {
    name: 'Floral',
    icon: Flower2,
    href: '/products?category=Floral',
    description: 'Elegant and romantic',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&q=80',
  },
  {
    name: 'Fruity',
    icon: Apple,
    href: '/products?category=Fruity',
    description: 'Fresh and vibrant',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80',
  },
  {
    name: 'Gourmand',
    icon: Cake,
    href: '/products?category=Gourmand',
    description: 'Sweet and indulgent',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
  },
  {
    name: 'Powdery',
    icon: Sparkles,
    href: '/products?category=Powdery',
    description: 'Soft and sophisticated',
    image: 'https://images.unsplash.com/photo-1583241800698-e8f1c92a2c8e?w=400&q=80',
  },
  {
    name: 'Aquatic Aromatic',
    icon: Waves,
    href: '/products?category=Aquatic',
    description: 'Fresh and invigorating',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80',
  },
  {
    name: 'Oriental',
    icon: Star,
    href: '/products?category=Oriental',
    description: 'Warm and exotic',
    image: 'https://images.unsplash.com/photo-1602874801006-c2b5e8f3e06f?w=400&q=80',
  },
]

export function CategorySection() {
  return (
    <section className="relative bg-white py-20 lg:py-32">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.02)_1px,_transparent_0)] bg-[length:40px_40px]" />
      
      <div className="container relative mx-auto px-4 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold">
            Discover Your Signature
          </p>
          <h2 className="mb-6 font-serif text-4xl font-bold text-luxury-navy lg:text-5xl">
            Fragrance Families
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-600 lg:text-lg">
            Each scent tells a story. Find yours among our carefully curated collections
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Link
                key={category.name}
                href={category.href}
                className="group relative overflow-hidden rounded-2xl shadow-lg transition-transform duration-500 hover:scale-105 hover:shadow-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Cinematic Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-80 rounded-2xl" />
                  <div className="absolute inset-0 bg-luxury-gold/0 transition-all duration-500 group-hover:bg-luxury-gold/10 rounded-2xl" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-end p-4 pb-6 lg:p-6 lg:pb-8">
                  {/* Icon with glow on hover */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-luxury-gold/30 bg-black/20 backdrop-blur-md transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/20 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                    <Icon className="h-6 w-6 text-luxury-gold transition-transform duration-500 group-hover:scale-125" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="mb-2 text-center font-serif text-base font-bold tracking-wide text-white transition-colors duration-500 group-hover:text-luxury-gold lg:text-lg">
                    {category.name}
                  </h3>
                  <p className="text-center text-[10px] uppercase tracking-wider text-gray-300 opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:text-xs">
                    {category.description}
                  </p>

                  {/* Hover underline */}
                  <div className="mt-3 h-0.5 w-0 bg-luxury-gold transition-all duration-500 group-hover:w-14 rounded-full" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

