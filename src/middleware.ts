// middleware.ts (na raiz do projeto)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Regex para arquivos estáticos (fonts, imagens, etc)
const PUBLIC_FILE = /\.(.*)$/

export const config = {
  matcher: [
    // tudo que NÃO comece com api, login, _next/static, _next/image ou favicon.ico
    '/((?!api|login|_next/static|_next/image|favicon.ico).*)',
  ],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) permite arquivos estáticos pelo regex
  if (PUBLIC_FILE.test(pathname)) {
    return NextResponse.next()
  }

  // 2) rota de login — sempre livre
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // 3) verifica cookie de sessão “perfil”
  const perfil = req.cookies.get('perfil')?.value
  if (!perfil) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // 4) tudo OK
  return NextResponse.next()
}
