import { useLanguage } from '@/contexts/LanguageContext'
import { t as translate, type TranslationKey, type Language } from '@/i18n'

export function useTranslation() {
  const { locale } = useLanguage()
  
  // Map locale to language
  const lang: Language = locale === 'id' ? 'id' : 'en'
  
  return {
    t: (key: TranslationKey) => translate(key, lang),
    lang,
    isIndonesian: lang === 'id'
  }
}
