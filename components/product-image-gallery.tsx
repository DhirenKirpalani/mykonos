'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { VoucherCountdown } from '@/components/VoucherCountdown'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  voucher?: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    valid_until: string
  } | null
  onVoucherExpire?: () => void
}

export function ProductImageGallery({ images, productName, voucher, onVoucherExpire }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isVideo = (url: string | undefined) => {
    if (!url) return false
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }

  const selectedMedia = images[selectedIndex]
  
  // Return null if no images or invalid index
  if (!images || images.length === 0 || !selectedMedia) {
    return null
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Main Image/Video Display */}
      <div className="relative w-full max-w-[450px] aspect-square overflow-hidden rounded-xl bg-white border border-gray-200">
        {isVideo(selectedMedia) ? (
          <video
            src={selectedMedia}
            controls
            className="h-full w-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <Image
            src={selectedMedia}
            alt={`${productName} - Image ${selectedIndex + 1}`}
            fill
            className="object-contain"
            priority={selectedIndex === 0}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        
        {/* Voucher Countdown Overlay */}
        {voucher && (
          <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 10h1a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2Zm0 2a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2H9Zm12 5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-1a1.5 1.5 0 0 0 0-3v-1a1.5 1.5 0 0 0 0-3v-1A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v1a1.5 1.5 0 0 0 0 3v1a1.5 1.5 0 0 0 0 3v1ZM20 8.5h-1.5a1 1 0 0 1-1-1V7H4.5v.5a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v.5h15v-.5a1 1 0 0 1 1-1h.5v-1h-.5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h.5v-1Zm-2.5 4.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-12 3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/>
                </svg>
                <span className="text-white text-xs font-bold">
                  Voucher Diskon {voucher.discount_type === 'percentage' 
                    ? `${voucher.discount_value}%`
                    : `Rp${voucher.discount_value.toLocaleString('id-ID')}`
                  }
                </span>
              </div>
              <VoucherCountdown validUntil={voucher.valid_until} onExpire={onVoucherExpire} />
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="w-full max-w-[450px] grid grid-cols-6 gap-1.5">
          {images.map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-[#0055AA]",
                selectedIndex === index
                  ? "border-[#0055AA] ring-2 ring-[#0055AA] ring-offset-2"
                  : "border-gray-200"
              )}
            >
              {isVideo(url) ? (
                <div className="relative h-full w-full bg-gray-100">
                  <video
                    src={url}
                    className="h-full w-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <svg
                      className="h-8 w-8 text-white drop-shadow-lg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <Image
                  src={url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="20vw"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
