'use client'

import { Check, X } from 'lucide-react'
import { validatePassword, getPasswordStrengthLabel, getPasswordStrengthColor } from '@/lib/validation'

interface PasswordStrengthIndicatorProps {
  password: string
}

interface Requirement {
  label: string
  met: boolean
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const strength = validatePassword(password)
  const label = getPasswordStrengthLabel(strength.score)
  const colorClass = getPasswordStrengthColor(strength.score)

  // Define requirements with their status
  const requirements: Requirement[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ]

  const metCount = requirements.filter(r => r.met).length
  const totalCount = requirements.length

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Password Strength
          </span>
          <span className={`text-xs font-semibold ${
            strength.score === 0 || strength.score === 1 ? 'text-red-600' :
            strength.score === 2 ? 'text-yellow-600' :
            strength.score === 3 ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                level <= strength.score ? colorClass : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="rounded-lg border border-border/40 bg-luxury-gray-light/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Requirements
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {metCount}/{totalCount}
          </span>
        </div>
        <div className="space-y-1.5">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                req.met ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {req.met ? (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                ) : (
                  <X className="h-3 w-3 text-gray-500" strokeWidth={2} />
                )}
              </div>
              <span className={`text-xs transition-colors ${
                req.met ? 'text-green-700 font-medium' : 'text-muted-foreground'
              }`}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
