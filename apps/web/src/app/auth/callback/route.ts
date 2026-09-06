import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Validate that a redirect path is safe (relative path only, no protocol traversal)
 */
function isValidRedirectPath(path: string): boolean {
  // Must start with a single forward slash (not //)
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  // Must not contain protocol indicators
  if (path.includes('://') || path.includes(':\\')) {
    return false;
  }
  // Must not contain encoded characters that could bypass validation
  const decoded = decodeURIComponent(path);
  if (decoded.startsWith('//') || decoded.includes('://')) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'

  // Validate redirect path to prevent open redirect attacks
  const next = isValidRedirectPath(nextParam) ? nextParam : '/';

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
