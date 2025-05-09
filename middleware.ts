// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/_next/',
  '/api/',
  '/favicon.ico',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) libera rotas públicas sem precisar de cookie
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 2) para TODO o resto, exige cookie 'perfil'
  const perfil = req.cookies.get('perfil')?.value
  if (!perfil) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 3) se tiver perfil (ADM ou FUNC), deixa passar
  return NextResponse.next()
}

export const config = {
  // roda em todas as rotas
  matcher: ['/:path*'],
}
