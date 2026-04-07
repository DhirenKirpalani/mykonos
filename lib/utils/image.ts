/**
 * Filter out invalid or placeholder image URLs
 */
export function filterValidImageUrls(urls: string[] | null | undefined): string[] {
  if (!urls || !Array.isArray(urls)) return []
  
  return urls.filter(url => {
    if (!url || typeof url !== 'string') return false
    // Filter out placeholder services and invalid URLs
    if (url.includes('placehold.co')) return false
    if (url.includes('placeholder.com')) return false
    if (url.includes('via.placeholder.com')) return false
    return true
  })
}

/**
 * Get the first valid image URL from an array
 */
export function getFirstValidImage(urls: string[] | null | undefined): string | null {
  const validUrls = filterValidImageUrls(urls)
  return validUrls.length > 0 ? validUrls[0] : null
}
