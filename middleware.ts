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

  // 1) libera rotas públicas
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 2) exige cookie 'perfil' (login) para todo o resto
  const perfil = req.cookies.get('perfil')?.value
  if (!perfil) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 3) caso haja perfil, deixa seguir para qualquer página
  return NextResponse.next()
}

export const config = {
  // aplica a todas as rotas, exceto as públicas (_next, api, favicon)
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
