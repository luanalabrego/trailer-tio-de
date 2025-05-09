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

  // libera qualquer rota pública
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // lê o cookie 'perfil'
  const perfil = req.cookies.get('perfil')?.value

  // se não estiver logado (não houver perfil) redireciona pro login
  if (!perfil) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // bloqueia rotas de ADM para quem não for ADM
  const adminOnly = ['/financeiro']
  if (adminOnly.some(p => pathname.startsWith(p)) && perfil !== 'ADM') {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // aplica a todas as rotas, exceto _next, api e arquivos estáticos
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
