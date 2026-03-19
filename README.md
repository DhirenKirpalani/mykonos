# Mykonos - Luxury E-Commerce Platform

A high-end luxury e-commerce website featuring Mediterranean-inspired design, refined animations, and premium user experience for a luxury fragrance brand. Built with quiet luxury aesthetics, editorial restraint, and boutique refinement.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom luxury theme
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: TanStack React Query
- **Form Validation**: Zod

## Features

### Implemented Pages

#### Customer-Facing Pages
- ✅ Homepage with hero section and featured collections
- ✅ Product listing with filtering and sorting
- ✅ Product detail pages with image galleries and reviews
- ✅ Collections pages
- ✅ Shopping cart with persistent state
- ✅ **Checkout flow** (6-step process with session management)
- ✅ About page
- ✅ Contact page
- ✅ Account page with order history and saved addresses
- ✅ Login & Registration pages
- ✅ FAQs page
- ✅ Privacy Policy page
- ✅ Terms & Conditions page
- ✅ Shipping Information page
- ✅ Returns & Exchanges page

#### Admin CMS Dashboard
- ✅ Dashboard overview with analytics and sales metrics
- ✅ Product management (create, edit, list, inventory tracking)
- ✅ Order management with fulfillment workflow
- ✅ **Shipping jobs monitoring** (async job queue dashboard)
- ✅ Customer management with purchase history
- ✅ Collections management
- ✅ Banner management
- ✅ Promo codes management with usage tracking
- ✅ User management with role assignment
- ✅ **Live chat support** interface
- ✅ Analytics & reporting with revenue tracking
- ✅ Settings and configuration management

### Key Features

#### Design & UX
- **Responsive Design**: Mobile-first approach with optimized layouts for all devices
- **Refined Color Palette**: Mediterranean luxury colors
  - Primary Navy: `#1C2E4A`
  - Luxury Gold: `#C2A36B`, `#B8985F`
  - Muted Gold: `#8A6A3F`
  - Warm Off-White: `#FBF9F5`
  - Cool Neutral: `#F1F4F8`
- **Editorial Animations**: Calm, intentional motion with scroll-reveal effects
- **Quiet Luxury Aesthetic**: No pure black, no saturation increases, refined shadows

#### Product Features
- **Product Carousels**: New Arrivals and Trending Now sections with working navigation
- **Smart Arrow Navigation**: Conditionally displayed based on scroll position
- **Product Cards**: Refined with breathing effects, hover animations, and NEW badges
- **Fragrance Families**: Category browsing with photographic overlays
- **Collections Gallery**: Curated collections with elegant presentation
- **Product Filtering**: Advanced filtering and sorting capabilities
- **Image Galleries**: High-quality product photography with zoom
- **Product Reviews & Ratings**: Customer reviews with star ratings and helpful votes
- **Wishlist**: Save favorite products for later purchase
- **Inventory Management**: Real-time stock tracking and low stock alerts

#### User Experience
- **Authentication System**: Complete sign-up, sign-in, and sign-out flows with Supabase Auth
- **Role-Based Access Control**: Customer, admin, super admin, and inventory manager roles
- **Notification System**: Real-time notifications with badge counter and dialog
- **Shopping Cart**: Full cart management with persistent state and promo code support
- **Checkout Flow**: 6-step linear checkout process:
  - Customer information
  - Shipping address (saved addresses support)
  - Shipping method selection
  - Payment method selection
  - Order review
  - Confirmation with order tracking
- **Payment Integration**: Multi-payment gateway support (Midtrans, Stripe-ready)
- **Account Management**: User profile, order history, saved addresses, and settings
- **Order Tracking**: Real-time shipment tracking with status updates
- **Newsletter Signup**: Email subscription with preference management
- **Live Chat Support**: Real-time customer support chat system
- **Accessibility Mode**: Comprehensive accessibility settings including:
  - Reduced motion support
  - High contrast mode
  - Enhanced focus indicators
  - Readable typography
  - Pause animations option
  - ARIA labels and keyboard navigation
