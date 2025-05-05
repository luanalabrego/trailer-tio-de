'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { getUserType } from '@/lib/auth'

export function Header() {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null)
  const router = useRouter()

  const tipo = getUserType()

  const groupedLinks = {
    Dashboard: [{ name: 'Dashboard', href: '/dashboard' }],
    Produtos: [
      { name: 'Cadastrar Produtos', href: '/produtos' },
      { name: 'Categorias', href: '/categorias' },
      ...(tipo === 'adm' ? [{ name: 'Estoque', href: '/estoque' }] : []),
    ],
    ...(tipo === 'adm'
      ? {
          Financeiro: [
            { name: 'Resumo Financeiro', href: '/financeiro' },
            { name: 'Pagamentos Pendentes', href: '/pendencias' },
            { name: 'Cadastrar Custos', href: '/custos' },
          ],
        }
      : {}),
    Caixa: [{ name: 'Caixa', href: '/caixa' }],
    Clientes: tipo === 'adm' ? [{ name: 'Clientes', href: '/clientes' }] : [],
    Agendamentos: [{ name: 'Agendamentos', href: '/agendamentos' }],
    Cardápio: [{ name: 'Cardápio', href: '/cardapio' }],
  }

  const handleLogout = () => {
    localStorage.removeItem('userType')
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center space-x-2">
          <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-full" />
          <span className="font-semibold text-lg text-gray-800">Trailer Tio Dê</span>
        </div>

        {/* Navegação desktop */}
        <nav className="hidden md:flex space-x-6 relative">
          {Object.entries(groupedLinks).map(([grupo, links]) =>
            links.length === 1 ? (
              <Link
                key={links[0].href}
                href={links[0].href}
                className={`text-sm font-medium ${
                  pathname === links[0].href
                    ? 'text-indigo-600 underline'
                    : 'text-gray-700 hover:text-indigo-600'
                }`}
              >
                {grupo}
              </Link>
            ) : (
              <div key={grupo} className="relative group">
                <button
                  onMouseEnter={() => setSubmenuAberto(grupo)}
                  onMouseLeave={() => setSubmenuAberto(null)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-indigo-600"
                >
                  {grupo} <ChevronDown size={16} />
                </button>
                {submenuAberto === grupo && (
                  <div
                    className="absolute top-full mt-2 w-48 bg-white border rounded shadow-md z-50"
                    onMouseEnter={() => setSubmenuAberto(grupo)}
                    onMouseLeave={() => setSubmenuAberto(null)}
                  >
                    {links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          pathname === link.href ? 'text-indigo-600 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 font-medium hover:underline"
          >
            Sair
          </button>
        </nav>

        {/* Menu mobile */}
        <div className="md:hidden">
          <button onClick={() => setMenuAberto(!menuAberto)}>
            {menuAberto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Dropdown mobile */}
      {menuAberto && (
        <div className="md:hidden bg-white shadow-md px-4 pb-4">
          {Object.entries(groupedLinks).map(([grupo, links]) => (
            <div key={grupo} className="mb-2">
              {links.length === 1 ? (
                <Link
                  href={links[0].href}
                  onClick={() => setMenuAberto(false)}
                  className={`block py-2 text-sm ${
                    pathname === links[0].href ? 'text-indigo-600' : 'text-gray-700'
                  }`}
                >
                  {grupo}
                </Link>
              ) : (
                <details>
                  <summary className="text-sm text-gray-800 font-semibold cursor-pointer py-2">
                    {grupo}
                  </summary>
                  <ul className="pl-4">
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuAberto(false)}
                          className={`block py-1 text-sm ${
                            pathname === link.href ? 'text-indigo-600' : 'text-gray-700'
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
          ))}
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
