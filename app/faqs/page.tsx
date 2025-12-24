'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    category: 'Orders & Shipping',
    questions: [
      {
        q: 'How long does shipping take?',
        a: 'Standard shipping takes 5-7 business days. Express shipping is available for 2-3 day delivery.',
      },
      {
        q: 'Do you offer free shipping?',
        a: 'Yes, we offer free standard shipping on all orders over $100.',
      },
      {
        q: 'Can I track my order?',
        a: 'Absolutely! Once your order ships, you will receive a tracking number via email.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 30 days of delivery for unused products in original packaging.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 5-7 business days after we receive your return.',
      },
      {
        q: 'Can I exchange a product?',
        a: 'Yes, please contact us via WhatsApp at +62 857-8021-8514 to arrange an exchange.',
      },
    ],
  },
  {
    category: 'Products',
    questions: [
      {
        q: 'Are your fragrances authentic?',
        a: 'Yes, all our fragrances are 100% authentic and sourced directly from authorized distributors.',
      },
      {
        q: 'How should I store my perfume?',
        a: 'Store perfumes in a cool, dry place away from direct sunlight to maintain their quality.',
      },
      {
        q: 'Do you offer samples?',
        a: 'Yes, we offer sample sets so you can try our fragrances before committing to a full bottle.',
      },
    ],
  },
  {
    category: 'Account & Payment',
    questions: [
      {
        q: 'Do I need an account to place an order?',
        a: 'No, you can checkout as a guest. However, creating an account allows you to track orders and save preferences.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards, PayPal, and other secure payment methods.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes, we use industry-standard encryption to protect your payment information.',
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
          <h1 className="mb-4 font-serif text-4xl font-bold lg:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about our products and services
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
            <h3 className="mb-4 font-serif text-2xl font-bold">
              Still have questions?
            </h3>
            <p className="mb-6 text-gray-300">
              Our customer service team is here to help
            </p>
            <a
              href="https://wa.me/6285780218514"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-luxury-gold px-8 py-3 font-medium text-luxury-navy transition-all hover:bg-luxury-gold-light"
            >
              Contact Us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
