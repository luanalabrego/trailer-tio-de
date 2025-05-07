// src/app/financeiro/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { db } from '@/firebase/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { Zap } from 'lucide-react'
import { Venda, Custo } from '@/types'

type VendaFirestore = Omit<Venda, 'id'>
type CustoFirestore = Omit<Custo, 'id'>
type AgendamentoFirestore = Omit<Venda, 'id'>
type CaixaFirestore = { valor: number; data: Timestamp }

export default function FinanceiroPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [custos, setCustos] = useState<Custo[]>([])
  const [caixas, setCaixas] = useState<CaixaFirestore[]>([])
  const [acessoNegado, setAcessoNegado] = useState(false)

  const hoje = new Date()
  const isoHoje = hoje.toISOString().slice(0, 10)

  const [dataInicio, setDataInicio] = useState<string>(isoHoje)
  const [dataFim, setDataFim] = useState<string>(isoHoje)
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')

  function parseLocalDate(str: string): Date {
    const [year, month, day] = str.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  useEffect(() => {
    const perfil = localStorage.getItem('perfil')
    if (perfil !== 'ADM') {
      setAcessoNegado(true)
      return
    }

    async function carregar() {
      const inicio = parseLocalDate(dataInicio)
      inicio.setHours(0, 0, 0, 0)
      const fim = parseLocalDate(dataFim)
      fim.setHours(23, 59, 59, 999)

      // VENDAS
      const snapV = await getDocs(query(
        collection(db, 'vendas'),
        where('data', '>=', Timestamp.fromDate(inicio)),
        where('data', '<=', Timestamp.fromDate(fim))
      ))
      const listaV = snapV.docs.map(d => ({ id: d.id, ...(d.data() as VendaFirestore) }))

      // AGENDAMENTOS como vendas
      const snapA = await getDocs(query(
        collection(db, 'agendamentos'),
        where('data', '>=', Timestamp.fromDate(inicio)),
        where('data', '<=', Timestamp.fromDate(fim))
      ))
      const listaA = snapA.docs.map(d => ({ id: d.id, ...(d.data() as AgendamentoFirestore) }))

      // filtra por método (ou mantém todos)
      const todasV = [...listaV, ...listaA].filter(v =>
        filtroMetodo === 'todos' || v.formaPagamento === filtroMetodo
      )
      setVendas(todasV)

      // CUSTOS
      const snapC = await getDocs(query(
        collection(db, 'custos'),
        where('data', '>=', Timestamp.fromDate(inicio)),
        where('data', '<=', Timestamp.fromDate(fim))
      ))
      setCustos(snapC.docs.map(d => ({ id: d.id, ...(d.data() as CustoFirestore) })))

      // CAIXA
      const snapCx = await getDocs(collection(db, 'caixa'))
      setCaixas(snapCx.docs.map(d => d.data() as CaixaFirestore))
    }

    carregar()
  }, [dataInicio, dataFim, filtroMetodo])

  // totais
  const totais = vendas.reduce(
    (acc, v) => {
      if (v.pago) acc.receita += v.total ?? 0
      else acc.pendente += v.total ?? 0
      return acc
    },
    { receita: 0, pendente: 0 }
  )
  const totalCustos = custos.reduce((sum, c) => sum + (c.valor ?? 0), 0)
  const totalCaixa = caixas.reduce((sum, c) => sum + (c.valor ?? 0), 0)
  const lucro = totais.receita - totalCustos
  const margem = totais.receita > 0 ? (lucro / totais.receita) * 100 : 0

  // soma geral de todas as vendas + agendamentos
  const totalGeral = vendas.reduce((sum, v) => sum + (v.total ?? 0), 0)

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        {acessoNegado ? (
          <div className="text-center text-red-600 font-semibold">
            Acesso negado — área restrita a administradores.
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Resumo Financeiro
            </h1>

            {/* filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={filtroMetodo}
                  onChange={e => setFiltroMetodo(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* único card: soma geral + pendente */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-white p-5 rounded-2xl shadow text-center flex flex-col items-center">
                <Zap size={32} className="text-indigo-600 mb-2" />
                <p className="font-medium mb-1">Total Geral (Vendas + Agend.)</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalGeral.toFixed(2)}
                </p>
                <p className="font-medium mt-2">Pendente: R$ {totais.pendente.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
