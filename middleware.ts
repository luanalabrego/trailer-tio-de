// middleware.ts (na raiz do projeto)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Executa em todas as rotas, exceto as públicas
export const config = {
  matcher: [
    // regex que exclui /login, /api, /_next e favicon
    '/((?!login|api|_next|favicon.ico).*)',
  ],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // rota de login — libera sempre
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // verifica cookie de sessão
  const perfil = req.cookies.get('perfil')?.value
  if (!perfil) {
    // redireciona para /login
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
