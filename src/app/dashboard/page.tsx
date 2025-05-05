'use client'

import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'

export default function Dashboard() {
  const router = useRouter()

  const cards = [
    {
      title: 'Total em Caixa (Hoje)',
      value: 'R$ 520,00',
      bg: 'bg-green-100',
      route: '/caixa',
    },
    {
      title: 'Estoque Baixo',
      value: '3 produtos',
      bg: 'bg-yellow-100',
      route: '/estoque',
    },
    {
      title: 'Pedidos do Dia',
      value: '5 agendados',
      bg: 'bg-blue-100',
      route: '/agendamentos',
    },
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <div
              key={index}
              onClick={() => router.push(card.route)}
              className={`cursor-pointer p-5 rounded-xl shadow-md hover:shadow-lg transition ${card.bg}`}
            >
              <h2 className="text-gray-700 text-sm font-medium">{card.title}</h2>
              <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
