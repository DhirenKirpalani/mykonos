export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-serif text-4xl font-bold lg:text-5xl">
            Shipping Information
          </h1>
          <p className="text-lg text-muted-foreground">
            Fast and secure delivery worldwide
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="prose prose-lg max-w-4xl">
          <h2>Shipping Methods</h2>
          <p>
            We offer multiple shipping options to ensure your luxury fragrances arrive safely and promptly.
          </p>

          <h3>Standard Shipping</h3>
          <ul>
            <li>Delivery time: 5-7 business days</li>
            <li>Cost: Free for orders over $100</li>
            <li>Tracking included</li>
          </ul>

          <h3>Express Shipping</h3>
          <ul>
            <li>Delivery time: 2-3 business days</li>
            <li>Cost: $15</li>
            <li>Priority handling and tracking</li>
          </ul>

          <h3>International Shipping</h3>
          <ul>
            <li>Delivery time: 7-14 business days</li>
            <li>Cost varies by destination</li>
            <li>Customs fees may apply</li>
          </ul>

          <h2>Processing Time</h2>
          <p>
            All orders are processed within 1-2 business days. Orders placed on weekends or holidays will be processed the next business day.
          </p>

          <h2>Order Tracking</h2>
          <p>
            Once your order ships, you will receive a confirmation email with tracking information. You can track your package status at any time.
          </p>

          <h2>Shipping Restrictions</h2>
          <p>
            Please note that we cannot ship to P.O. boxes or military addresses. Some remote areas may have extended delivery times.
          </p>

          <h2>Packaging</h2>
          <p>
            All products are carefully packaged in protective materials to ensure they arrive in perfect condition. Gift wrapping is available upon request.
          </p>

          <h2>Questions?</h2>
          <p>
            For shipping inquiries, please contact us via WhatsApp at +62 857-8021-8514.
          </p>
        </div>
      </div>
    </div>
  )
}
