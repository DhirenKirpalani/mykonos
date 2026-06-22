import { useState, useEffect } from 'react'

export function usePageContent(pageKey: string, locale: string) {
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/page-content/${pageKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setContent(d.content?.[locale] || d.content?.en || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pageKey, locale])

  return { content, loading }
}
