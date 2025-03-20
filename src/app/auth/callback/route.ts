import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('Auth callback received, processing OAuth response')
  
  // If there's no code, the user canceled the sign in
  if (!code) {
    console.error('No code parameter found in callback URL')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth_canceled`)
  }
  
  try {
    const supabase = await createClient()
    
    // Exchange the code for a session
    console.log('Exchanging authorization code for session')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth_callback&message=${encodeURIComponent(error.message)}`)
    }
    
    // Log successful authentication
    console.log('Authentication successful, session established', {
      user: data.user?.id,
      session: data.session ? 'created' : 'not created',
      hasRefreshToken: !!data.session?.refresh_token
    })
    
    // Redirect to the modules page on successful sign in
    return NextResponse.redirect(`${requestUrl.origin}/modules`)
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth_callback&message=${encodeURIComponent('An unexpected error occurred')}`)
  }
} 