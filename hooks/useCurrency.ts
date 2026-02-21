import { useState, useEffect } from 'react'
import { Currency, getUserCurrency, setUserCurrency, detectUserCurrency } from '@/lib/utils/currency'

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>('USD')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initCurrency = async () => {
      // First check localStorage
      const stored = getUserCurrency()
      
      if (stored) {
        setCurrency(stored)
        setIsLoading(false)
      } else {
        // Detect based on location
        const detected = await detectUserCurrency()
        setCurrency(detected)
        setUserCurrency(detected)
        setIsLoading(false)
      }
    }

    initCurrency()
  }, [])

  const changeCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency)
    setUserCurrency(newCurrency)
  }

  return {
    currency,
    setCurrency: changeCurrency,
    isLoading,
  }
}
