import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Paths that use their own auth (API key / CRON_SECRET) — skip NextAuth
const PUBLIC_API_PREFIXES = [
  '/api/external/',
  '/api/orders',
  '/api/cron/',
]

// Routes that require the ADMIN role
const ADMIN_ONLY_PREFIXES = [
  '/api/users',
  '/api/roles',
  '/api/permissions',
  '/users',
  '/roles',
]

export default withAuth(
  function middleware(req: NextRequest) {
    const path  = req.nextUrl.pathname
    const token = (req as any).nextauth?.token

    // Admin-only route protection (role check from JWT — no extra DB call)
    if (ADMIN_ONLY_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) {
      const roles: string[] = token?.roles ?? []
      if (!roles.includes('ADMIN')) {
        const isApi = path.startsWith('/api/')
        if (isApi) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (PUBLIC_API_PREFIXES.some(p => path === p || path.startsWith(p))) {
          return true
        }
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
