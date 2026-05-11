export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ background: '#071D49' }}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <h2
            className="font-montserrat text-4xl font-normal tracking-[0.3em] md:text-5xl animate-pulse-subtle"
            style={{ background: 'linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            MYKONOS
          </h2>
          <div className="absolute -inset-4 bg-luxury-gold/5 blur-2xl rounded-full"></div>
        </div>
        <div className="relative h-14 w-14 md:h-16 md:w-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-luxury-gold/20"></div>
          <div className="absolute inset-0 animate-spin-smooth rounded-full border-[3px] border-transparent border-t-luxury-gold border-r-luxury-gold/60"></div>
          <div className="absolute inset-2 rounded-full bg-luxury-gold/5 animate-pulse-glow"></div>
          <div className="absolute inset-0 flex items-center justify-center">
          </div>
        </div>
        <span className="sr-only">Loading content, please wait</span>
      </div>
    </div>
  )
}
