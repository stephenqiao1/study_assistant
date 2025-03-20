import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

// Configuration for handling authentication
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files
     * - login and signup pages (to prevent redirect loops)
     * - auth callback route (to prevent redirect loops)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|signup|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for auth-related paths to prevent redirect loops
    const url = new URL(request.url);
    if (url.pathname.startsWith('/login') || 
        url.pathname.startsWith('/signup') || 
        url.pathname.startsWith('/auth/callback')) {
      return NextResponse.next();
    }
    
    // Create a Supabase client configured to use cookies
    const { supabase, response } = createClient(request);

    // Refresh session if expired - this will set new cookies
    const { data: { session: _session }, error } = await supabase.auth.getSession();
    
    // If there's an error with the session or refresh token
    if (error) {
      console.error('Auth middleware session error:', error);
      
      // If it's a refresh token error, redirect to login
      if (error.message.includes('Refresh Token') || 
          error.message.includes('invalid_grant') ||
          error.message.includes('unauthorized')) {
        console.log('Refresh token error detected in middleware, redirecting to login');
        
        // Sign out the user to clear any problematic session data
        await supabase.auth.signOut({ scope: 'global' });
        
        // Redirect to login with error message
        return NextResponse.redirect(
          new URL(`/login?error=session&message=${encodeURIComponent(error.message)}`, request.url)
        );
      }
    }

    // If we have a response, it means we modified the cookies
    if (response) {
      return response;
    }
  } catch (e) {
    // If there's an error refreshing the session, log it
    console.error('Auth middleware error:', e);
  }

  return NextResponse.next();
} 