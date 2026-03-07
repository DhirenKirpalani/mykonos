'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, Loader2 } from 'lucide-react'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapPickerProps {
  onLocationSelect: (location: {
    lat: number
    lng: number
    address?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }) => void
  initialPosition?: [number, number]
  height?: string
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, 15)
  }, [position, map])
  return null
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: MapPickerProps['onLocationSelect'] }) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng
      setPosition([lat, lng])
      
      // Reverse geocoding using Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MykonosApp/1.0',
            },
          }
        )
        const data = await response.json()
        
        if (data.address) {
          onLocationSelect({
            lat,
            lng,
            address: data.display_name,
            city: data.address.city || data.address.town || data.address.village || '',
            state: data.address.state || data.address.province || '',
            country: data.address.country,
            postalCode: data.address.postcode || '',
          })
        } else {
          onLocationSelect({ lat, lng })
        }
      } catch (error) {
        console.error('Geocoding error:', error)
        onLocationSelect({ lat, lng })
      }
    },
  })

  return position === null ? null : <Marker position={position} />
}

export function MapPicker({ onLocationSelect, initialPosition = [-6.2088, 106.8456], height = '400px' }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(initialPosition)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleGetCurrentLocation = async () => {
    setIsLocating(true)
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const newPosition: [number, number] = [latitude, longitude]
        setCurrentPosition(newPosition)
        
        // Reverse geocode the current location
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'MykonosApp/1.0',
              },
            }
          )
          const data = await response.json()
          
          if (data.address) {
            onLocationSelect({
              lat: latitude,
              lng: longitude,
              address: data.display_name,
              city: data.address.city || data.address.town || data.address.village || '',
              state: data.address.state || data.address.province || '',
              country: data.address.country,
              postalCode: data.address.postcode || '',
            })
          } else {
            onLocationSelect({ lat: latitude, lng: longitude })
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          onLocationSelect({ lat: latitude, lng: longitude })
        }
        
        setIsLocating(false)
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setLocationError(errorMessage)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  if (!isMounted) {
    return (
      <div 
        className="flex items-center justify-center rounded-lg border border-border/40 bg-luxury-gray-light"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border/40" style={{ height }}>
      <MapContainer
        center={currentPosition}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
        <RecenterMap position={currentPosition} />
      </MapContainer>
      
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Use my current location"
        >
          {isLocating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Locating...
            </>
          ) : (
            <>
              <Crosshair className="h-4 w-4" />
              Use My Location
            </>
          )}
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] rounded-md bg-white px-3 py-2 text-xs shadow-lg">
        <p className="font-medium">Click on the map to select a location</p>
        {locationError && (
          <p className="mt-1 text-red-600">{locationError}</p>
        )}
      </div>
    </div>
  )
}
