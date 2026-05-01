import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components'
import { translations } from '@/lib/translations'
import { getCountryName } from '@/lib/utils/country'

interface OrderItem {
  product_name: string
  variant_name?: string
  quantity: number
  price: number
  total: number
}

interface OrderEmailProps {
  orderNumber: string
  customerName: string
  customerEmail?: string
  orderDate?: string
  items?: OrderItem[]
  subtotal?: number
  shipping?: number
  discount?: number
  total?: number
  shippingAddress?: {
    name: string
    phone: string
    address: string
    city: string
    province: string
    postal_code: string
    country?: string
  }
  paymentStatus: string
  orderStatus: string
  statusMessage?: string
  trackingNumber?: string
  carrierName?: string
  estimatedDelivery?: string
  locale?: 'en' | 'id'
  orderId?: string
  currencyCode?: string
  expiryTime?: string
}

export function OrderConfirmationEmail({
  orderNumber,
  customerName,
  customerEmail,
  orderDate,
  items,
  subtotal,
  shipping,
  discount,
  total,
  shippingAddress,
  paymentStatus,
  orderStatus,
  orderId,
  currencyCode = 'IDR',
  expiryTime,
  locale = 'en'
}: OrderEmailProps) {
  // Base URL for links (production-safe)
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mykonos-test.vercel.app'
  
  // Get translations for current locale
  const text = translations[locale].email
  
  // Determine currency symbol and contact number based on currency code
  const isIDR = currencyCode === 'IDR'
  const currencySymbol = isIDR ? 'Rp' : '$'
  const contactNumber = isIDR ? '+62 857-8021-8514' : '+62 816-261-783'
  
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <style>{`
          /* Mobile Responsive Styles */
          @media only screen and (max-width: 600px) {
            .container { 
              width: 100% !important; 
              max-width: 100% !important;
            }
            .content { 
              padding: 20px 16px !important; 
            }
            .header { 
              padding: 30px 20px !important; 
            }
            .banner { 
              padding: 30px 20px !important; 
            }
            .heading-large { 
              font-size: 24px !important; 
              line-height: 1.3 !important;
            }
            .heading-medium { 
              font-size: 18px !important; 
              line-height: 1.4 !important;
            }
            .text-large { 
              font-size: 14px !important; 
            }
            .button { 
              padding: 14px 32px !important; 
              font-size: 15px !important; 
              width: auto !important;
              display: inline-block !important;
            }
            /* Mobile table fixes */
            table { 
              width: 100% !important; 
            }
            td { 
              display: block !important; 
              width: 100% !important; 
              box-sizing: border-box !important;
            }
            /* Keep order details table inline */
            .order-details-table td {
              display: table-cell !important;
              width: auto !important;
            }
            /* Product item mobile layout */
            .product-item td {
              display: table-cell !important;
              width: auto !important;
            }
            /* Mobile spacing */
            .mobile-spacing {
              padding: 12px 0 !important;
            }
          }
          
          /* Prevent text from being too small on mobile */
          @media only screen and (max-width: 480px) {
            body {
              font-size: 14px !important;
            }
            .heading-large {
              font-size: 22px !important;
            }
            .heading-medium {
              font-size: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
        <Container className="container" style={{ maxWidth: '600px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff' }}>
          {/* Header with Mykonos Branding */}
          <div className="header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '40px 30px', textAlign: 'center' }}>
            <Heading style={{ color: '#d4af37', fontSize: '32px', fontWeight: '700', margin: '0 0 10px 0', letterSpacing: '2px', fontFamily: 'Georgia, serif' }}>
              MYKONOS
            </Heading>
            <Text style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, letterSpacing: '1px' }}>
              Modern & Vibrant Perfumery
            </Text>
          </div>

          {/* Order Banner */}
          <div className="banner" style={{ background: paymentStatus === 'pending' ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)' : 'linear-gradient(90deg, #d4af37 0%, #f4d03f 100%)', padding: '40px 30px', textAlign: 'center' }}>
            <Text className="heading-large" style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '1px' }}>
              {paymentStatus === 'pending' ? '⏳ Order Received - Payment Pending' : `✨ ${text.orderConfirmed}`}
            </Text>
            <Text style={{ fontSize: '15px', color: '#1e293b', margin: '12px 0 0 0', lineHeight: '1.5' }}>
              {paymentStatus === 'pending' ? 'Your order has been created. Please complete payment to confirm your order.' : `${text.thankYou}`}<br />
              {paymentStatus === 'pending' ? '' : text.journeyBegins}
            </Text>
          </div>

          {/* Main Content */}
          <div className="content" style={{ padding: '40px 30px' }}>
            <Text style={{ fontSize: '16px', color: '#334155', lineHeight: '1.6', marginBottom: '20px' }}>
              {text.dear} <strong>{customerName}</strong>,
            </Text>
            <Text style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '30px' }}>
              {text.orderReceived}
            </Text>

            {/* Order Details Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '30px' }}>
              <table className="order-details-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {/* Order Info Group */}
                  <tr>
                    <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>{text.orderNumber}</td>
                    <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>#{orderNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0 16px 0', color: '#64748b', fontSize: '13px' }}>{text.orderDate}</td>
                    <td style={{ padding: '8px 0 16px 0', color: '#0f172a', fontSize: '13px', textAlign: 'right' }}>{orderDate}</td>
                  </tr>
                  
                  {/* Total Payment Group */}
                  {total && (
                    <tr>
                      <td style={{ padding: '16px 0', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>{text.totalPayment}</td>
                      <td style={{ padding: '16px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>{currencySymbol}{total.toLocaleString()}</td>
                    </tr>
                  )}
                  
                  {/* Order Status */}
                  <tr>
                    <td style={{ padding: '16px 0 8px 0', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>{text.orderStatus}</td>
                    <td style={{ padding: '16px 0 8px 0', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ backgroundColor: paymentStatus === 'pending' ? '#fef3c7' : '#dcfce7', color: paymentStatus === 'pending' ? '#92400e' : '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                        {paymentStatus === 'pending' ? 'Awaiting Payment' : (orderStatus === 'pending_payment' ? 'Order Placed' : orderStatus)}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Pay Before */}
                  {expiryTime && paymentStatus === 'pending' && (
                    <tr>
                      <td style={{ padding: '16px 0 0 0', color: '#dc2626', fontSize: '14px', fontWeight: '700', borderTop: '1px solid #e2e8f0' }}>{text.payBefore}</td>
                      <td style={{ padding: '16px 0 0 0', color: '#dc2626', fontSize: '14px', fontWeight: '700', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>{expiryTime}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment CTA - Immediately visible */}
            {paymentStatus === 'pending' && (
              <div style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', padding: '32px 24px', marginBottom: '30px', textAlign: 'center' }}>
                <Text style={{ fontSize: '18px', color: '#92400e', fontWeight: '700', margin: '0 0 12px 0' }}>
                  ⏳ {text.paymentPending}
                </Text>
                <Text style={{ fontSize: '14px', color: '#78350f', margin: '0 0 8px 0', lineHeight: '1.6' }}>
                  {text.secureOrder}<br />
                  {text.fragrancePrepared}
                </Text>
                {expiryTime && (
                  <Text style={{ fontSize: '13px', color: '#92400e', margin: '0 0 24px 0', fontStyle: 'italic' }}>
                    {text.orderExpire}
                  </Text>
                )}
                <a 
                  className="button"
                  href={orderId ? `${BASE_URL}/account/orders/${orderId}` : `${BASE_URL}/track-order?order=${orderNumber}`}
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                    color: '#0f172a',
                    padding: '16px 48px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '700',
                    fontSize: '16px',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {text.secureYourOrder}
                </a>
              </div>
            )}

            {/* Order Items */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '30px', marginTop: '30px' }}>
              <Heading className="heading-medium" style={{ fontSize: '20px', color: '#0f172a', marginBottom: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>
                {text.orderItems}
              </Heading>
            </div>
            
            {items?.map((item, index) => (
              <div key={index} style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 0' }}>
                <table className="product-item" style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '60%' }}>
                        <Text style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>
                          {item.product_name}
                        </Text>
                        {item.variant_name && (
                          <Text style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                            {item.variant_name}
                          </Text>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        {text.qty}: {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Text style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                          {currencySymbol}{item.total.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                          @{currencySymbol}{item.price.toLocaleString()}
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Order Summary */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px', marginTop: '30px' }}>
              <table className="order-details-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>{text.subtotal}</td>
                    <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '14px', textAlign: 'right' }}>{currencySymbol}{(subtotal || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>{text.shipping}</td>
                    <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '14px', textAlign: 'right' }}>{currencySymbol}{(shipping || 0).toLocaleString()}</td>
                  </tr>
                  {(discount || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '8px 0', color: '#16a34a', fontSize: '13px' }}>{text.discount}</td>
                      <td style={{ padding: '8px 0', color: '#16a34a', fontSize: '14px', textAlign: 'right' }}>-{currencySymbol}{(discount || 0).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '2px solid #d4af37' }}>
                    <td style={{ padding: '16px 0 0 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>{text.total}</td>
                    <td style={{ padding: '16px 0 0 0', color: '#d4af37', fontSize: '20px', fontWeight: '700', textAlign: 'right' }}>{currencySymbol}{(total || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Shipping Address */}
            {shippingAddress && (
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '30px', marginTop: '30px' }}>
                <Heading className="heading-medium" style={{ fontSize: '20px', color: '#0f172a', marginBottom: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>
                  {text.shippingAddress}
                </Heading>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
                  {shippingAddress.address && (
                    <Text style={{ fontSize: '14px', color: '#64748b', margin: '0 0 6px 0', lineHeight: '1.6' }}>
                      {shippingAddress.address}
                    </Text>
                  )}
                  {shippingAddress.city && (
                    <Text style={{ fontSize: '14px', color: '#64748b', margin: '0 0 6px 0' }}>
                      {shippingAddress.city}{shippingAddress.province ? `, ${shippingAddress.province}` : ''} {shippingAddress.postal_code}
                    </Text>
                  )}
                  {shippingAddress.country && (
                    <Text style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>
                      {getCountryName(shippingAddress.country)}
                    </Text>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#0f172a', padding: '30px', textAlign: 'center' }}>
            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 15px 0', lineHeight: '1.6' }}>
              {text.contactUs}<br />
              <a href={isIDR ? "https://wa.me/6285780218514?text=Hello!%20I%20would%20like%20to%20inquire%20about%20your%20products." : "https://wa.me/62816261783?text=Hello!%20I%20would%20like%20to%20inquire%20about%20your%20products."} style={{ color: '#d4af37', textDecoration: 'none', fontWeight: '600' }}>{contactNumber}</a>
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              {text.copyright}
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export type OrderConfirmationEmailProps = OrderEmailProps

// Order Status Update Email
export function OrderStatusUpdateEmail(props: OrderEmailProps) {
  return <OrderConfirmationEmail {...props} />
}

export type OrderStatusUpdateEmailProps = OrderEmailProps
