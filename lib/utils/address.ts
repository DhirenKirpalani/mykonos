// Address validation utilities

export interface CountryData {
  code: string
  name: string
  states: string[]
  cities: string[]
  phoneFormat: RegExp
  phoneExample: string
  postalCodeFormat?: RegExp
}

export const COUNTRIES: Record<string, CountryData> = {
  US: {
    code: 'US',
    name: 'United States',
    states: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming'
    ],
    cities: [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
      'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
      'Fort Worth', 'Columbus', 'San Francisco', 'Charlotte', 'Indianapolis',
      'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Detroit',
      'Nashville', 'Portland', 'Memphis', 'Oklahoma City', 'Las Vegas',
      'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson',
      'Fresno', 'Mesa', 'Sacramento', 'Atlanta', 'Kansas City', 'Colorado Springs',
      'Miami', 'Raleigh', 'Omaha', 'Long Beach', 'Virginia Beach', 'Oakland',
      'Minneapolis', 'Tulsa', 'Tampa', 'Arlington'
    ],
    phoneFormat: /^(\+1)?[\s.-]?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
    phoneExample: '+1 (555) 123-4567',
    postalCodeFormat: /^\d{5}(-\d{4})?$/
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    states: [
      'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta',
      'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
      'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah',
      'Kalimantan Timur', 'Kalimantan Utara', 'Kepulauan Bangka Belitung',
      'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara',
      'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Papua Barat',
      'Riau', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tengah',
      'Sulawesi Tenggara', 'Sulawesi Utara', 'Sumatera Barat',
      'Sumatera Selatan', 'Sumatera Utara'
    ],
    cities: [
      'Jakarta', 'Surabaya', 'Bandung', 'Bekasi', 'Medan', 'Tangerang',
      'Depok', 'Semarang', 'Palembang', 'Makassar', 'South Tangerang',
      'Batam', 'Bogor', 'Pekanbaru', 'Bandar Lampung', 'Padang', 'Malang',
      'Denpasar', 'Samarinda', 'Tasikmalaya', 'Pontianak', 'Cimahi',
      'Balikpapan', 'Jambi', 'Surakarta', 'Serang', 'Manado', 'Mataram',
      'Yogyakarta', 'Cilegon', 'Kupang', 'Palu', 'Ambon', 'Sukabumi',
      'Cirebon', 'Bengkulu', 'Pekalongan', 'Kediri', 'Jayapura', 'Palangkaraya'
    ],
    phoneFormat: /^(\+62|62|0)[2-9]\d{7,11}$/,
    phoneExample: '+62 812-3456-7890',
    postalCodeFormat: /^\d{5}$/
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    states: [
      'England', 'Scotland', 'Wales', 'Northern Ireland'
    ],
    cities: [
      'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds',
      'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast', 'Leicester',
      'Nottingham', 'Newcastle', 'Brighton', 'Southampton', 'Portsmouth',
      'Reading', 'Derby', 'Plymouth', 'Wolverhampton', 'Stoke-on-Trent',
      'Coventry', 'Sunderland', 'Bradford', 'Aberdeen', 'Cambridge', 'Oxford'
    ],
    phoneFormat: /^(\+44|0)[1-9]\d{9,10}$/,
    phoneExample: '+44 20 7946 0958',
    postalCodeFormat: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i
  }
}

export function validatePhone(phone: string, countryCode: string): { valid: boolean; message?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, message: 'Phone number is required' }
  }

  const country = COUNTRIES[countryCode]
  if (!country) {
    return { valid: false, message: 'Invalid country code' }
  }

  const cleanPhone = phone.replace(/\s/g, '')
  if (!country.phoneFormat.test(cleanPhone)) {
    return { 
      valid: false, 
      message: `Invalid phone format. Example: ${country.phoneExample}` 
    }
  }

  return { valid: true }
}

export function validateAddress(address: string): { valid: boolean; message?: string } {
  if (!address || address.trim().length === 0) {
    return { valid: false, message: 'Address is required' }
  }

  if (address.trim().length < 5) {
    return { valid: false, message: 'Address is too short (minimum 5 characters)' }
  }

  if (address.trim().length > 200) {
    return { valid: false, message: 'Address is too long (maximum 200 characters)' }
  }

  // Check for at least one number (street number)
  if (!/\d/.test(address)) {
    return { valid: false, message: 'Address should include a street number' }
  }

  return { valid: true }
}

export function validatePostalCode(postalCode: string, countryCode: string): { valid: boolean; message?: string } {
  if (!postalCode || postalCode.trim().length === 0) {
    return { valid: false, message: 'Postal code is required' }
  }

  const country = COUNTRIES[countryCode]
  if (!country || !country.postalCodeFormat) {
    return { valid: true } // Skip validation if format not defined
  }

  if (!country.postalCodeFormat.test(postalCode.trim())) {
    return { valid: false, message: 'Invalid postal code format' }
  }

  return { valid: true }
}

export function getCountryByRegion(region: string): string {
  // Map region codes to country codes
  const regionToCountry: Record<string, string> = {
    'US': 'US',
    'ID': 'ID',
    'GB': 'GB',
    'EU': 'GB', // Default EU to UK for now
  }

  return regionToCountry[region] || 'US'
}

export function formatPhoneNumber(phone: string, countryCode: string): string {
  const country = COUNTRIES[countryCode]
  if (!country) return phone

  const cleaned = phone.replace(/\D/g, '')
  
  if (countryCode === 'US') {
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
  } else if (countryCode === 'ID') {
    if (cleaned.startsWith('62')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`
    } else if (cleaned.startsWith('0')) {
      return `+62 ${cleaned.slice(1, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
    }
  }

  return phone
}
