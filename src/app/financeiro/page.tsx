'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { db } from '@/firebase/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { CreditCard, DollarSign, Zap, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import type { Venda, Custo } from '@/types'

type VendaFirestore = Omit<Venda, 'id'> & { status?: string }
type CustoFirestore = Omit<Custo, 'id'>
type CaixaFirestore = { valor: number; data: Timestamp }

export default function FinanceiroPage() {
  const [vendas, setVendas] = useState<(Venda & { status?: string })[]>([])
  const [custos, setCustos] = useState<Custo[]>([])
  const [caixas, setCaixas] = useState<CaixaFirestore[]>([])
  const [acessoNegado, setAcessoNegado] = useState(false)
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date(); d.setHours(0,0,0,0)
    return d.toISOString().slice(0,10)
  })
  const [dataFim, setDataFim] = useState<string>(() => {
    const d = new Date(); d.setHours(23,59,59,999)
    return d.toISOString().slice(0,10)
  })
  const [filtroMetodo, setFiltroMetodo] = useState<'todos'|'pix'|'cartao'|'dinheiro'|'outro'>('todos')
  const [showFilters, setShowFilters] = useState(false)

  function parseLocalDate(str: string, endOfDay = false): Date {
    const [y, m, d] = str.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (endOfDay) date.setHours(23,59,59,999)
    return date
  }

  useEffect(() => {
    const perfil = localStorage.getItem('perfil')
    if (perfil !== 'ADM') {
      setAcessoNegado(true)
      return
    }
    async function carregar() {
      const inicioTs = Timestamp.fromDate(parseLocalDate(dataInicio))
      const fimTs    = Timestamp.fromDate(parseLocalDate(dataFim, true))

      // 1) vendas "normais"
      const snapV = await getDocs(query(
        collection(db, 'vendas'),
        where('criadoEm', '>=', inicioTs),
        where('criadoEm', '<=', fimTs),
      ))
      const listaV = snapV.docs.map(d => ({
        id: d.id,
        ...(d.data() as VendaFirestore),
        status: 'venda',
      }))

      // 2) agendamentos, somente finalizados ou pendentes
      const snapA = await getDocs(query(
        collection(db, 'agendamentos'),
        where('dataHora', '>=', inicioTs),
        where('dataHora', '<=', fimTs),
      ))
      const listaA = snapA.docs
        .map(d => {
          const raw = d.data() as VendaFirestore
          return {
            id: d.id,
            ...raw,
            status: raw.status,          // pode ser 'pendente' | 'finalizado' | 'cancelado'
          }
        })
        .filter(a => a.status !== 'cancelado')

      // 3) unir e deduplicar
      const todas = [...listaV, ...listaA]
      const mapById = new Map<string, typeof todas[number]>()
      todas.forEach(v => { if (!mapById.has(v.id)) mapById.set(v.id, v) })
      const uni = Array.from(mapById.values())

      // 4) filtro por método
      const vendFilt = uni.filter(v =>
        filtroMetodo === 'todos' || v.formaPagamento === filtroMetodo
      )
      setVendas(vendFilt)

      // 5) custos
      const snapC = await getDocs(query(
        collection(db, 'custos'),
        where('data', '>=', inicioTs),
        where('data', '<=', fimTs),
      ))
      setCustos(snapC.docs.map(d => ({ id: d.id, ...(d.data() as CustoFirestore) })))

      // 6) caixa (filtrar também)
      const snapCx = await getDocs(query(
        collection(db, 'caixa'),
        where('data', '>=', inicioTs),
        where('data', '<=', fimTs),
        orderBy('data', 'asc'),
      ))
      setCaixas(snapCx.docs.map(d => d.data() as CaixaFirestore))
    }
    carregar()
  }, [dataInicio, dataFim, filtroMetodo])

  // cálculos
  const totais = vendas.reduce(
    (acc, v) => {
      const isPaid = v.pago || v.status === 'finalizado'
      if (isPaid) acc.receita += v.total ?? 0
      else acc.pendente += v.total ?? 0
      return acc
    },
    { receita: 0, pendente: 0 }
  )
  const totalCustos = custos.reduce((sum, c) => sum + (c.valor ?? 0), 0)
  const totalCaixa  = caixas.reduce((sum, c) => sum + (c.valor ?? 0), 0)
  const lucro    = totais.receita - totalCustos
  const margem   = totais.receita > 0 ? (lucro / totais.receita) * 100 : 0
  const pendCount = vendas.filter(v => !(v.pago || v.status === 'finalizado')).length

  const resumoPorMetodo = useMemo(() => {
    const base = { pix: 0, cartao: 0, dinheiro: 0, outro: 0 }
    return vendas.reduce((acc, v) => {
      const m = v.formaPagamento as keyof typeof base
      acc[m] = (acc[m] || 0) + (v.total ?? 0)
      return acc
    }, base)
  }, [vendas])

  const metodos = [
    { key: 'pix',     label: 'Pix',     Icon: Zap,         color: 'text-green-600' },
    { key: 'cartao',  label: 'Cartão',  Icon: CreditCard,  color: 'text-blue-600'  },
    { key: 'dinheiro',label: 'Dinheiro',Icon: DollarSign,  color: 'text-yellow-500'},
    { key: 'outro',   label: 'Outro',   Icon: Tag,         color: 'text-gray-600' },
  ]

  if (acessoNegado) {
    return (
      <>
        <Header />
        <div className="pt-20 px-4 max-w-4xl mx-auto text-center text-red-600 font-semibold">
          Acesso negado — área restrita a administradores.
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Resumo Financeiro</h1>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            {showFilters ? <ChevronUp/> : <ChevronDown/>}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Forma de Pagamento</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filtroMetodo}
                onChange={e => setFiltroMetodo(e.target.value as any)}
              >
                <option value="todos">Todos</option>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow text-center">
            <p className="text-sm text-gray-500">Recebido</p>
            <p className="text-2xl font-bold text-green-600">R$ {totais.receita.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow text-center">
            <p className="text-sm text-gray-500">Pendente</p>
            <p className="text-2xl font-bold text-red-600">R$ {totais.pendente.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">{pendCount} pedidos</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow text-center">
            <p className="text-sm text-gray-500">Custos</p>
            <p className="text-2xl font-bold text-orange-600">R$ {totalCustos.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow text-center">
            <p className="text-sm text-gray-500">Caixa</p>
            <p className="text-2xl font-bold text-blue-600">R$ {totalCaixa.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow text-center mb-6">
          <p className="text-sm text-gray-500">Lucro</p>
          <p className="text-2xl font-bold text-indigo-600">R$ {lucro.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-1">Margem: {margem.toFixed(1)}%</p>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumo por Método de Pagamento</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metodos.map(({ key, label, Icon, color }) => (
            <div key={key} className="bg-white p-5 rounded-2xl shadow flex flex-col items-center">
              <Icon size={32} className={`${color} mb-2`} />
              <p className="font-medium">{label}</p>
              <p className="text-2xl font-bold mt-1">R$ {resumoPorMetodo[key as keyof typeof resumoPorMetodo].toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
