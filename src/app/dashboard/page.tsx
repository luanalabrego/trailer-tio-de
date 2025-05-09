'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { listarVendasDoDia, listarHistoricoVendas } from '@/lib/firebase-caixa'
import { listarEstoque } from '@/lib/firebase-estoque'
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { listarProdutos } from '@/lib/firebase-produtos'
import type { Agendamento, Venda } from '@/types'

export default function Dashboard() {
  const router = useRouter()

  const [hojeStats, setHojeStats] = useState({ valor: 0, count: 0 })
  const [ontemStats, setOntemStats] = useState({ valor: 0, count: 0 })
  const [estoqueBaixoList, setEstoqueBaixoList] = useState<
    { id: string; nome: string; quantidade: number }[]
  >([])
  const [agendHojeList, setAgendHojeList] = useState<Agendamento[]>([])
  const [agingPendList, setAgingPendList] = useState<
    { id: string; created: Date; total: number }[]
  >([])

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const now = new Date()
    const hojeStr = now.toISOString().slice(0, 10)

    // --- Vendas de hoje ---
    const vendasHoje = await listarVendasDoDia()
    const pagosHoje = vendasHoje.filter(v => v.pago)
    setHojeStats({
      count: pagosHoje.length,
      valor: +pagosHoje.reduce((sum, v) => sum + v.total, 0).toFixed(2),
    })

    // --- Vendas de ontem ---
    const ontem = new Date(now)
    ontem.setDate(ontem.getDate() - 1)
    const inicioOntem = Timestamp.fromDate(
      new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 0, 0, 0)
    )
    const fimOntem = Timestamp.fromDate(
      new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59, 999)
    )
    const snapOntem = await getDocs(
      query(
        collection(db, 'vendas'),
        where('criadoEm', '>=', inicioOntem),
        where('criadoEm', '<=', fimOntem)
      )
    )
    const listOntem: Venda[] = snapOntem.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Venda, 'id'>),
    }))
    const pagosOntem = listOntem.filter(v => v.pago)
    setOntemStats({
      count: pagosOntem.length,
      valor: +pagosOntem.reduce((sum, v) => sum + v.total, 0).toFixed(2),
    })

    // --- Estoque crítico ---
const estoque = await listarEstoque()
const produtos = await listarProdutos()        // ← busco TODOS os produtos
const baixo = estoque.filter(p => p.quantidade < 5)

setEstoqueBaixoList(
  baixo.map(p => {
    // tento achar o produto correspondente
    const prod = produtos.find(prod => prod.id === p.produtoId)
    return {
      id: p.id,
      nome: prod?.nome ?? `ID:${p.produtoId}`,  // se não achar, exibe o próprio ID
      quantidade: p.quantidade,
    }
  })
)


    // --- Agendamentos de hoje ---
    const snapA = await getDocs(collection(db, 'agendamentos'))
    const rawA = snapA.docs.map(d => d.data() as Agendamento)
    const agHoje = rawA.filter(a => {
      if (a.status === 'cancelado') return false
      const dt =
        a.dataHora instanceof Timestamp
          ? a.dataHora.toDate()
          : a.dataHora instanceof Date
          ? a.dataHora
          : new Date(a.dataHora)
      return dt.toISOString().slice(0, 10) === hojeStr
    })
    setAgendHojeList(agHoje)

    // --- Aging de pendências >10 dias ---
    const hist = await listarHistoricoVendas()
    const dezDias = new Date()
    dezDias.setDate(dezDias.getDate() - 10)
    const pendAging = hist
      .filter(v => !v.pago)
      .filter(v => {
        const dt =
          v.criadoEm instanceof Timestamp
            ? v.criadoEm.toDate()
            : new Date(v.criadoEm)
        return dt < dezDias
      })
      .map(v => ({
        id: v.id,
        created:
          v.criadoEm instanceof Timestamp
            ? v.criadoEm.toDate()
            : new Date(v.criadoEm),
        total: v.total,
      }))
    setAgingPendList(pendAging)
  }

  const cards = [
    {
      title: 'Vendas Ontem',
      value: `${ontemStats.count} pedido${ontemStats.count !== 1 ? 's' : ''} • R$ ${ontemStats.valor.toFixed(2)}`,
      bg: 'bg-purple-100',
      route: '/caixa',
    },
    {
      title: 'Vendas Hoje',
      value: `${hojeStats.count} pedido${hojeStats.count !== 1 ? 's' : ''} • R$ ${hojeStats.valor.toFixed(2)}`,
      bg: 'bg-green-100',
      route: '/caixa',
    },
    {
      title: 'Estoque Crítico',
      value: `${estoqueBaixoList.length} produto${estoqueBaixoList.length !== 1 ? 's' : ''}`,
      bg: 'bg-yellow-100',
      route: '/estoque',
    },
    {
      title: 'Pendências de Pagamento >10 dias',
      value: `${agingPendList.length} pedido${agingPendList.length !== 1 ? 's' : ''}`,
      bg: 'bg-red-100',
      route: '/pendencias',    },
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 px-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Cards principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((c, i) => (
            <div
              key={i}
              onClick={() => router.push(c.route)}
              className={`${c.bg} cursor-pointer p-6 rounded-xl shadow hover:shadow-lg transition`}
            >
              <h2 className="text-gray-700 text-sm font-medium">{c.title}</h2>
              <p className="text-2xl font-bold text-gray-900 mt-2">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Agendamentos de hoje */}
<div className="bg-white p-6 rounded-xl shadow mb-8">
  <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
  {agendHojeList.length === 0 ? (
    <p className="text-gray-500">Nenhum agendamento para hoje.</p>
  ) : (
    <ul className="space-y-2">
      {agendHojeList.map(a => {
        const dt =
          a.dataHora instanceof Timestamp
            ? a.dataHora.toDate()
            : a.dataHora instanceof Date
            ? a.dataHora
            : new Date(a.dataHora)
        return (
          <li key={a.id} className="flex justify-between">
            <span>{a.nome}</span>
            <span className="text-sm text-gray-600">
              {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        )
      })}
    </ul>
  )}
</div>


        {/* Estoque Crítico */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Estoque Crítico</h2>
          {estoqueBaixoList.length === 0 ? (
            <p className="text-gray-500">Nenhum produto abaixo do estoque mínimo.</p>
          ) : (
            <ul className="space-y-2">
              {estoqueBaixoList.map(p => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.nome}</span>
                  <span className="text-sm text-red-600">{p.quantidade} restante</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Aging de Pendências */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Pendências de Pagamento (&gt;10 dias)</h2>
          {agingPendList.length === 0 ? (
            <p className="text-gray-500">Sem pendências de pagamento antigas.</p>
          ) : (
            <ul className="space-y-2">
              {agingPendList.map(v => (
                <li key={v.id} className="flex justify-between">
                  <span>Pedido #{v.id}</span>
                  <span className="text-sm text-gray-600">
                    {v.created.toLocaleDateString('pt-BR')} • R$ {v.total.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
