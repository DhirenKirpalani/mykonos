export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-luxury-navy via-luxury-navy-light to-luxury-navy overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        {/* Brand Logo */}
        <div className="relative">
          <h2 className="font-serif text-4xl font-medium tracking-[0.3em] text-luxury-gold md:text-5xl animate-pulse-subtle">
            MYKONOS
          </h2>
          <div className="absolute -inset-4 bg-luxury-gold/5 blur-2xl rounded-full"></div>
        </div>

        {/* Brand Spinner */}
        <div className="relative h-14 w-14 md:h-16 md:w-16">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-luxury-gold/20"></div>
          {/* Spinning highlight */}
          <div className="absolute inset-0 animate-spin-smooth rounded-full border-[3px] border-transparent border-t-luxury-gold border-r-luxury-gold/60"></div>
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-luxury-gold/5 animate-pulse-glow"></div>
        </div>

        {/* Screen reader support */}
        <span className="sr-only">Loading content, please wait</span>
      </div>
    </div>
  )
}
