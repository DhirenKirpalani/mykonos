// Application constants

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ACCOUNT: '/account',
  CART: '/cart',
  PRODUCTS: '/products',
  CONTACT: '/contact',
  AUTH_CALLBACK: '/auth/callback',
} as const

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
} as const

export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 4000,
  EXTRA_LONG: 6000,
} as const

export const PASSWORD_STRENGTH_LABELS = {
  0: 'Weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
} as const

export const PASSWORD_STRENGTH_COLORS = {
  0: 'bg-red-500',
  1: 'bg-red-500',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-green-500',
} as const
