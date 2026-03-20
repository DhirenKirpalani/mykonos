/**
 * Skeleton Loader Components
 * Luxury-focused skeleton loaders with subtle shimmer effect
 */

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'gold' | 'subtle'
}

export function Skeleton({ className = '', variant = 'default' }: SkeletonProps) {
  const baseClasses = 'animate-shimmer bg-gradient-to-r rounded'
  
  const variantClasses = {
    default: 'from-gray-200 via-gray-100 to-gray-200',
    gold: 'from-luxury-gold/10 via-luxury-gold/5 to-luxury-gold/10',
    subtle: 'from-gray-100 via-white to-gray-100'
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ backgroundSize: '200% 100%' }}
    />
  )
}

// Product Card Skeleton
export function ProductCardSkeleton({ variant = 'gold' }: { variant?: 'default' | 'gold' | 'subtle' }) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md">
      {/* Image Skeleton */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Skeleton variant={variant} className="h-full w-full" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Brand */}
        <Skeleton variant={variant} className="h-3 w-20" />
        
        {/* Title */}
        <Skeleton variant={variant} className="h-5 w-full" />
        <Skeleton variant={variant} className="h-5 w-3/4" />
        
        {/* Price */}
        <div className="flex items-center gap-2 pt-2">
          <Skeleton variant={variant} className="h-6 w-24" />
          <Skeleton variant={variant} className="h-4 w-20" />
        </div>
        
        {/* Button */}
        <Skeleton variant={variant} className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}

// Product Grid Skeleton
export function ProductGridSkeleton({ count = 8, variant = 'gold' }: { count?: number; variant?: 'default' | 'gold' | 'subtle' }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  )
}

// Product Detail Skeleton
export function ProductDetailSkeleton({ variant = 'gold' }: { variant?: 'default' | 'gold' | 'subtle' }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Image Gallery Skeleton */}
      <div className="space-y-4">
        {/* Main Image */}
        <Skeleton variant={variant} className="aspect-square w-full rounded-lg" />
        
        {/* Thumbnails */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant={variant} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
      
      {/* Product Info Skeleton */}
      <div className="space-y-6">
        {/* Brand */}
        <Skeleton variant={variant} className="h-4 w-32" />
        
        {/* Title */}
        <Skeleton variant={variant} className="h-8 w-full" />
        <Skeleton variant={variant} className="h-8 w-2/3" />
        
        {/* Price */}
        <div className="flex items-center gap-3">
          <Skeleton variant={variant} className="h-10 w-40" />
          <Skeleton variant={variant} className="h-6 w-32" />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-4 w-full" />
          <Skeleton variant={variant} className="h-4 w-full" />
          <Skeleton variant={variant} className="h-4 w-3/4" />
        </div>
        
        {/* Variants */}
        <div className="space-y-3">
          <Skeleton variant={variant} className="h-5 w-24" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant={variant} className="h-12 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Quantity */}
        <Skeleton variant={variant} className="h-12 w-32 rounded-lg" />
        
        {/* Add to Cart Button */}
        <Skeleton variant={variant} className="h-14 w-full rounded-lg" />
        
        {/* Additional Info */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant={variant} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Cart Item Skeleton
export function CartItemSkeleton({ variant = 'gold' }: { variant?: 'default' | 'gold' | 'subtle' }) {
  return (
    <div className="flex gap-4 border-b border-gray-200 py-4">
      {/* Image */}
      <Skeleton variant={variant} className="h-20 w-20 flex-shrink-0 rounded-lg" />
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton variant={variant} className="h-4 w-3/4" />
        <Skeleton variant={variant} className="h-3 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton variant={variant} className="h-8 w-24 rounded" />
          <Skeleton variant={variant} className="h-5 w-20" />
        </div>
      </div>
    </div>
  )
}

// Checkout Form Skeleton
export function CheckoutFormSkeleton({ variant = 'gold' }: { variant?: 'default' | 'gold' | 'subtle' }) {
  return (
    <div className="space-y-6">
      {/* Section Title */}
      <Skeleton variant={variant} className="h-6 w-48" />
      
      {/* Form Fields */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant={variant} className="h-4 w-32" />
            <Skeleton variant={variant} className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Button */}
      <Skeleton variant={variant} className="h-14 w-full rounded-lg" />
    </div>
  )
}

// List Item Skeleton
export function ListItemSkeleton({ variant = 'gold' }: { variant?: 'default' | 'gold' | 'subtle' }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
      <Skeleton variant={variant} className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton variant={variant} className="h-4 w-3/4" />
        <Skeleton variant={variant} className="h-3 w-1/2" />
      </div>
      <Skeleton variant={variant} className="h-8 w-20 rounded" />
    </div>
  )
}
