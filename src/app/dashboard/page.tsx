'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { listarVendasDoDia, listarHistoricoVendas } from '@/lib/firebase-caixa'
import { listarEstoque } from '@/lib/firebase-estoque'
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import type { Agendamento, PedidoItem, Venda } from '@/types'

export default function Dashboard() {
  const router = useRouter()

  // cards
  const [hojeStats, setHojeStats] = useState({ valor: 0, count: 0 })
  const [ontemStats, setOntemStats] = useState({ valor: 0, count: 0 })
  const [estoqueBaixoList, setEstoqueBaixoList] = useState<Array<{ id: string; nome: string; quantidade: number }>>([])
  const [agendHojeList, setAgendHojeList] = useState<Agendamento[]>([])
  const [agingPendList, setAgingPendList] = useState<Array<{ id: string; created: Date; total: number }>>([])

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const now = new Date()
    const hojeStr = now.toISOString().slice(0,10)
    // stats de hoje
    const vendasHoje = await listarVendasDoDia()
    const vendidosHoje = vendasHoje.filter(v => v.pago)
    setHojeStats({
      count: vendidosHoje.length,
      valor: +vendidosHoje.reduce((sum, v) => sum + v.total, 0).toFixed(2),
    })
    // stats de ontem
    const ontem = new Date(now); ontem.setDate(ontem.getDate() - 1)
    const startOntem = Timestamp.fromDate(new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 0,0,0))
    const endOntem   = Timestamp.fromDate(new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23,59,59,999))
    const snapOntem = await getDocs(query(
      collection(db,'vendas'),
      where('criadoEm','>=', startOntem),
      where('criadoEm','<=', endOntem),
    ))
    const listOntem: Venda[] = snapOntem.docs.map(d=>({ id: d.id, ...(d.data() as Omit<Venda,'id'>) }))
    const vendidosOntem = listOntem.filter(v=> v.pago)
    setOntemStats({
      count: vendidosOntem.length,
      valor: +vendidosOntem.reduce((sum,v)=> sum + v.total,0).toFixed(2),
    })

    // estoque baixo
    const estoque = await listarEstoque()
    const baixo = estoque.filter(p=> p.quantidade < 5)
    setEstoqueBaixoList( abaixo => baixo.map(p=>({
      id: p.id, nome: p.nome, quantidade: p.quantidade
    })))

    // agendamentos de hoje
    const snapA = await getDocs(collection(db,'agendamentos'))
    const rawA = snapA.docs.map(d=> d.data() as Agendamento)
    const agHoje = rawA.filter(a=>{
      const dt = a.dataHora instanceof Timestamp
        ? a.dataHora.toDate()
        : a.dataHora instanceof Date
        ? a.dataHora
        : new Date(a.dataHora)
      return dt.toISOString().slice(0,10) === hojeStr && a.status !== 'cancelado'
    })
    setAgendHojeList(agHoje)

    // aging pendentes > 10 dias
    const hist = await listarHistoricoVendas()
    const tenDays = new Date(); tenDays.setDate(tenDays.getDate()-10)
    const pendAging = hist
      .filter(v=> !v.pago && v.clienteId) // pendente
      .filter(v=>{
        const dt = v.criadoEm instanceof Timestamp
          ? v.criadoEm.toDate()
          : new Date(v.criadoEm)
        return dt < tenDays
      })
      .map(v=>({
        id: v.id,
        created: v.criadoEm instanceof Timestamp
          ? v.criadoEm.toDate()
          : new Date(v.criadoEm),
        total: v.total
      }))
    setAgingPendList(pendAging)
  }

  const cards = [
    {
      title: 'Vendas Ontem',
      value: `${ontemStats.count} pedido${ontemStats.count!==1?'s':''} • R$ ${ontemStats.valor.toFixed(2)}`,
      bg: 'bg-purple-100',
      route: '/caixa',
    },
    {
      title: 'Vendas Hoje',
      value: `${hojeStats.count} pedido${hojeStats.count!==1?'s':''} • R$ ${hojeStats.valor.toFixed(2)}`,
      bg: 'bg-green-100',
      route: '/caixa',
    },
    {
      title: 'Estoque Baixo',
      value: `${estoqueBaixoList.length} produto${estoqueBaixoList.length!==1?'s':''}`,
      bg: 'bg-yellow-100',
      route: '/estoque',
    },
    {
      title: 'Pendências >10 dias',
      value: `${agingPendList.length} pedido${agingPendList.length!==1?'s':''}`,
      bg: 'bg-red-100',
      route: '/pagamentos-pendentes',
    },
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 px-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* cards summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((c,i)=>(
            <div
              key={i}
              onClick={()=>router.push(c.route)}
              className={`${c.bg} cursor-pointer p-6 rounded-xl shadow hover:shadow-lg transition`}
            >
              <h2 className="text-gray-700 text-sm font-medium">{c.title}</h2>
              <p className="text-2xl font-bold text-gray-900 mt-2">{c.value}</p>
            </div>
          ))}
        </div>

        {/* agendamentos de hoje */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
          {agendHojeList.length === 0 ? (
            <p className="text-gray-500">Nenhum agendamento para hoje.</p>
          ) : (
            <ul className="space-y-2">
              {agendHojeList.map(a => {
                const dt = a.dataHora instanceof Timestamp
                  ? a.dataHora.toDate()
                  : a.dataHora instanceof Date
                  ? a.dataHora
                  : new Date(a.dataHora)
                return (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.nome}</span>
                    <span className="text-sm text-gray-600">{dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* produtos com estoque baixo */}
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

        {/* aging pendências */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Pendências Antigas (>10 dias)</h2>
          {agingPendList.length === 0 ? (
            <p className="text-gray-500">Sem pendências antigas.</p>
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
