export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-serif text-4xl font-bold lg:text-5xl">
            Shipping Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Fast and secure delivery worldwide
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Shipping Method</h2>
            <div className="space-y-4 text-gray-700">
              <p className="rounded-lg bg-blue-50 p-4 text-blue-900">
                <strong>Pre-Order System (3–14 working days)</strong>
              </p>
              <p>
                At Mykonos, every order is prepared with precision and care to ensure that your fragrance arrives in perfect condition, elegantly packaged and delicately presented.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Order Processing Notes</h2>
            <div className="space-y-4 text-gray-700">
              <ol className="ml-6 list-decimal space-y-4">
                <li>
                  Orders are processed from <strong>Monday to Saturday</strong>. Payment confirmations made on weekends or public holidays will be verified on the next business day. We do not ship on Sundays or public holidays.
                </li>
                <li>
                  Orders will only be dispatched once full payment has been received and confirmed. We work closely with trusted courier partners to ensure your order arrives safely. However, Mykonos is not responsible for any delays caused by courier services. Once your package has been handed over to the couriers, the risk of loss or damage becomes the responsibility of the courier and the recipient's address provided.
                </li>
                <li>
                  You will receive an <strong>email confirmation and tracking number</strong> once your order has been shipped.
                </li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">Shipping Schedule</h2>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-luxury-navy">Domestic Orders (Indonesia)</h3>
                <div className="space-y-3 text-gray-700">
                  <p>
                    Please allow <strong>3 – 5 working days</strong> for delivery after dispatch, depending on the destination. More distant cities or remote regions might require longer shipping time.
                  </p>
                  <p>
                    For domestic deliveries, we partner with <strong>J&T dan JNE</strong>, a trusted courier service covering destinations across Indonesia.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-luxury-navy">International Orders</h3>
                <div className="space-y-3 text-gray-700">
                  <p>
                    Please allow <strong>5 – 15 working days</strong> for International shipping outside Indonesia. Delivery times may vary depending on the destination and customs processing.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
