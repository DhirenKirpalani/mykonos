export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-serif text-4xl font-bold lg:text-5xl">
            Refund Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Your satisfaction is our priority
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Returns and Exchanges</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We have a <strong>3-day return policy</strong>, which means you have 3 days after receiving your item to request a return.
              </p>
              <p>
                To return, contact us at <strong>+62 857-8021-8514</strong>. If your return is accepted, we will send you a return shipping label, as well as instructions on how and where to send your package. Items sent back to us without first requesting a return will not be accepted.
              </p>
              <p>
                For the quickest exchange process, please return the item you have. Once your return is accepted, you can place a new order for the item you want. If you have further questions, kindly message us at <strong>+62 857-8021-8514</strong>.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Damages and Issues</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Upon receiving your order, please inspect the items and <strong>record an unboxing video</strong>. If you find any defects, damage, or receive the wrong item, contact us right away so we can help fix the issue.
              </p>
              <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
                <strong>Important:</strong> An unboxing video is required to claim a return or refund.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Non-Returnable Items</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Some product types are not eligible for return. These include:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Perishable goods (e.g., food, flowers, plants)</li>
                <li>Custom or personalized products</li>
                <li>Personal care items</li>
                <li>Hazardous materials, flammable liquids, or gases</li>
                <li>Sale items and gift cards</li>
              </ul>
              <p>
                If you have questions about a specific item, please contact us.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Refunds</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                After your return arrives and has been inspected, we'll let you know whether your refund is approved.
              </p>
              <p>
                If it is approved, we will process your refund to your original payment method within <strong>10 business days</strong>. Please note that your bank or card provider might need extra time to complete the refund.
              </p>
              <p>
                If you have not received your refund after <strong>15 business days</strong> from approval, please reach out to us at <strong>+62 857-8021-8514</strong>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
