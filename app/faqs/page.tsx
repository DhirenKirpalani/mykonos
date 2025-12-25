'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    category: 'Ordering',
    questions: [
      {
        q: 'HOW TO ORDER?',
        a: '1. Browse and Select Products - From the home page, click on a category to browse our fragrances. Click the picture of the fragrance you are interested in for their complete description and detailed pictures.\n\n2. Add to Cart and Review Order - Choose your desired size and quantity, and proceed to click the "Add to cart" button. Click the bag icon on the top right of your screen to review your order before payment. However, for an immediate redirection to payment, click the "Buy it now" button after choosing your desired size and quantity.\n\n3. Sign In - For registered shoppers, kindly fill in your registered details and sign in to your account. For unregistered shoppers, kindly fill your details accordingly or create an account for faster checkouts on your next purchase. Please note that the availability of your desired product is not guaranteed before you checkout.\n\n4. Checkout - Choose your desired payment and shipping method, and review and double check your order before payment. If you are ready to finalize your order, click "Pay now".\n\n5. Confirm Payment - Confirm your payment (if you choose the "Bank Transfer" payment method).\n\n6. Finish Shopping - Once done, you can sit back and wait patiently for your order to arrive. Check your order status on the "Orders" page or your registered email.',
      },
      {
        q: 'HOW TO CHECK MY ORDER STATUS?',
        a: 'You can check your order status on the "Orders" page in your account or through the confirmation email sent to your registered email address.',
      },
      {
        q: 'CAN I EDIT MY ORDER?',
        a: 'Once an order has been placed and payment confirmed, we cannot guarantee changes. Please contact us immediately at +62 857-8021-8514 if you need to modify your order.',
      },
    ],
  },
  {
    category: 'Shipping & Delivery',
    questions: [
      {
        q: 'WHY IS MY DELIVERY STATUS PENDING OR DELAYED?',
        a: 'Delivery delays can occur due to courier services, weather conditions, or high order volumes. We work closely with trusted courier partners, but once your package has been handed over to the courier, Mykonos is not responsible for delays. Please contact us at +62 857-8021-8514 for assistance.',
      },
      {
        q: 'DO YOU SHIP WORLDWIDE?',
        a: 'Yes, we offer international shipping. Domestic orders (Indonesia) take 3-5 working days, while international orders take 5-15 working days depending on the destination and customs processing.',
      },
    ],
  },
  {
    category: 'Returns & Issues',
    questions: [
      {
        q: 'I RECEIVED DAMAGED OR WRONG ITEM.',
        a: 'Upon receiving your order, please inspect the items and record an unboxing video. If you find any defects, damage, or receive the wrong item, contact us right away at +62 857-8021-8514. Please note that an unboxing video is required to claim a return or refund.',
      },
      {
        q: 'I ORDERED THE WRONG ITEM.',
        a: 'We have a 3-day return policy. Contact us at +62 857-8021-8514 to request a return. If accepted, we will send you a return shipping label and instructions. For the quickest exchange, return the item and place a new order for the correct item.',
      },
    ],
  },
  {
    category: 'Store & Products',
    questions: [
      {
        q: 'DO YOU HAVE OFFLINE STORE?',
        a: 'Currently, Mykonos operates exclusively online to provide you with the best prices and widest selection. All orders are processed through our website.',
      },
      {
        q: 'WILL THERE BE RESTOCKS FOR THE SOLD OUT ITEMS?',
        a: 'We regularly restock popular items. Please contact us at +62 857-8021-8514 or follow our social media for restock announcements.',
      },
    ],
  },
]

export default function FAQsPage() {
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-canela text-4xl font-bold lg:text-5xl">
            Find your answers here
          </h1>
          <p className="text-lg text-muted-foreground">
            Common questions about our products and services
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <h2 className="mb-6 font-serif text-2xl font-bold">
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const id = `${categoryIndex}-${faqIndex}`
                  const isOpen = openItems.includes(id)
                  return (
                    <div
                      key={id}
                      className="rounded-lg border border-border/40 bg-white"
                    >
                      <button
                        onClick={() => toggleItem(id)}
                        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-luxury-gray-light"
                      >
                        <span className="font-medium">{faq.q}</span>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-border/40 p-6">
                          <p className="text-muted-foreground">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="mt-12 rounded-lg bg-luxury-navy p-8 text-center text-white">
            <h3 className="mb-4 font-canela text-2xl font-bold">
              Couldn't find your answer?
            </h3>
            <p className="mb-6 text-gray-300">
              We're here to help. If you couldn't find the information you were looking for, please reach out to us directly. Our team is eager to assist you.
            </p>
            <a
              href="https://wa.me/6285780218514"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-luxury-gold px-8 py-3 font-medium text-luxury-navy transition-all hover:bg-luxury-gold-light"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
