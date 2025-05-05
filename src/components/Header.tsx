'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import Image from 'next/image';

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  subMenu?: SubItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agendamentos', href: '/agendamentos', subMenu: [
      { label: 'Novo Agendamento', href: '/agendamentos/novo' },
      { label: 'Lista de Agendamentos', href: '/agendamentos' },
    ]
  },
  { label: 'Clientes', href: '/clientes' },
  { label: 'Caixa', href: '/caixa' },
  { label: 'Estoque', href: '/estoque' },
  { label: 'Produtos', href: '/produtos' },
  { label: 'Categorias', href: '/categorias' },
  { label: 'Cardápio', href: '/cardapio' },
  { label: 'Financeiro', href: '/financeiro', subMenu: [
      { label: 'Visão Geral', href: '/financeiro' },
      { label: 'Custos', href: '/financeiro/custos' },
      { label: 'Pendências', href: '/financeiro/pendencias' },
    ]
  },
];

export function Header() {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedPerfil = localStorage.getItem('perfil');
    if (!storedPerfil) router.push('/login');
    else setPerfil(storedPerfil);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('perfil');
    router.push('/login');
  };

  return (
    <header className="w-full bg-white shadow fixed top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center">
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <span className="ml-2 text-xl font-bold">Gestão Trailer</span>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button onClick={() => setMenuAberto(prev => !prev)}>
            {menuAberto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`${menuAberto ? 'block' : 'hidden'} md:flex md:items-center`}>
          {navItems.map(item => (
            <div
              key={item.label}
              className="relative group"
              onMouseEnter={() => setSubmenuAberto(item.label)}
              onMouseLeave={() => setSubmenuAberto(null)}
            >
              <Link
                href={item.href}
                className={`block px-3 py-2 text-sm font-medium ${
                  pathname.startsWith(item.href) ? 'text-blue-600' : 'text-gray-700'
                } hover:text-gray-900`}
              >
                {item.label}
                {item.subMenu && <ChevronDown className="inline ml-1" size={14} />}
              </Link>

              {item.subMenu && submenuAberto === item.label && (
                <ul className="absolute left-0 mt-1 w-40 bg-white rounded shadow-lg z-10">
                  {item.subMenu.map(sub => (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {sub.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <button
            onClick={handleLogout}
            className="mt-2 md:mt-0 md:ml-4 text-sm text-red-500"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