- **Multi-language Support**: Language switcher with next-intl internationalization
- **Region Detection**: Automatic region/country detection with manual override
- **Currency & Pricing**: Multi-currency support with region-based pricing

#### Technical Features
- **SEO Optimized**: Meta tags, structured data, semantic HTML
- **Performance**: Optimized images, lazy loading, code splitting
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions
- **Brand Spinner**: Custom loading states throughout the app
- **Context Providers**: Centralized state management with React Context
  - AuthContext for authentication state
  - AccessibilityContext for accessibility settings
  - RegionContext for location-based features
  - LanguageContext for internationalization
- **Custom Hooks**: Reusable hooks for common functionality
  - `useAuth` for authentication operations
  - `useUserRole` for role-based permissions
- **API Routes**: RESTful API endpoints for region detection and data management
- **Form Validation**: Zod schemas for type-safe form validation
- **Toast Notifications**: Sonner for elegant toast notifications
- **Async Job Queue**: Enterprise-grade shipping job processing system
- **Worker Service**: Standalone Node.js worker for courier API integration

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase account

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `supabase/schema.sql`
   - Get your project URL and anon key from Settings > API

3. **Configure environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run the development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Project Structure

```
mykonos/
├── app/                    # Next.js app directory
│   ├── about/             # About page
│   ├── account/           # User account with orders, addresses, settings
│   ├── api/               # API routes for backend functionality
│   │   └── admin/         # Admin-only API endpoints
│   │       └── shipping/  # Shipping job management APIs
│   ├── auth/              # Authentication callback handlers
│   ├── checkout/          # 6-step checkout flow
│   ├── cms/               # Admin CMS dashboard
│   │   ├── analytics/     # Analytics & reporting
│   │   ├── banners/       # Banner management
│   │   ├── chat/          # Live chat support interface
│   │   ├── collections/   # Collections management
│   │   ├── customers/     # Customer management
│   │   ├── orders/        # Order management & fulfillment
│   │   ├── products/      # Product management
│   │   ├── promo-codes/   # Promo code management
│   │   ├── settings/      # System settings
│   │   ├── shipping-jobs/ # Async shipping job dashboard
│   │   └── users/         # User & role management
│   ├── collections/       # Collections pages
│   ├── contact/           # Contact page
│   ├── faqs/              # FAQs page
│   ├── login/             # Login page
│   ├── privacy/           # Privacy policy page
│   ├── products/          # Product listing and detail pages
│   ├── register/          # Registration page
│   ├── returns/           # Returns & exchanges page
│   ├── shipping/          # Shipping information page
│   ├── terms/             # Terms & conditions page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── layout/           # Header (Desktop/Mobile), Footer
│   ├── ui/               # Reusable UI components (Radix)
│   ├── common/           # LoadingSpinner, etc.
│   ├── forms/            # Form components
│   └── [various components]
├── contexts/              # React Context providers
│   ├── AccessibilityContext.tsx  # Accessibility settings
│   ├── AuthContext.tsx           # Authentication state
│   ├── LanguageContext.tsx       # Internationalization
│   └── RegionContext.tsx         # Region/location detection
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication operations
│   └── useUserRole.ts    # Role-based permissions
├── lib/                   # Utility functions and types
│   ├── constants/        # Application constants
│   ├── middleware/       # Middleware functions
│   ├── supabase/         # Supabase client and types
│   ├── types/            # TypeScript type definitions
│   │   ├── cart.ts
│   │   ├── chat.ts
│   │   ├── checkout.ts
│   │   ├── product.ts
│   │   ├── promo.ts
│   │   ├── region.ts
│   │   ├── roles.ts
│   │   └── shipping.ts   # Shipping job types
│   ├── utils/            # Utility functions
│   │   ├── cart.ts
│   │   ├── permissions.ts
│   │   ├── pricing.ts
│   │   ├── region.ts
│   │   └── tracking.ts
│   ├── translations.ts   # Translation strings
│   ├── utils.ts          # General utilities
│   └── validation.ts     # Zod validation schemas
├── messages/             # Internationalization messages
├── supabase/             # Database schema and migrations
│   └── migrations/       # SQL migrations (60+ files)
├── worker/               # Standalone shipping worker service
│   ├── shipping-worker.ts # Worker implementation
│   ├── package.json      # Worker dependencies
│   ├── Dockerfile        # Docker configuration
│   ├── docker-compose.yml # Docker Compose setup
│   └── README.md         # Worker documentation
├── docs/                 # Comprehensive documentation
│   ├── ASYNC_SHIPPING_SYSTEM.md
│   ├── CHECKOUT_PAYMENT_IMPLEMENTATION.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── [14 more implementation guides]
└── public/               # Static assets
```

