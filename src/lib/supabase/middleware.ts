import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected paths
  const isDashboard = pathname.startsWith('/dashboard')
  const isSetupProfile = pathname === '/setup-profile'
  const isGroup = pathname.startsWith('/group')
  const isJoin = pathname.startsWith('/join')
  const isLogin = pathname === '/login'

  if (!user && (isDashboard || isSetupProfile || isGroup || isJoin)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (isJoin || isGroup) {
      url.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(url)
  }

  if (user) {
    // Check profile existence for authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .single()

    const hasProfile = Boolean(profile)

    if (isLogin) {
      const url = request.nextUrl.clone()
      const nextParam = request.nextUrl.searchParams.get('next')
      url.pathname = hasProfile ? (nextParam || '/dashboard') : '/setup-profile'
      return NextResponse.redirect(url)
    }

    if ((isDashboard || isGroup || isJoin) && !hasProfile) {
      const url = request.nextUrl.clone()
      url.pathname = '/setup-profile'
      return NextResponse.redirect(url)
    }

    if (isSetupProfile && hasProfile) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
