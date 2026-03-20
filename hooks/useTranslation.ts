import { useLanguage } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { locale, t: translations } = useLanguage()
  
  // Create a function that accesses nested keys like 'home.shopNow'
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = translations
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value || key
  }
  
  return {
    t,
    lang: locale,
    isIndonesian: locale === 'id'
  }
}
