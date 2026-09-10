import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Simple in-memory rate limiter.
 * Cleans up expired entries automatically.
 *
 * @param request - The incoming request
 * @param maxRequests - Max requests per window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60s)
 * @returns NextResponse if rate limited, null if allowed
 */
export function rateLimit(
  request: NextRequest,
  maxRequests = 10,
  windowMs = 60_000
): NextResponse | null {
  // Get client identifier (IP or fallback)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const key = `${ip}:${request.nextUrl.pathname}`

  const now = Date.now()

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    rateLimitMap.forEach((v, k) => {
      if (v.resetTime < now) {
        rateLimitMap.delete(k)
      }
    })
  }

  const entry = rateLimitMap.get(key)

  if (!entry) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return null
  }

  if (now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return null
  }

  entry.count++
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    )
  }

  return null
}
