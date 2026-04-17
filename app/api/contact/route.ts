import { NextRequest, NextResponse } from 'next/server'
import { resend, FROM_EMAIL } from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    // Server-side validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters long' },
        { status: 400 }
      )
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (maximum 5000 characters)' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background-color: #f3f4f6;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: white;
              padding: 24px;
              text-align: center;
            }
            .header h1 {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .header p {
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 24px;
            }
            .info-row {
              display: flex;
              padding: 16px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #6b7280;
              font-size: 13px;
              min-width: 80px;
              flex-shrink: 0;
            }
            .info-value {
              color: #1f2937;
              font-size: 14px;
              word-break: break-word;
            }
            .info-value a {
              color: #2563eb;
              text-decoration: none;
            }
            .message-section {
              margin-top: 24px;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
              border-left: 4px solid #c9a961;
            }
            .message-label {
              font-weight: 600;
              color: #6b7280;
              font-size: 13px;
              margin-bottom: 12px;
              display: block;
            }
            .message-text {
              color: #1f2937;
              font-size: 14px;
              line-height: 1.7;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .timestamp {
              text-align: center;
              padding: 16px;
              background: #f9fafb;
              color: #6b7280;
              font-size: 12px;
            }
            @media only screen and (max-width: 600px) {
              body {
                padding: 10px;
              }
              .container {
                border-radius: 8px;
              }
              .header {
                padding: 20px 16px;
              }
              .header h1 {
                font-size: 18px;
              }
              .content {
                padding: 20px 16px;
              }
              .info-row {
                flex-direction: column;
                padding: 12px 0;
              }
              .info-label {
                margin-bottom: 4px;
                min-width: auto;
              }
              .message-section {
                padding: 16px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 New Contact Form Submission</h1>
              <p>Mykonos Website</p>
            </div>
            
            <div class="content">
              <div class="info-row">
                <div class="info-label">From:</div>
                <div class="info-value">${name}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value"><a href="mailto:${email}">${email}</a></div>
              </div>
              
              <div class="message-section">
                <span class="message-label">Message:</span>
                <div class="message-text">${message}</div>
              </div>
            </div>
            
            <div class="timestamp">
              📅 ${timestamp}
            </div>
          </div>
        </body>
      </html>
    `

    await resend.emails.send({
      from: FROM_EMAIL,
      to: 'officialmykonos@outlook.com',
      subject: `New Contact Form Submission from ${name}`,
      html: emailHtml,
      replyTo: email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
