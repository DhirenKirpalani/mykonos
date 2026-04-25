'use client'

import Image, { ImageProps } from 'next/image'

/**
 * Protected Image Component
 * Prevents copying, downloading, and right-clicking on images
 */
export function ProtectedImage(props: ImageProps) {
  return (
    <Image
      {...props}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // Prevent right-click and middle-click
        if (e.button === 2 || e.button === 1) {
          e.preventDefault()
        }
      }}
      className={`select-none ${props.className || ''}`}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        ...props.style,
      }}
    />
  )
}

/**
 * Protected img tag component
 * For cases where Next.js Image cannot be used
 */
export function ProtectedImg(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // Prevent right-click and middle-click
        if (e.button === 2 || e.button === 1) {
          e.preventDefault()
        }
      }}
      className={`select-none ${props.className || ''}`}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        pointerEvents: 'none',
        ...props.style,
      }}
    />
  )
}