## Database Schema

The Supabase schema includes:
- **products**: Product catalog with images, pricing, categories, and inventory
- **collections**: Product collections
- **users**: User profiles with role-based access control
- **cart_items**: User shopping carts with promo code support
- **orders**: Order history with payment and shipping tracking
- **order_items**: Order line items
- **order_status_history**: Order status change tracking
- **promo_codes**: Promotional discount codes with usage limits
- **regions**: Geographic regions for localization
- **shipping_addresses**: User saved shipping addresses
- **shipping_methods**: Available shipping options by region
- **payment_methods**: Supported payment gateways by region
- **checkout_sessions**: Checkout progress persistence (24-hour expiration)
- **shipping_jobs**: Async job queue for courier API integration
- **shipment_tracking_events**: Real-time shipment tracking
- **product_reviews**: Customer product reviews and ratings
- **wishlist_items**: User saved products
- **newsletter_subscriptions**: Email subscription management
- **chat_messages**: Live chat support system
- **notifications**: User notification system
- **courier_api_providers**: Courier service configurations

Sample data is included in the schema for testing.

### User Roles
- **customer**: Standard user with shopping capabilities
- **admin**: Store administrator with CMS access
- **super_admin**: Full system access with all permissions
- **inventory_manager**: Warehouse staff with fulfillment access

## Customization

### Colors
The refined Mediterranean luxury palette is defined in `tailwind.config.ts`:

```typescript
colors: {
  luxury: {
    navy: '#0A1E3D',
    'navy-light': '#1a3a5c',
    'navy-dark': '#051426',
    gold: '#B8985F',
    'gold-light': '#C9A96E',
    'gold-dark': '#A67C52',
  },
}
```

