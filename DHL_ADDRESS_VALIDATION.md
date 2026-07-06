# DHL Address Validation - Best Practices

## 🎯 Overview

To ensure all customer addresses are valid and supported by DHL **before** creating shipments, implement address validation at multiple checkpoints in your checkout flow.

## 📋 Best Practice: Multi-Layer Validation

### **Layer 1: Client-Side Validation (Immediate Feedback)**
Validate basic format as customer types

### **Layer 2: DHL API Validation (Before Checkout)**
Validate with DHL when customer completes address form

### **Layer 3: Pre-Shipment Validation (Before Creating Label)**
Final check before creating DHL shipment

---

## 🔧 Implementation Guide

### **1. Validate During Checkout (Recommended)**

Add validation when customer enters shipping address:

```typescript
// In your checkout page component
const validateShippingAddress = async (address: {
  countryCode: string
  postalCode: string
  cityName: string
  countyName?: string
}) => {
  try {
    const response = await fetch('/api/shipping/dhl/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'delivery',
        countryCode: address.countryCode,
        postalCode: address.postalCode,
        cityName: address.cityName,
        countyName: address.countyName,
        strictValidation: true, // Enforce strict validation
      }),
    })

    const data = await response.json()

    if (!data.isValid) {
      // Show warnings to customer
      console.warn('Address validation warnings:', data.warnings)
      
      // Optionally show suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        console.log('Suggested addresses:', data.suggestions)
      }

      return {
        isValid: false,
        warnings: data.warnings,
        suggestions: data.suggestions,
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('Address validation failed:', error)
    // Decide: Allow checkout anyway or block?
    return { isValid: false, error: 'Validation service unavailable' }
  }
}
```

### **2. Add Validation to Checkout Flow**

```typescript
// When customer clicks "Continue to Payment"
const handleProceedToPayment = async () => {
  // Validate address first
  const validation = await validateShippingAddress({
    countryCode: shippingAddress.country,
    postalCode: shippingAddress.postal_code,
    cityName: shippingAddress.city,
    countyName: shippingAddress.state,
  })

  if (!validation.isValid) {
    // Show error message
    toast.error('Please verify your shipping address')
    
    // Show warnings
    validation.warnings?.forEach(warning => {
      toast.warning(warning)
    })

    // Optionally show address suggestions
    if (validation.suggestions && validation.suggestions.length > 0) {
      setAddressSuggestions(validation.suggestions)
      setShowSuggestionModal(true)
    }

    return // Block checkout
  }

  // Address is valid, proceed to payment
  proceedToPayment()
}
```

### **3. Real-Time Validation (As Customer Types)**

For better UX, validate as customer completes each field:

