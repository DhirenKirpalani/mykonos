// Region-based city and province data

export interface Province {
  code: string
  name: string
  cities: string[]
}

export interface RegionData {
  [countryCode: string]: Province[]
}

export const REGION_DATA: RegionData = {
  ID: [
    {
      code: 'JK',
      name: 'DKI Jakarta',
      cities: [
        'Jakarta Pusat',
        'Jakarta Utara',
        'Jakarta Barat',
        'Jakarta Selatan',
        'Jakarta Timur',
        'Kepulauan Seribu',
      ],
    },
    {
      code: 'JB',
      name: 'Jawa Barat',
      cities: [
        'Bandung',
        'Bekasi',
        'Bogor',
        'Cirebon',
        'Depok',
        'Sukabumi',
        'Tasikmalaya',
        'Cimahi',
        'Banjar',
      ],
    },
    {
      code: 'JT',
      name: 'Jawa Tengah',
      cities: [
        'Semarang',
        'Surakarta',
        'Magelang',
        'Salatiga',
        'Pekalongan',
        'Tegal',
      ],
    },
    {
      code: 'JI',
      name: 'Jawa Timur',
      cities: [
        'Surabaya',
        'Malang',
        'Kediri',
        'Blitar',
        'Mojokerto',
        'Madiun',
        'Pasuruan',
        'Probolinggo',
        'Batu',
      ],
    },
    {
      code: 'YO',
      name: 'DI Yogyakarta',
      cities: ['Yogyakarta', 'Sleman', 'Bantul', 'Gunung Kidul', 'Kulon Progo'],
    },
    {
      code: 'BT',
      name: 'Banten',
      cities: [
        'Tangerang',
        'Tangerang Selatan',
        'Serang',
        'Cilegon',
        'Pandeglang',
        'Lebak',
      ],
    },
    {
      code: 'BA',
      name: 'Bali',
      cities: ['Denpasar', 'Badung', 'Gianyar', 'Tabanan', 'Buleleng'],
    },
    {
      code: 'SU',
      name: 'Sumatera Utara',
      cities: [
        'Medan',
        'Binjai',
        'Pematangsiantar',
        'Tebing Tinggi',
        'Tanjungbalai',
      ],
    },
  ],
  US: [
    {
      code: 'AL',
      name: 'Alabama',
      cities: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa'],
    },
    {
      code: 'CA',
      name: 'California',
      cities: [
        'Los Angeles',
        'San Francisco',
        'San Diego',
        'San Jose',
        'Sacramento',
        'Oakland',
        'Fresno',
      ],
    },
    {
      code: 'NY',
      name: 'New York',
      cities: ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
    },
    {
      code: 'TX',
      name: 'Texas',
      cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
    },
    {
      code: 'FL',
      name: 'Florida',
      cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee'],
    },
  ],
  GB: [
    {
      code: 'ENG',
      name: 'England',
      cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'],
    },
    {
      code: 'SCT',
      name: 'Scotland',
      cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
    },
    {
      code: 'WLS',
      name: 'Wales',
      cities: ['Cardiff', 'Swansea', 'Newport'],
    },
  ],
  SG: [
    {
      code: 'SG',
      name: 'Singapore',
      cities: [
        'Central',
        'East',
        'North',
        'North-East',
        'West',
        'Sentosa',
        'Jurong',
      ],
    },
  ],
  MY: [
    {
      code: 'KUL',
      name: 'Kuala Lumpur',
      cities: ['Kuala Lumpur'],
    },
    {
      code: 'SEL',
      name: 'Selangor',
      cities: ['Shah Alam', 'Petaling Jaya', 'Subang Jaya', 'Klang'],
    },
    {
      code: 'PNG',
      name: 'Penang',
      cities: ['George Town', 'Butterworth'],
    },
    {
      code: 'JHR',
      name: 'Johor',
      cities: ['Johor Bahru', 'Muar', 'Batu Pahat'],
    },
  ],
}

// Helper function to get provinces for a country
export function getProvinces(countryCode: string): Province[] {
  return REGION_DATA[countryCode] || []
}

// Helper function to get cities for a province
export function getCities(countryCode: string, provinceCode: string): string[] {
  const provinces = REGION_DATA[countryCode] || []
  const province = provinces.find((p) => p.code === provinceCode)
  return province?.cities || []
}

// Helper function to check if country has region data
export function hasRegionData(countryCode: string): boolean {
  return countryCode in REGION_DATA
}
