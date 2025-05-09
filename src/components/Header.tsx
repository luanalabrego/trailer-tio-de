'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import Image from 'next/image'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<string | null>(null)

  useEffect(() => {
    const tipo = localStorage.getItem('perfil')?.toUpperCase() || null
    setPerfil(tipo)
  }, [])

  if (!perfil) return null

  const groupedLinks: Record<string, { name: string; href: string }[]> = {
    Dashboard: [{ name: 'Dashboard', href: '/dashboard' }],
    Caixa: [{ name: 'Caixa', href: '/caixa' }],
    Agendamentos: [{ name: 'Agendamentos', href: '/agendamentos' }],
    Produtos: [
      { name: 'Cadastrar Produtos', href: '/produtos' },
      { name: 'Categorias', href: '/categorias' },
      { name: 'Estoque', href: '/estoque' },
    ],
    Financeiro: [
      { name: 'Resumo Financeiro', href: '/financeiro' },
      { name: 'Pagamentos Pendentes', href: '/pendencias' },
      { name: 'Custos', href: '/custos' },
    ],
    Clientes: perfil === 'ADM' ? [{ name: 'Clientes', href: '/clientes' }] : [],
    Histórico: [
      { name: 'Agendamentos', href: '/historico/agendamentos' },
      { name: 'Vendas', href: '/historico/venda' },
      { name: 'Estoque', href: '/historico/estoque' },
    ],
    Cardápio: [{ name: 'Cardápio', href: '/cardapio' }],
  }

  // ordem fixa dos grupos
  const menuOrder = [
    'Dashboard',
    'Caixa',
    'Agendamentos',
    'Produtos',
    'Financeiro',
    'Estoque',
    'Clientes',
    'Histórico',
    'Cardápio',
  ]

  const handleLogout = () => {
    localStorage.removeItem('perfil')
    router.push('/login')
  }

  return (
    <header className="bg-white shadow fixed top-0 w-full z-50">
      <div
        className="
          max-w-7xl mx-auto 
          flex items-center justify-between h-16 
          px-4 md:px-0
        "
      >
        {/* Logo e nome mais à esquerda em desktop */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Trailer Do Tio Dé"
            width={64}
            height={64}
            unoptimized
            className="w-12 h-12 sm:w-16 sm:h-16"
          />
          <span className="ml-2 text-xl sm:text-2xl font-bold text-gray-800">
            Trailer do Tio Dé
          </span>
        </Link>

        {/* Menu Desktop */}
<nav className="hidden md:flex space-x-6">
  {menuOrder.map(grupo => {
    const links = groupedLinks[grupo] || []
    if (!links.length) return null

    if (links.length === 1) {
      const link = links[0]
      const isActive = pathname === link.href
      return (
        <Link
          key={link.href}
          href={link.href}
          className={`
            relative text-sm font-medium text-gray-700 hover:text-gray-900
            pb-1 transition
            ${isActive ? 'border-b-2 border-indigo-400' : ''}
          `}
        >
          {grupo}
        </Link>
      )
    }

    const anyChildActive = links.some(l => l.href === pathname)
    return (
      <div key={grupo} className="relative">
        <button
          onClick={() =>
            setSubmenuAberto(prev => (prev === grupo ? null : grupo))
          }
          className={`
            relative flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900
            pb-1 transition
            ${anyChildActive ? 'border-b-2 border-indigo-400' : ''}
          `}
        >
          {grupo}
          <ChevronDown
            size={14}
            className={`transition-transform ${
              submenuAberto === grupo ? 'rotate-180' : ''
            }`}
          />
        </button>
        {submenuAberto === grupo && (
          <ul className="absolute mt-2 w-48 bg-white border rounded shadow-lg z-50">
            {links.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setSubmenuAberto(null)}
                  className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                    pathname === link.href
                      ? 'text-indigo-600 font-semibold'
                      : 'text-gray-700'
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  })}
  <button
    onClick={handleLogout}
    className="text-sm text-red-500 hover:underline"
  >
    Sair
  </button>
</nav>


        {/* Toggle Mobile */}
        <div className="md:hidden">
          <button onClick={() => setMenuAberto(prev => !prev)}>
            {menuAberto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Dropdown Mobile */}
      {menuAberto && (
        <div className="md:hidden bg-white shadow-lg px-4 pb-4">
          {menuOrder.map(grupo => {
            const links = groupedLinks[grupo] || []
            if (!links.length) return null

            return (
              <div key={grupo} className="mb-2">
                {links.length === 1 ? (
                  <Link
                    href={links[0].href}
                    onClick={() => setMenuAberto(false)}
                    className={`block py-2 text-sm ${
                      pathname === links[0].href
                        ? 'text-indigo-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {grupo}
                  </Link>
                ) : (
                  <details>
                    <summary className="cursor-pointer py-2 text-sm font-semibold">
                      {grupo}
                    </summary>
                    <ul className="pl-4">
                      {links.map(link => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setMenuAberto(false)}
                            className={`block py-1 text-sm ${
                              pathname === link.href
                                ? 'text-indigo-600'
                                : 'text-gray-700'
                            }`}
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )
          })}
          <button
            onClick={handleLogout}
            className="block w-full text-left py-2 text-sm text-red-500"
          >
            Sair
          </button>
        </div>
      )}
    </header>
  )
}