```typescript
import { useDebounce } from '@/hooks/useDebounce'

const AddressForm = () => {
  const [address, setAddress] = useState({
    country: '',
    postalCode: '',
    city: '',
  })
  const [validationStatus, setValidationStatus] = useState<{
    isValidating: boolean
    isValid: boolean | null
    warnings: string[]
  }>({
    isValidating: false,
    isValid: null,
    warnings: [],
  })

  // Debounce validation to avoid too many API calls
  const debouncedAddress = useDebounce(address, 1000) // Wait 1s after typing stops

  useEffect(() => {
    // Only validate if all required fields are filled
    if (debouncedAddress.country && debouncedAddress.postalCode && debouncedAddress.city) {
      validateAddress()
    }
  }, [debouncedAddress])

  const validateAddress = async () => {
    setValidationStatus({ isValidating: true, isValid: null, warnings: [] })

    const validation = await validateShippingAddress(address)

    setValidationStatus({
      isValidating: false,
      isValid: validation.isValid,
      warnings: validation.warnings || [],
    })
  }

  return (
    <div>
      {/* Address form fields */}
      <input
        value={address.postalCode}
        onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
        placeholder="Postal Code"
      />

      {/* Validation status indicator */}
      {validationStatus.isValidating && (
        <div className="text-gray-500">
          <Spinner /> Validating address...
        </div>
      )}

      {validationStatus.isValid === true && (
        <div className="text-green-600">
          ✓ Address is valid for DHL shipping
        </div>
      )}

      {validationStatus.isValid === false && (
        <div className="text-red-600">
          ⚠ Address validation warnings:
          <ul>
            {validationStatus.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

### **4. Pre-Shipment Validation (Admin CMS)**

Before admin clicks "Mark as Shipped", validate the address:

```typescript
// In CMS Orders page
const handleMarkAsShipped = async (orderId: string) => {
  // Get order details
  const order = await fetchOrder(orderId)

  // Validate shipping address
  const validation = await validateShippingAddress({
    countryCode: order.shipping_address.country,
    postalCode: order.shipping_address.postal_code,
    cityName: order.shipping_address.city,
  })

  if (!validation.isValid) {
    // Show warning to admin
    const proceed = confirm(
      `Address has validation warnings:\n${validation.warnings.join('\n')}\n\nProceed anyway?`
    )

    if (!proceed) {
      return // Cancel shipment creation
    }
  }

  // Create DHL shipment
  await createShipment(orderId)
}
```

---

## 🚨 Handling Validation Failures

### **Strategy 1: Block Checkout (Strict)**
```typescript
if (!validation.isValid) {
  toast.error('Cannot proceed: Invalid shipping address')
  return // Block checkout completely
}
```

**Pros:**
- Prevents failed shipments
- Ensures DHL can deliver

**Cons:**
- May lose sales if validation is too strict
- False positives can frustrate customers

### **Strategy 2: Warning with Override (Flexible)**
```typescript
if (!validation.isValid) {
  const proceed = await showWarningModal({
    title: 'Address Verification',
    message: 'Your address could not be fully verified. Proceed anyway?',
    warnings: validation.warnings,
  })

  if (!proceed) {
    return // Customer cancels
  }
}
// Continue with checkout
```

**Pros:**
- Better customer experience
- Allows edge cases

**Cons:**
- Risk of failed deliveries
- May need manual intervention

### **Strategy 3: Suggest Corrections (Best UX)**
```typescript
if (!validation.isValid && validation.suggestions.length > 0) {
  const selectedAddress = await showAddressSelector({
    original: address,
    suggestions: validation.suggestions,
  })

  if (selectedAddress) {
    setAddress(selectedAddress) // Use suggested address
  }
}
```

**Pros:**
- Best user experience
- Reduces delivery failures
- Customers feel helped, not blocked

**Cons:**
- More complex UI
- Requires address suggestion modal

---

## 📊 Validation Response Format

```json
{
  "success": true,
  "isValid": false,
  "warnings": [
    "Postal code format may be incorrect",
    "City name does not match postal code"
  ],
  "suggestions": [
    {
      "postalCode": "10001",
      "cityName": "New York",
      "countryCode": "US",
      "provinceCode": "NY"
    }
  ],
  "message": "Address has validation warnings"
}
```

---

## 🎯 Recommended Implementation

### **For E-Commerce (Customer-Facing)**

1. **Real-time validation** as customer types (debounced)
2. **Show suggestions** if address is invalid
3. **Allow override** with warning for edge cases
4. **Final validation** before payment

### **For Admin CMS**

1. **Validate before creating shipment**
2. **Show warnings** to admin
3. **Allow override** with confirmation
4. **Log validation failures** for review

---

## 🔍 Common Validation Issues

### **Issue 1: Postal Code Format**
**Problem:** Customer enters wrong format (e.g., "10001-1234" vs "10001")

**Solution:**
```typescript
// Normalize postal code before validation
const normalizePostalCode = (code: string, country: string) => {
  if (country === 'US') {
    return code.split('-')[0] // Remove ZIP+4
  }
  return code.replace(/\s/g, '') // Remove spaces
}
```

### **Issue 2: City Name Mismatch**
**Problem:** Customer enters neighborhood instead of city

**Solution:**
- Use DHL suggestions to show correct city
- Auto-correct common mistakes
- Allow customer to select from suggestions

### **Issue 3: Rural/Remote Areas**
**Problem:** DHL may not deliver to some remote areas

**Solution:**
```typescript
if (validation.warnings.includes('Remote area')) {
  // Show alternative shipping options
  // Or show service point delivery option
}
```

---

## 💡 Performance Optimization

### **1. Cache Validation Results**
```typescript
const validationCache = new Map<string, ValidationResult>()

