'use client'

import { useEffect, useState } from 'react'

interface ProgressBarProps {
  progress: number // 0-100
  variant?: 'default' | 'gold' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  className?: string
}

/**
 * Elegant Progress Bar
 * Perfect for checkout steps and file uploads
 */
export function ProgressBar({
  progress,
  variant = 'gold',
  size = 'md',
  showPercentage = false,
  className = '',
}: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0)

  // Smooth animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress)
    }, 100)
    return () => clearTimeout(timer)
  }, [progress])

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variantClasses = {
    default: 'bg-luxury-gold',
    gold: 'bg-gradient-to-r from-luxury-gold/80 via-luxury-gold to-luxury-gold/80',
    gradient: 'bg-gradient-to-r from-luxury-navy via-luxury-gold to-luxury-navy',
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span className="font-medium text-luxury-gold">{Math.round(displayProgress)}%</span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Checkout Step Progress
 * Shows which step is active in checkout flow
 */
export function CheckoutProgress({ currentStep, totalSteps = 3 }: { currentStep: number; totalSteps?: number }) {
  const progress = (currentStep / totalSteps) * 100

  const steps = [
    { number: 1, label: 'Shipping' },
    { number: 2, label: 'Payment' },
    { number: 3, label: 'Review' },
  ].slice(0, totalSteps)

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <ProgressBar progress={progress} variant="gold" size="sm" />
      
      {/* Step Labels */}
      <div className="flex justify-between">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex flex-col items-center ${
              step.number <= currentStep ? 'text-luxury-gold' : 'text-gray-400'
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                step.number <= currentStep
                  ? 'border-luxury-gold bg-luxury-gold text-luxury-navy'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {step.number}
            </div>
            <span className="mt-2 text-xs font-medium">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Upload Progress with Perfume Bottle Animation
 * Elegant file upload indicator
 */
export function UploadProgress({ progress, fileName }: { progress: number; fileName?: string }) {
  return (
    <div className="space-y-3 rounded-lg border border-luxury-gold/20 bg-luxury-gold/5 p-4">
      {/* File Name */}
      {fileName && (
        <p className="text-sm font-medium text-gray-700 truncate">{fileName}</p>
      )}
      
      {/* Progress Bar with Percentage */}
      <ProgressBar progress={progress} variant="gold" size="md" showPercentage />
      
      {/* Perfume Bottle Icon (fills up) */}
      <div className="flex items-center justify-center">
        <div className="relative h-16 w-12">
          {/* Bottle Outline */}
          <svg viewBox="0 0 48 64" className="absolute inset-0 text-luxury-gold/30" fill="none" stroke="currentColor" strokeWidth="2">
            {/* Cap */}
            <rect x="18" y="0" width="12" height="8" rx="1" />
            {/* Neck */}
            <rect x="20" y="8" width="8" height="8" />
            {/* Body */}
            <path d="M12 16 L12 56 Q12 60 16 60 L32 60 Q36 60 36 56 L36 16 Z" />
          </svg>
          
          {/* Fill (animated based on progress) */}
          <svg viewBox="0 0 48 64" className="absolute inset-0 text-luxury-gold" fill="currentColor">
            <defs>
              <clipPath id="bottle-clip">
                <path d="M12 16 L12 56 Q12 60 16 60 L32 60 Q36 60 36 56 L36 16 Z" />
              </clipPath>
            </defs>
            <rect
              x="12"
              y={16 + (44 * (100 - progress) / 100)}
              width="24"
              height={44 * progress / 100}
              clipPath="url(#bottle-clip)"
              className="transition-all duration-300"
            />
          </svg>
        </div>
      </div>
      
      {/* Status Text */}
      <p className="text-center text-xs text-gray-600">
        {progress < 100 ? 'Uploading...' : 'Upload complete'}
      </p>
    </div>
  )
}
