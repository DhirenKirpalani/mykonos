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
      {loading ? loadingText : children}
    </button>
  )
}