const getCacheKey = (address: Address) => 
  `${address.countryCode}-${address.postalCode}-${address.cityName}`

const validateWithCache = async (address: Address) => {
  const key = getCacheKey(address)
  
  if (validationCache.has(key)) {
    return validationCache.get(key)
  }

  const result = await validateShippingAddress(address)
  validationCache.set(key, result)
  
  return result
}
```

### **2. Debounce API Calls**
```typescript
import { debounce } from 'lodash'

const debouncedValidate = debounce(validateShippingAddress, 1000)
```

### **3. Validate Only Changed Fields**
```typescript
const [lastValidatedAddress, setLastValidatedAddress] = useState(null)

const shouldValidate = (newAddress: Address) => {
  if (!lastValidatedAddress) return true
  
  return (
    newAddress.postalCode !== lastValidatedAddress.postalCode ||
    newAddress.cityName !== lastValidatedAddress.cityName ||
    newAddress.countryCode !== lastValidatedAddress.countryCode
  )
}
```

---

## ✅ Complete Checkout Flow Example

```typescript
const CheckoutPage = () => {
  const [shippingAddress, setShippingAddress] = useState<Address>({})
  const [addressValidation, setAddressValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Validate address when customer completes form
  const handleAddressComplete = async () => {
    setIsValidating(true)
    
    const validation = await validateShippingAddress(shippingAddress)
    setAddressValidation(validation)
    setIsValidating(false)

    if (!validation.isValid) {
      // Show suggestions modal
      if (validation.suggestions.length > 0) {
        const selected = await showAddressSuggestionModal(validation.suggestions)
        if (selected) {
          setShippingAddress(selected)
          // Re-validate selected address
          handleAddressComplete()
        }
      }
    }
  }

  // Proceed to payment only if address is valid
  const handleProceedToPayment = () => {
    if (!addressValidation?.isValid) {
      toast.error('Please verify your shipping address')
      return
    }

    // Continue to payment
    router.push('/checkout/payment')
  }

  return (
    <div>
      <AddressForm 
        value={shippingAddress}
        onChange={setShippingAddress}
        onComplete={handleAddressComplete}
      />

      {isValidating && <LoadingSpinner />}

      {addressValidation && (
        <ValidationStatus validation={addressValidation} />
      )}

      <Button 
        onClick={handleProceedToPayment}
        disabled={!addressValidation?.isValid}
      >
        Continue to Payment
      </Button>
    </div>
  )
}
```

---

## 🎯 Summary

**Best Practice Checklist:**

- [ ] Validate address during checkout (before payment)
- [ ] Show real-time validation feedback
- [ ] Provide address suggestions when available
- [ ] Allow customer to correct invalid addresses
- [ ] Cache validation results to reduce API calls
- [ ] Validate again before creating DHL shipment (admin side)
- [ ] Log validation failures for analysis
- [ ] Handle edge cases gracefully (rural areas, PO boxes, etc.)
- [ ] Test with various address formats
- [ ] Monitor validation success rate

**When to Validate:**
1. ✅ **During checkout** - When customer enters address
2. ✅ **Before payment** - Final check before order creation
3. ✅ **Before shipment** - Admin validates before creating DHL label

This multi-layer approach ensures maximum delivery success while maintaining good UX! 🚀
