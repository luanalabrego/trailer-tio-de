// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Regex para liberar arquivos estáticos (css, js, imagens, fontes…)
const PUBLIC_FILE = /\.(.*)$/

export const config = {
  matcher: [
    // tudo que NÃO comece com api, login, _next/static, _next/image, favicon.ico ou cardapio
    '/((?!api|login|_next/static|_next/image|favicon.ico|cardapio).*)',
  ],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) libera estáticos e a página de login
  if (PUBLIC_FILE.test(pathname) || pathname === '/login') {
    return NextResponse.next()
  }

  // 2) verifica sessão via cookie “perfil”
  const perfil = req.cookies.get('perfil')?.value
  if (!perfil) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // 3) autorizado
  return NextResponse.next()
}
