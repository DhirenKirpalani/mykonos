import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components'

interface OrderStatusUpdateEmailProps {
  orderNumber: string
  customerName: string
  orderStatus: string
  paymentStatus: string
  statusMessage: string
  trackingNumber?: string
  carrierName?: string
  estimatedDelivery?: string
  orderDate?: string
}

export function OrderStatusUpdateEmail({
  orderNumber,
  customerName,
  orderStatus,
  paymentStatus,
  statusMessage,
  trackingNumber,
  carrierName,
  estimatedDelivery,
  orderDate
}: OrderStatusUpdateEmailProps) {
  // Status timeline configuration
  const statusSteps = [
    { key: 'pending_payment', label: 'Order Placed', icon: '📦' },
    { key: 'processing', label: 'Payment Confirmed', icon: '✓' },
    { key: 'packed', label: 'Order Packed', icon: '📦' },
    { key: 'shipped', label: 'Shipped', icon: '🚚' },
    { key: 'delivered', label: 'Delivered', icon: '✓' }
  ]

  const statusOrder = ['pending_payment', 'processing', 'packed', 'shipped', 'delivered']
  const currentIndex = statusOrder.indexOf(orderStatus)

  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '40px 30px', textAlign: 'center' }}>
            <Heading style={{ color: '#d4af37', fontSize: '32px', fontWeight: '700', margin: '0 0 10px 0', letterSpacing: '2px', fontFamily: 'Georgia, serif' }}>
              MYKONOS
            </Heading>
            <Text style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, letterSpacing: '1px' }}>
              LUXURY FRAGRANCES
            </Text>
          </div>

          {/* Status Banner */}
          <div style={{ background: 'linear-gradient(90deg, #d4af37 0%, #f4d03f 100%)', padding: '30px', textAlign: 'center' }}>
            <Text style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Order Update
            </Text>
          </div>

          {/* Main Content */}
          <div style={{ padding: '40px 30px' }}>
            <Text style={{ fontSize: '16px', color: '#334155', lineHeight: '1.6', marginBottom: '10px' }}>
              Dear <strong>{customerName}</strong>,
            </Text>
            <Text style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '30px' }}>
              {statusMessage}
            </Text>

            {/* Order Details Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Order Number</td>
                    <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>#{orderNumber}</td>
                  </tr>
                  {orderDate && (
                    <tr>
                      <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Order Date</td>
                      <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '13px', textAlign: 'right' }}>{orderDate}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Order Status</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                        {orderStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  {trackingNumber && (
                    <tr>
                      <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Tracking Number</td>
                      <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>{trackingNumber}</td>
                    </tr>
                  )}
                  {carrierName && (
                    <tr>
                      <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Carrier</td>
                      <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '13px', textAlign: 'right' }}>{carrierName}</td>
                    </tr>
                  )}
                  {estimatedDelivery && (
                    <tr>
                      <td style={{ padding: '8px 0', color: '#64748b', fontSize: '13px' }}>Estimated Delivery</td>
                      <td style={{ padding: '8px 0', color: '#0f172a', fontSize: '13px', textAlign: 'right' }}>{estimatedDelivery}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Order Status Timeline */}
            <div style={{ marginBottom: '30px' }}>
              <Heading style={{ fontSize: '16px', color: '#0f172a', marginBottom: '20px', fontWeight: '600' }}>
                Order Status
              </Heading>
              <div style={{ position: 'relative' }}>
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentIndex
                  const isCurrent = index === currentIndex
                  
                  return (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: index < statusSteps.length - 1 ? '20px' : '0' }}>
                      {/* Icon Circle */}
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: isCompleted ? '#16a34a' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                        border: isCurrent ? '3px solid #d4af37' : 'none'
                      }}>
                        {isCompleted ? '✓' : step.icon}
                      </div>
                      
                      {/* Status Label */}
                      <div style={{ marginLeft: '15px', flex: 1 }}>
                        <Text style={{ 
                          fontSize: '14px', 
                          fontWeight: isCurrent ? '600' : '400',
                          color: isCompleted ? '#0f172a' : '#94a3b8',
                          margin: '0 0 4px 0'
                        }}>
                          {step.label}
                        </Text>
                        {isCurrent && (
                          <Text style={{ fontSize: '12px', color: '#d4af37', margin: 0 }}>
                            Current Status
                          </Text>
                        )}
                      </div>
                      
                      {/* Connecting Line */}
                      {index < statusSteps.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          left: '19px',
                          top: `${(index * 60) + 40}px`,
                          width: '2px',
                          height: '20px',
                          backgroundColor: isCompleted ? '#16a34a' : '#e2e8f0'
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Track Order Button */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <a 
                href={`https://mykonos.com/track-order?order=${orderNumber}`}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#d4af37',
                  color: '#0f172a',
                  padding: '14px 32px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Track Your Order
              </a>
            </div>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#0f172a', padding: '30px', textAlign: 'center' }}>
            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 15px 0', lineHeight: '1.6' }}>
              If you have any questions, please contact us at<br />
              <a href="mailto:support@mykonos.com" style={{ color: '#d4af37', textDecoration: 'none' }}>support@mykonos.com</a>
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              © 2026 Mykonos Luxury Fragrances. All rights reserved.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

