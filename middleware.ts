import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

// Chráníme vše KROMĚ: přihlašovací stránky, auth API, externích API endpointů, Next.js assetů
// api/orders      — e-shop → ERP order sync (API key auth)
// api/invoices    — invoice PDF download (API key auth)
// api/cron        — cron jobs (CRON_SECRET auth)
// api/external    — původní externí API
export const config = {
  matcher: [
    '/((?!login|api/auth|api/external|api/orders|api/invoices|api/cron|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
