import { PASSWORD_REQUIREMENTS, PASSWORD_STRENGTH_LABELS, PASSWORD_STRENGTH_COLORS } from '@/lib/constants'
import type { PasswordStrength } from '@/lib/types'

const REGEX_PATTERNS = {
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBER: /\d/,
  SPECIAL_CHAR: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const

const COMMON_PATTERNS = ['123', 'abc', 'password', 'qwerty', '111'] as const

export function validatePassword(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    score++
  } else {
    feedback.push(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`)
  }

  if (password.length >= 12) {
    score++
  }

  // Uppercase check
  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE) {
    if (REGEX_PATTERNS.UPPERCASE.test(password)) {
      score++
    } else {
      feedback.push('Include at least one uppercase letter')
    }
  }

  // Lowercase check
  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE) {
    if (REGEX_PATTERNS.LOWERCASE.test(password)) {
      score++
    } else {
      feedback.push('Include at least one lowercase letter')
    }
  }

  // Number check
  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER) {
    if (REGEX_PATTERNS.NUMBER.test(password)) {
      score++
    } else {
      feedback.push('Include at least one number')
    }
  }

  // Special character check
  if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL_CHAR) {
    if (REGEX_PATTERNS.SPECIAL_CHAR.test(password)) {
      score++
    } else {
      feedback.push('Include at least one special character')
    }
  }

  // Common patterns check
  const lowerPassword = password.toLowerCase()
  if (COMMON_PATTERNS.some(pattern => lowerPassword.includes(pattern))) {
    score = Math.max(0, score - 2)
    feedback.push('Avoid common patterns')
  }

  // Normalize score to 0-4
  const normalizedScore = Math.min(4, Math.max(0, Math.floor(score / 1.5)))

  return {
    score: normalizedScore,
    feedback,
    isValid: normalizedScore >= 3 && feedback.length === 0
  }
}

export function getPasswordStrengthLabel(score: number): string {
  return PASSWORD_STRENGTH_LABELS[score as keyof typeof PASSWORD_STRENGTH_LABELS] || 'Weak'
}

export function getPasswordStrengthColor(score: number): string {
  return PASSWORD_STRENGTH_COLORS[score as keyof typeof PASSWORD_STRENGTH_COLORS] || 'bg-gray-300'
}

export function validateEmail(email: string): boolean {
  return REGEX_PATTERNS.EMAIL.test(email)
}

export function validatePasswordMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword
}
