import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export function createClient(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the response headers
          try {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          } catch (e) {
            console.error('Error setting cookie in middleware:', e)
          }
        },
        remove(name: string, _options: CookieOptions) {
          // If the cookie is removed, update the response headers
          try {
            request.cookies.delete(name)
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.delete(name)
          } catch (e) {
            console.error('Error removing cookie in middleware:', e)
          }
        },
      },
    }
  )

  return { supabase, response }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Update request headers
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('cookie', request.cookies.toString())
          // Create new response
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          // Set cookie on the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, _options: CookieOptions) {
          // Delete cookie from the request
          request.cookies.delete(name)
          // Update request headers
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('cookie', request.cookies.toString())
          // Create new response
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          // Delete cookie from the response
          response.cookies.delete(name)
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  await supabase.auth.getUser()

  return response
} 