**Hard Rules**:
- ❌ No pure black (#000000)
- ❌ No pure white (#FFFFFF) except badges/icons
- ❌ No saturation increases on hover
- ❌ No additional accent colors outside the palette

### Typography
The site uses:
- **Serif**: Playfair Display (headings)
- **Sans-serif**: Inter (body text)

Change fonts in `app/layout.tsx`.

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Other Platforms
Build the production version:
```bash
npm run build
npm start
```

## Design Philosophy

### Quiet Mediterranean Luxury
- **Editorial Restraint**: Nothing loud, nothing trendy, everything intentional
- **Boutique Refinement**: Curated over volume, quality over quantity
- **Calm Motion**: Smooth easing, short distances, no bounce or elastic effects
- **Photographic Excellence**: High-quality imagery with refined overlays
- **Typographic Hierarchy**: Serif headings, clean body text, intentional spacing

### Animation Principles
- **Scroll Reveal**: Staggered entry (title → divider → cards)
- **Hover Effects**: Subtle lifts (-4px), breathing images (1.04 scale)
- **Transitions**: 300-500ms duration with calm easing curves
- **Badge Animations**: Fade-in with scale, pulse for notifications
- **Carousel Motion**: Mechanical, intentional page-turning feel

## Recent Updates

### E-Commerce Core Features
- ✅ **Complete Checkout Flow**: 6-step linear checkout with session persistence
- ✅ **Payment Integration**: Midtrans payment gateway with multi-method support
- ✅ **Order Management**: Full order lifecycle from cart to delivery
- ✅ **Shipping Selection**: Region-based shipping methods with cost calculation
- ✅ **Promo Codes**: Discount codes with validation and usage tracking

### Async Shipping System (Enterprise-Grade)
- ✅ **Shipping Job Queue**: PostgreSQL-based async job processing
- ✅ **Worker Service**: Standalone Node.js worker for courier API calls
- ✅ **Idempotency Protection**: Prevents duplicate shipment creation
- ✅ **Retry Logic**: Exponential backoff for failed jobs (up to 5 retries)
- ✅ **Concurrent Processing**: Safe multi-worker support with row-level locking
- ✅ **Admin Dashboard**: Real-time job monitoring and manual retry capability
- ✅ **Static IP Support**: Designed for courier API IP whitelisting requirements

### Customer Engagement
- ✅ **Product Reviews & Ratings**: Customer feedback with star ratings
- ✅ **Wishlist**: Save products for later purchase
- ✅ **Newsletter**: Email subscription management
- ✅ **Live Chat**: Real-time customer support system
- ✅ **Notifications**: In-app notification system with badge counter
- ✅ **Order Tracking**: Real-time shipment tracking with status updates

### Admin CMS Enhancements
- ✅ **Shipping Jobs Dashboard**: Monitor async shipping job queue
- ✅ **Order Fulfillment**: One-click order fulfillment workflow
- ✅ **User Management**: Role assignment and permission control
- ✅ **Inventory Tracking**: Stock management with low stock alerts
- ✅ **Sales Analytics**: Revenue tracking and reporting
- ✅ **Live Chat Interface**: Admin chat support dashboard

### Technical Infrastructure
- ✅ **Worker Service**: Standalone shipping worker with Docker support
- ✅ **Session Management**: Checkout session persistence
- ✅ **Email Templates**: Transactional email system
- ✅ **Courier Integration**: Multi-courier API configuration
- ✅ **Tax Configuration**: Region-based tax display settings

## API Documentation

### Complete API Reference
See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for comprehensive API documentation including:
- All API endpoints with request/response formats
- Authentication requirements
- End-to-end checkout flow diagrams
- Database functions
- Error handling
- Testing guidelines

### Quick API Overview

#### Cart Management
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart/[id]` - Remove item from cart
- `POST /api/cart/merge` - Merge guest cart with user cart
- `POST /api/cart/validate` - Validate cart before checkout

#### Checkout Flow (Order-First Architecture)
1. `POST /api/checkout/session` - Create checkout session
2. `PATCH /api/checkout/session` - Update shipping/payment details
3. `POST /api/midtrans/create-token` - Generate payment token
4. `POST /api/orders/create-before-payment` - Create order (reserves inventory)
5. `POST /api/midtrans/webhook` - Process payment webhook
6. `GET /api/midtrans/callback` - Handle payment redirect

#### Order Management
- `GET /api/orders` - Get user orders
- `GET /api/orders/[id]` - Get order details
- `POST /api/orders/create-before-payment` - Create order before payment
- `GET /api/orders/verify-payment/[id]` - Manually verify payment
- `PATCH /api/orders/[id]/status` - Update order status (admin)
- `POST /api/orders/[id]/shipping` - Create shipment (admin)

#### Payment Processing
- `POST /api/midtrans/create-token` - Generate Midtrans Snap token
- `GET /api/midtrans/callback` - Payment redirect handler
- `POST /api/midtrans/webhook` - Payment webhook (server-to-server)

### End-to-End Checkout Flow

#### Order-First Architecture
The system uses an **order-first architecture** where orders are created BEFORE payment is processed:

```
1. User adds items to cart
   ↓
2. User clicks "Checkout"
   → POST /api/checkout/session
   → Creates checkout_session with cart snapshot
   ↓
3. User enters shipping details
   → PATCH /api/checkout/session
   → Updates shipping address & method
   ↓
4. User clicks "Place Order"
   → POST /api/midtrans/create-token
   → Generates payment token
   ↓
5. CREATE ORDER (before payment)
   → POST /api/orders/create-before-payment
   → Creates order with status: "pending_payment"
   → Reserves inventory
   → Sets 24-hour expiry
   ↓
6. User completes payment in Midtrans modal
   → Midtrans processes payment
   ↓
7. Payment webhook received
   → POST /api/midtrans/webhook
   → Verifies signature
   → Calls complete_order_payment()
   → Updates order status to "completed"
   → Confirms inventory reservation
   ↓
8. User redirected to confirmation page
   → GET /api/midtrans/callback
   → Redirects to /checkout/confirmation
```

#### Key Features

**Duplicate Order Prevention**:
- Checks for existing pending orders with same cart items
- Reuses existing order if found (prevents inventory abuse)
- Creates new order only if cart differs or order expired

**Inventory Management**:
- Inventory reserved when order is created (step 5)
- Reservation confirmed when payment completes (step 7)
- Inventory released if order expires (24 hours)

**Guest Checkout Support**:
- Uses session_id instead of user_id
- Stores shipping address in checkout_session
- Order info stored in sessionStorage
- Track order via order_number + email

**Payment Flow**:
- Order created first (reserves inventory)
- Payment token generated
- Midtrans Snap modal opened
- Webhook updates order on payment success
- Callback redirects user to confirmation

### Database Functions

**create_order_before_payment**:
- Creates order with pending_payment status
- Creates order_items from cart_snapshot
- Calls reserve_inventory_for_order()
- Sets 24-hour expiry time

**complete_order_payment**:
- Updates order status to completed
- Sets payment_status to completed
- Confirms inventory reservation
- Clears user's cart

**reserve_inventory_for_order**:
- Decrements product stock_quantity
- Creates inventory_reservation records
- Validates sufficient stock

**find_pending_order**:
- Finds existing pending order for user/session/email
- Used for duplicate prevention

### API Best Practices

**Frontend**:
```typescript
// ✅ Correct: Order-first
const order = await createOrderBeforePayment(checkoutSession)
const token = await createMidtransToken(order)
openPaymentModal(token)

// ❌ Wrong: Payment-first
const token = await createMidtransToken()
openPaymentModal(token)
const order = await createOrder() // Too late! Inventory not reserved
```

**Error Handling**:
- Always check for existing pending orders
- Handle payment webhook failures with manual verification
- Implement proper loading states
- Use sessionStorage for guest checkout (not URL params)

**Security**:
- Verify Midtrans webhook signatures
- Use server-side API routes for sensitive operations
- Never expose order details in URLs
- Validate inventory before order creation

## Future Enhancements

- [ ] Enhanced search with autocomplete and AI-powered recommendations
- [ ] Gift wrapping and personalization options
- [ ] Automated email marketing campaigns
- [ ] Advanced analytics dashboard with interactive charts
- [ ] Social media integration and sharing
- [ ] Loyalty program and rewards system
- [ ] Multi-warehouse inventory management
- [ ] Advanced reporting and business intelligence
- [ ] Mobile app (React Native)
- [ ] Subscription box service

## Performance

- **Lighthouse Score**: 90+ across all metrics
- **Image Optimization**: Next.js Image component with blur placeholders
- **Code Splitting**: Dynamic imports for heavy components
- **Lazy Loading**: Intersection Observer for scroll-triggered content
- **Caching**: React Query for data fetching and caching

## Accessibility

- **WCAG 2.1 AA Compliant**: Proper contrast ratios and semantic HTML
- **Keyboard Navigation**: Full keyboard support throughout
- **Screen Reader Support**: ARIA labels and landmarks
- **Reduced Motion**: Respects `prefers-reduced-motion` system setting
- **Focus Management**: Visible focus indicators with luxury gold rings

## License

This project is for demonstration purposes.

## Credits

Design inspired by Mediterranean luxury aesthetics and boutique fragrance houses.