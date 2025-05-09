// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/_next/',
  '/_next/static/',
  '/_next/image/',
  '/api/',
  '/favicon.ico',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) libera rotas públicas (login, assets, api, favicon)
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 2) exige login: cookie 'perfil' deve existir
  const perfil = req.cookies.get('perfil')?.value
  if (!perfil) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 3) tudo OK: deixa seguir
  return NextResponse.next()
}

export const config = {
  // pega **todas** as rotas
  matcher: ['/:path*'],
}
