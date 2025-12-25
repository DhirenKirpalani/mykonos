// Shared type definitions

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  created_at?: string
  updated_at?: string
}

export interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface RegisterFormData extends FormData {
  password: string
  confirmPassword: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface AuthError {
  message: string
  code?: string
}

export interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}
