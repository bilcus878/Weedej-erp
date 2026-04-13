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

// Chráníme vše KROMĚ: přihlašovací stránky, auth API, externího API pro eshop, Next.js assetů
export const config = {
  matcher: [
    '/((?!login|api/auth|api/external|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
