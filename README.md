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
- ✅ Product detail pages with image galleries
- ✅ Collections pages
- ✅ Shopping cart
- ✅ About page
- ✅ Contact page
- ✅ Account page
- ✅ Login & Registration pages
- ✅ FAQs page
- ✅ Privacy Policy page
- ✅ Terms & Conditions page
- ✅ Shipping Information page
- ✅ Returns & Exchanges page

#### Admin CMS Dashboard
- ✅ Dashboard overview with analytics
- ✅ Product management (create, edit, list)
- ✅ Order management
- ✅ Customer management
- ✅ Collections management
- ✅ Banner management
- ✅ Promo codes management
- ✅ Analytics & reporting

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

#### User Experience
- **Authentication System**: Complete sign-up, sign-in, and sign-out flows with Supabase Auth
- **Role-Based Access Control**: Customer, admin, and super admin roles with permission management
- **Notification System**: Real-time notifications with badge counter and dialog
- **Shopping Cart**: Full cart management with persistent state
- **Account Management**: User profile and order history
- **Newsletter Signup**: Email subscription integration
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
│   ├── account/           # User account page
│   ├── api/               # API routes for backend functionality
│   ├── auth/              # Authentication callback handlers
│   ├── cart/              # Shopping cart
│   ├── cms/               # Admin CMS dashboard
│   │   ├── analytics/     # Analytics & reporting
│   │   ├── banners/       # Banner management
│   │   ├── collections/   # Collections management
│   │   ├── customers/     # Customer management
│   │   ├── orders/        # Order management
│   │   ├── products/      # Product management
│   │   └── promo-codes/   # Promo code management
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
│   │   └── roles.ts
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
│   └── schema.sql        # SQL schema with sample data
└── public/               # Static assets
```

## Database Schema

The Supabase schema includes:
- **products**: Product catalog with images, pricing, categories
- **collections**: Product collections
- **users**: User profiles with role-based access control
- **cart_items**: User shopping carts
- **orders**: Order history
- **order_items**: Order line items
- **promo_codes**: Promotional discount codes
- **regions**: Geographic regions for localization

Sample data is included in the schema for testing.

### User Roles
- **customer**: Standard user with shopping capabilities
- **admin**: Store administrator with CMS access
- **super_admin**: Full system access with all permissions

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

### Authentication & Authorization
- ✅ Complete authentication system with Supabase Auth
- ✅ Role-based access control (RBAC) with customer, admin, and super admin roles
- ✅ Protected routes and permission-based UI rendering
- ✅ User profile management

### Admin CMS Dashboard
- ✅ Comprehensive admin dashboard with analytics
- ✅ Product management interface
- ✅ Order and customer management
- ✅ Banner and promotional content management
- ✅ Promo code creation and management

### Enhanced User Experience
- ✅ Advanced accessibility mode with customizable settings
- ✅ Region detection and localization
- ✅ Multi-currency pricing support
- ✅ Internationalization with next-intl
- ✅ Legal pages (Privacy, Terms, Shipping, Returns)
- ✅ FAQs page

### Technical Improvements
- ✅ Context-based state management (Auth, Accessibility, Region, Language)
- ✅ Custom hooks for reusable logic
- ✅ Comprehensive TypeScript type definitions
- ✅ Form validation with Zod schemas
- ✅ Toast notifications with Sonner

## Future Enhancements

- [ ] Complete checkout flow with payment integration (Stripe/PayPal)
- [ ] Enhanced search with autocomplete and filters
- [ ] Wishlist functionality
- [ ] Product reviews and ratings system
- [ ] Gift wrapping and personalization options
- [ ] Email notifications for orders and promotions
- [ ] Advanced analytics dashboard with charts
- [ ] Social media integration
- [ ] Inventory management system
- [ ] Automated email marketing campaigns

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