-- Seed Email Templates
-- Default email templates for notifications

-- Order Confirmation Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'order_confirmation',
  'Order Confirmation',
  'Order Confirmation - {{order_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .order-details { background-color: #fff; padding: 15px; margin: 20px 0; border: 1px solid #ddd; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <h2>Thank you for your order!</h2>
      <p>Hi {{customer_name}},</p>
      <p>We have received your order and are processing it now. You will receive another email when your order ships.</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> {{order_number}}</p>
        <p><strong>Order Date:</strong> {{order_date}}</p>
        <p><strong>Total:</strong> {{currency_symbol}}{{total_amount}}</p>
      </div>
      
      <a href="{{order_url}}" class="button">View Order</a>
      
      <p>If you have any questions, please contact our customer support.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Mykonos. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Thank you for your order!

Hi {{customer_name}},

We have received your order and are processing it now.

Order Number: {{order_number}}
Order Date: {{order_date}}
Total: {{currency_symbol}}{{total_amount}}

View your order: {{order_url}}

If you have any questions, please contact our customer support.',
  '["customer_name", "order_number", "order_date", "total_amount", "currency_symbol", "order_url"]'::JSONB
);

-- Payment Success Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'payment_success',
  'Payment Successful',
  'Payment Confirmed - {{order_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .success { background-color: #d4edda; color: #155724; padding: 15px; margin: 20px 0; border: 1px solid #c3e6cb; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <div class="success">
        <h2>✓ Payment Successful</h2>
      </div>
      <p>Hi {{customer_name}},</p>
      <p>Your payment for order {{order_number}} has been successfully processed.</p>
      <p><strong>Amount Paid:</strong> {{currency_symbol}}{{total_amount}}</p>
      <p>Your order is now being prepared for shipment.</p>
    </div>
  </div>
</body>
</html>',
  'Payment Successful

Hi {{customer_name}},

Your payment for order {{order_number}} has been successfully processed.

Amount Paid: {{currency_symbol}}{{total_amount}}

Your order is now being prepared for shipment.',
  '["customer_name", "order_number", "total_amount", "currency_symbol"]'::JSONB
);

-- Payment Failure Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'payment_failure',
  'Payment Failed',
  'Payment Failed - {{order_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .error { background-color: #f8d7da; color: #721c24; padding: 15px; margin: 20px 0; border: 1px solid #f5c6cb; border-radius: 4px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <div class="error">
        <h2>Payment Failed</h2>
      </div>
      <p>Hi {{customer_name}},</p>
      <p>Unfortunately, we were unable to process your payment for order {{order_number}}.</p>
      <p><strong>Reason:</strong> {{error_message}}</p>
      <p>Please try again or use a different payment method.</p>
      <a href="{{retry_url}}" class="button">Retry Payment</a>
    </div>
  </div>
</body>
</html>',
  'Payment Failed

Hi {{customer_name}},

Unfortunately, we were unable to process your payment for order {{order_number}}.

Reason: {{error_message}}

Please try again or use a different payment method.

Retry payment: {{retry_url}}',
  '["customer_name", "order_number", "error_message", "retry_url"]'::JSONB
);

-- Order Shipped Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'order_shipped',
  'Order Shipped',
  'Your Order Has Shipped - {{order_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .tracking { background-color: #fff; padding: 15px; margin: 20px 0; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <h2>Your order is on its way!</h2>
      <p>Hi {{customer_name}},</p>
      <p>Great news! Your order {{order_number}} has been shipped and is on its way to you.</p>
      
      <div class="tracking">
        <h3>Tracking Information</h3>
        <p><strong>Carrier:</strong> {{carrier_name}}</p>
        <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
        <p><strong>Estimated Delivery:</strong> {{estimated_delivery}}</p>
      </div>
      
      <a href="{{tracking_url}}" class="button">Track Your Order</a>
    </div>
  </div>
</body>
</html>',
  'Your order is on its way!

Hi {{customer_name}},

Your order {{order_number}} has been shipped.

Carrier: {{carrier_name}}
Tracking Number: {{tracking_number}}
Estimated Delivery: {{estimated_delivery}}

Track your order: {{tracking_url}}',
  '["customer_name", "order_number", "carrier_name", "tracking_number", "estimated_delivery", "tracking_url"]'::JSONB
);

-- Order Delivered Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'order_delivered',
  'Order Delivered',
  'Your Order Has Been Delivered - {{order_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .success { background-color: #d4edda; color: #155724; padding: 15px; margin: 20px 0; border: 1px solid #c3e6cb; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <div class="success">
        <h2>✓ Delivered</h2>
      </div>
      <p>Hi {{customer_name}},</p>
      <p>Your order {{order_number}} has been delivered!</p>
      <p>We hope you love your purchase. If you have any questions or concerns, please don''t hesitate to contact us.</p>
      <p>Thank you for shopping with Mykonos!</p>
    </div>
  </div>
</body>
</html>',
  'Your order has been delivered!

Hi {{customer_name}},

Your order {{order_number}} has been delivered!

We hope you love your purchase. If you have any questions or concerns, please contact us.

Thank you for shopping with Mykonos!',
  '["customer_name", "order_number"]'::JSONB
);

-- Email Verification Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'email_verification',
  'Email Verification',
  'Verify Your Email Address',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <h2>Verify Your Email Address</h2>
      <p>Hi {{customer_name}},</p>
      <p>Thank you for creating an account with Mykonos. Please verify your email address by clicking the button below:</p>
      <a href="{{verification_url}}" class="button">Verify Email</a>
      <p>If you did not create this account, please ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  </div>
</body>
</html>',
  'Verify Your Email Address

Hi {{customer_name}},

Thank you for creating an account with Mykonos. Please verify your email address by clicking the link below:

{{verification_url}}

If you did not create this account, please ignore this email.

This link will expire in 24 hours.',
  '["customer_name", "verification_url"]'::JSONB
);

-- Password Reset Template
INSERT INTO email_templates (template_key, template_name, subject, body_html, body_text, variables) VALUES
(
  'password_reset',
  'Password Reset',
  'Reset Your Password',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; margin: 20px 0; }
    .warning { background-color: #fff3cd; color: #856404; padding: 15px; margin: 20px 0; border: 1px solid #ffeaa7; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MYKONOS</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hi {{customer_name}},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="{{reset_url}}" class="button">Reset Password</a>
      <div class="warning">
        <p><strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
      <p>This link will expire in 1 hour.</p>
    </div>
  </div>
</body>
</html>',
  'Reset Your Password

Hi {{customer_name}},

We received a request to reset your password. Click the link below to create a new password:

{{reset_url}}

If you did not request a password reset, please ignore this email.

This link will expire in 1 hour.',
  '["customer_name", "reset_url"]'::JSONB
);
