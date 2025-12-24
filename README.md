# Mykonos - Luxury E-Commerce Platform

A high-end luxury e-commerce website inspired by Amouage.com, featuring elegant design, smooth animations, and premium user experience for a perfume/luxury goods brand.

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
- ✅ Homepage with hero section and featured collections
- ✅ Product listing with filtering and sorting
- ✅ Product detail pages with image galleries
- ✅ Collections pages
- ✅ Shopping cart
- ✅ About page
- ✅ Contact page
- ✅ Account page

### Key Features
- Responsive design (mobile-first)
- Luxury color scheme (blacks, golds, whites)
- Smooth animations and transitions
- Product filtering and sorting
- Image galleries with zoom
- Newsletter signup
- SEO optimized

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
│   ├── cart/              # Shopping cart
│   ├── collections/       # Collections pages
│   ├── contact/           # Contact page
│   ├── products/          # Product listing and detail pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── layout/           # Header, Footer
│   ├── ui/               # Reusable UI components
│   ├── collection-card.tsx
│   ├── hero-section.tsx
│   ├── product-card.tsx
│   ├── product-carousel.tsx
│   ├── product-filters.tsx
│   └── providers.tsx
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client and types
│   └── utils.ts          # Helper functions
├── supabase/             # Database schema
│   └── schema.sql        # SQL schema with sample data
└── public/               # Static assets

```

## Database Schema

The Supabase schema includes:
- **products**: Product catalog with images, pricing, categories
- **collections**: Product collections
- **cart_items**: User shopping carts
- **orders**: Order history
- **order_items**: Order line items

Sample data is included in the schema for testing.

## Customization

### Colors
Edit `tailwind.config.ts` to customize the luxury color palette:
```typescript
luxury: {
  gold: '#D4AF37',
  'gold-light': '#E5C158',
  'gold-dark': '#B8941F',
  // ...
}
```

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

## Future Enhancements

- [ ] Complete checkout flow
- [ ] User authentication with Supabase Auth
- [ ] Wishlist functionality
- [ ] Product reviews and ratings
- [ ] Search functionality
- [ ] Multi-currency support
- [ ] Gift wrapping options
- [ ] Email notifications
- [ ] Admin dashboard

## License

This project is for demonstration purposes.