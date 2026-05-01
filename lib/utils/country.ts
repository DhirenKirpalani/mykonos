/**
 * Country code to full name mapping
 */
export const COUNTRY_NAMES: Record<string, string> = {
  // Common country codes
  'ID': 'Indonesia',
  'IDN': 'Indonesia',
  'US': 'United States',
  'USA': 'United States',
  'GB': 'United Kingdom',
  'GBR': 'United Kingdom',
  'SG': 'Singapore',
  'SGP': 'Singapore',
  'MY': 'Malaysia',
  'MYS': 'Malaysia',
  'TH': 'Thailand',
  'THA': 'Thailand',
  'PH': 'Philippines',
  'PHL': 'Philippines',
  'VN': 'Vietnam',
  'VNM': 'Vietnam',
  'AU': 'Australia',
  'AUS': 'Australia',
  'NZ': 'New Zealand',
  'NZL': 'New Zealand',
  'JP': 'Japan',
  'JPN': 'Japan',
  'KR': 'South Korea',
  'KOR': 'South Korea',
  'CN': 'China',
  'CHN': 'China',
  'IN': 'India',
  'IND': 'India',
  'AE': 'United Arab Emirates',
  'ARE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'SAU': 'Saudi Arabia',
  'FR': 'France',
  'FRA': 'France',
  'DE': 'Germany',
  'DEU': 'Germany',
  'IT': 'Italy',
  'ITA': 'Italy',
  'ES': 'Spain',
  'ESP': 'Spain',
  'NL': 'Netherlands',
  'NLD': 'Netherlands',
  'BE': 'Belgium',
  'BEL': 'Belgium',
  'CH': 'Switzerland',
  'CHE': 'Switzerland',
  'AT': 'Austria',
  'AUT': 'Austria',
  'SE': 'Sweden',
  'SWE': 'Sweden',
  'NO': 'Norway',
  'NOR': 'Norway',
  'DK': 'Denmark',
  'DNK': 'Denmark',
  'FI': 'Finland',
  'FIN': 'Finland',
  'CA': 'Canada',
  'CAN': 'Canada',
  'MX': 'Mexico',
  'MEX': 'Mexico',
  'BR': 'Brazil',
  'BRA': 'Brazil',
  'AR': 'Argentina',
  'ARG': 'Argentina',
}

/**
 * Convert country code to full country name
 * If already a full name or unknown code, return as-is
 */
export function getCountryName(countryCodeOrName: string): string {
  if (!countryCodeOrName) return ''
  
  // If it's already a full name (contains spaces or is longer than 3 chars), return as-is
  if (countryCodeOrName.includes(' ') || countryCodeOrName.length > 3) {
    return countryCodeOrName
  }
  
  // Convert to uppercase for lookup
  const code = countryCodeOrName.toUpperCase()
  
  // Return mapped name or original if not found
  return COUNTRY_NAMES[code] || countryCodeOrName
}
