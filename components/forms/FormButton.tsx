import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  loadingText?: string
  children: ReactNode
}

export function FormButton({
  variant = 'primary',
  loading = false,
  loadingText = 'Loading...',
  children,
  className,
  disabled,
  ...props
}: FormButtonProps) {
  const baseStyles = "w-full rounded-md px-6 py-3 font-medium transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variantStyles = {
    primary: "bg-luxury-gold text-luxury-navy hover:bg-luxury-gold-light",
    secondary: "bg-luxury-navy text-white hover:bg-luxury-navy/90",
    outline: "border border-border bg-white text-gray-700 hover:bg-gray-50",
  }

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5 animate-spin-smooth" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </span>
      ) : children}
    </button>
  )
}
