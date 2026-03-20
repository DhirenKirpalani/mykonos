/**
 * Brand Spinner Components
 * Luxury-focused spinners for page transitions and loading states
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'gold' | 'navy' | 'white'
  withText?: boolean
  text?: string
  className?: string
}

/**
 * Elegant Brand Spinner
 * Refined spinner with luxury gold accent
 */
export function BrandSpinner({
  size = 'md',
  variant = 'gold',
  withText = false,
  text = 'Loading...',
  className = '',
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }

  const colorClasses = {
    gold: 'border-luxury-gold/20 border-t-luxury-gold border-r-luxury-gold/60',
    navy: 'border-luxury-navy/20 border-t-luxury-navy border-r-luxury-navy/60',
    white: 'border-white/20 border-t-white border-r-white/60',
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} rounded-full border-[3px] ${colorClasses[variant]} animate-spin-smooth`} />
        
        {/* Inner glow */}
        <div className={`absolute inset-2 rounded-full ${
          variant === 'gold' ? 'bg-luxury-gold/5' : 
          variant === 'navy' ? 'bg-luxury-navy/5' : 
          'bg-white/5'
        } animate-pulse-glow`} />
      </div>
      
      {withText && (
        <p className={`text-sm font-medium ${
          variant === 'gold' ? 'text-luxury-gold' : 
          variant === 'navy' ? 'text-luxury-navy' : 
          'text-white'
        }`}>
          {text}
        </p>
      )}
    </div>
  )
}

/**
 * Inline Spinner
 * Small spinner for buttons and inline loading
 */
export function InlineSpinner({ variant = 'gold' }: { variant?: 'gold' | 'navy' | 'white' }) {
  const colorClasses = {
    gold: 'border-luxury-gold/20 border-t-luxury-gold',
    navy: 'border-luxury-navy/20 border-t-luxury-navy',
    white: 'border-white/20 border-t-white',
  }

  return (
    <div className={`h-4 w-4 rounded-full border-2 ${colorClasses[variant]} animate-spin`} />
  )
}

/**
 * Page Transition Spinner
 * Full-page overlay with brand spinner
 */
export function PageTransitionSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Brand Name */}
        <div className="relative">
          <h2 className="font-serif text-4xl font-medium tracking-[0.3em] text-luxury-gold md:text-5xl animate-pulse-subtle">
            MYKONOS
          </h2>
          <div className="absolute -inset-4 bg-luxury-gold/5 blur-2xl rounded-full" />
        </div>
        
        {/* Spinner */}
        <BrandSpinner size="lg" variant="gold" />
      </div>
    </div>
  )
}

/**
 * Mini Spinner
 * Tiny spinner for small UI elements
 */
export function MiniSpinner({ variant = 'gold' }: { variant?: 'gold' | 'navy' | 'white' }) {
  const colorClasses = {
    gold: 'border-luxury-gold/30 border-t-luxury-gold',
    navy: 'border-luxury-navy/30 border-t-luxury-navy',
    white: 'border-white/30 border-t-white',
  }

  return (
    <div className={`h-3 w-3 rounded-full border-2 ${colorClasses[variant]} animate-spin`} />
  )
}
