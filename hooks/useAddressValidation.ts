import { useState } from 'react'

interface AddressValidationResult {
  isValid: boolean
  warnings: string[]
  suggestions: any[]
  message: string
}

interface Address {
  countryCode: string
  postalCode: string
  cityName: string
  addressLine1?: string
  full_name?: string
  phone?: string
  email?: string
}

export function useAddressValidation() {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null)

  /**
   * Layer 1: Client-side validation (immediate)
   */
  const validateClientSide = (address: Address): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Full name validation
    if (address.full_name) {
      if (address.full_name.length < 2) {
        errors.push('Name must be at least 2 characters')
      }
      if (address.full_name.length > 35) {
        errors.push('Name must be less than 35 characters')
      }
    }

    // Phone validation
    if (address.phone) {
      const phonePattern = /^\+\d{10,15}$/
      if (!phonePattern.test(address.phone)) {
        errors.push('Phone must include country code (e.g., +6281234567890)')
      }
    }

    // Email validation
    if (address.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(address.email)) {
        errors.push('Please enter a valid email address')
      }
    }

    // Address line validation
    if (address.addressLine1) {
      if (address.addressLine1.length < 5) {
        errors.push('Address must be at least 5 characters')
      }
      if (address.addressLine1.length > 45) {
        errors.push('Address must be less than 45 characters (DHL limit)')
      }
    }

    // Postal code validation
    if (!address.postalCode) {
      errors.push('Postal code is required')
    } else if (address.countryCode === 'ID' && !/^\d{5}$/.test(address.postalCode)) {
      errors.push('Indonesian postal code must be 5 digits')
    } else if (address.countryCode === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postalCode)) {
      errors.push('US ZIP code must be 5 or 9 digits')
    } else if (address.countryCode === 'SG' && !/^\d{6}$/.test(address.postalCode)) {
      errors.push('Singapore postal code must be 6 digits')
    }

    // City validation
    if (!address.cityName || address.cityName.length < 2) {
      errors.push('City name is required')
    }

    // Country code validation
    if (!address.countryCode || !/^[A-Z]{2}$/.test(address.countryCode)) {
      errors.push('Country code must be 2 letters (e.g., ID, US, SG)')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Layer 2: DHL API validation (real-time)
   */
  const validateWithDHL = async (address: Address): Promise<AddressValidationResult> => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch('/api/shipping/dhl/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delivery',
          countryCode: address.countryCode,
          postalCode: address.postalCode,
          cityName: address.cityName,
          strictValidation: true,
        }),
      })

      const data = await response.json()
      setValidationResult(data)
      return data
    } catch (error) {
      console.error('DHL address validation failed:', error)
      const fallbackResult = {
        isValid: false,
        warnings: ['Unable to validate address with DHL. Please verify your address is correct.'],
        suggestions: [],
        message: 'Validation service unavailable',
      }
      setValidationResult(fallbackResult)
      return fallbackResult
    } finally {
      setIsValidating(false)
    }
  }

  /**
   * Combined validation (Layer 1 + Layer 2)
   */
  const validateAddress = async (address: Address) => {
    // First, validate client-side
    const clientValidation = validateClientSide(address)
    
    if (!clientValidation.isValid) {
      return {
        isValid: false,
        warnings: clientValidation.errors,
        suggestions: [],
        message: 'Please fix the errors before continuing',
        layer: 'client',
      }
    }

    // Then validate with DHL API
    const dhlValidation = await validateWithDHL(address)
    
    return {
      ...dhlValidation,
      layer: 'dhl',
    }
  }

  const clearValidation = () => {
    setValidationResult(null)
  }

  return {
    validateAddress,
    validateClientSide,
    validateWithDHL,
    clearValidation,
    isValidating,
    validationResult,
  }
}
