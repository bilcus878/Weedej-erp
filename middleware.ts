import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Paths that use their own auth (API key / CRON_SECRET) — skip NextAuth
const PUBLIC_API_PREFIXES = [
  '/api/external/',
  '/api/orders',
  '/api/cron/',
]

export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Allow public API paths through without a session token
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

// Run middleware on everything except static assets and auth routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
