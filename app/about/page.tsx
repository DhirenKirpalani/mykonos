import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-[500px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200"
          alt="About Mykonos"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-16 lg:px-8">
            <h1 className="mb-4 font-serif text-5xl font-bold text-white lg:text-7xl">
              Our Story
            </h1>
            <p className="max-w-2xl text-xl text-white/90">
              A journey through the art of fine perfumery
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-12">
          <section>
            <h2 className="mb-6 font-serif text-3xl font-bold">
              The Art of Perfumery
            </h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                Founded with a passion for creating exceptional fragrances, Mykonos
                represents the pinnacle of luxury perfumery. Each scent is a
                masterpiece, carefully crafted to evoke emotions and create lasting
                memories.
              </p>
              <p>
                Our journey began with a simple vision: to create fragrances that
                transcend time and trends. Drawing inspiration from the rich heritage
                of perfumery and the natural beauty of the Mediterranean, we craft
                each scent with meticulous attention to detail.
              </p>
            </div>
          </section>

          <section id="craftsmanship" className="border-t border-border/40 pt-12">
            <h2 className="mb-6 font-serif text-3xl font-bold">Craftsmanship</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                Every Mykonos fragrance is the result of countless hours of
                refinement. Our master perfumers work with the finest ingredients
                sourced from around the world, from rare oud wood to precious rose
                absolutes.
              </p>
              <p>
                We believe in the power of quality over quantity. Each bottle
                represents not just a fragrance, but a piece of art that tells a
                story.
              </p>
            </div>
          </section>

          <section id="sustainability" className="border-t border-border/40 pt-12">
            <h2 className="mb-6 font-serif text-3xl font-bold">Sustainability</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                We are committed to sustainable practices throughout our production
                process. From ethically sourced ingredients to eco-friendly
                packaging, we strive to minimize our environmental impact while
                maintaining the highest standards of quality.
              </p>
              <p>
                Our partnerships with local communities ensure fair trade practices
                and support for traditional harvesting methods that have been passed
                down through generations.
              </p>
            </div>
          </section>

          <section className="border-t border-border/40 pt-12">
            <div className="rounded-lg bg-luxury-gray-light p-8 text-center">
              <h2 className="mb-4 font-serif text-3xl font-bold">
                Experience the Difference
              </h2>
              <p className="mb-6 text-lg text-muted-foreground">
                Discover our collection of exceptional fragrances
              </p>
              <Link href="/products">
                <Button variant="luxury" size="lg">
                  Shop Now
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
