'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isVideo = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }

  const selectedMedia = images[selectedIndex]

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
