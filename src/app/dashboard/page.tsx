'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { listarVendasDoDia } from '@/lib/firebase-caixa'
import { listarEstoque } from '@/lib/firebase-estoque'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { Agendamento } from '@/types'

export default function Dashboard() {
  const router = useRouter()

  const [totalCaixa, setTotalCaixa] = useState(0)
  const [estoqueBaixo, setEstoqueBaixo] = useState(0)
  const [agendamentosHoje, setAgendamentosHoje] = useState(0)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    // Total em caixa (pagos)
    const vendas = await listarVendasDoDia()
    const total = vendas
      .filter(v => v.pago)
      .reduce((acc, v) => acc + v.total, 0)
    setTotalCaixa(total)

    // Estoque baixo
    const estoque = await listarEstoque()
    const abaixo = estoque.filter(p => p.estoque < 5).length
    setEstoqueBaixo(abaixo)

    // Agendamentos do dia
    const snap = await getDocs(collection(db, 'agendamentos'))
    const hoje = new Date().toISOString().slice(0, 10)
    const doDia = snap.docs
      .map(doc => doc.data() as Agendamento)
      .filter(a => a.dataHora.startsWith(hoje)).length
    setAgendamentosHoje(doDia)
  }

  const cards = [
    {
      title: 'Total em Caixa (Hoje)',
      value: `R$ ${totalCaixa.toFixed(2)}`,
      bg: 'bg-green-100',
      route: '/caixa',
    },
    {
      title: 'Estoque Baixo',
      value: `${estoqueBaixo} produto${estoqueBaixo !== 1 ? 's' : ''}`,
      bg: 'bg-yellow-100',
      route: '/estoque',
    },
    {
      title: 'Pedidos do Dia',
      value: `${agendamentosHoje} agendado${agendamentosHoje !== 1 ? 's' : ''}`,
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
