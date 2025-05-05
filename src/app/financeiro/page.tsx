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
import { CreditCard, DollarSign, Zap, Tag } from 'lucide-react'
import { Venda, Custo } from '@/types'

export default function FinanceiroPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [custos, setCustos] = useState<Custo[]>([])
  const [acessoNegado, setAcessoNegado] = useState(false)

  // Inicializa com hoje
  const hoje = new Date()
  const isoHoje = hoje.toISOString().slice(0, 10)

  // Filtros de data e método
  const [dataInicio, setDataInicio] = useState<string>(isoHoje)
  const [dataFim, setDataFim] = useState<string>(isoHoje)
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos')

  useEffect(() => {
    const perfil = localStorage.getItem('perfil')
    if (perfil !== 'ADM') {
      setAcessoNegado(true)
    } else {
      carregar()
    }
  }, [dataInicio, dataFim, filtroMetodo])

  async function carregar() {
    // converte strings para Date no início e fim do dia
    const inicio = new Date(dataInicio)
    inicio.setHours(0, 0, 0, 0)
    const fim = new Date(dataFim)
    fim.setHours(23, 59, 59, 999)

    // query de vendas no intervalo
    const qV = query(
      collection(db, 'vendas'),
      where('data', '>=', Timestamp.fromDate(inicio)),
      where('data', '<=', Timestamp.fromDate(fim))
    )
    const snapV = await getDocs(qV)
    let listaV: Venda[] = snapV.docs.map(d => ({
      id: d.id,
      ...(d.data() as any),
    } as Venda))

    // aplica filtro de método, se não for "todos"
    if (filtroMetodo !== 'todos') {
      listaV = listaV.filter(v => v.formaPagamento === filtroMetodo)
    }
    setVendas(listaV)

    // query de custos no mesmo intervalo
    const qC = query(
      collection(db, 'custos'),
      where('data', '>=', Timestamp.fromDate(inicio)),
      where('data', '<=', Timestamp.fromDate(fim))
    )
    const snapC = await getDocs(qC)
    setCustos(snapC.docs.map(d => ({
      id: d.id,
      ...(d.data() as any),
    } as Custo)))
  }

  // calcula totais geral
  const totais = vendas.reduce(
    (acc, v) => {
      if (v.pago) acc.receita += v.total || 0
      else acc.pendente += v.total || 0
      return acc
    },
    { receita: 0, pendente: 0 }
  )

  const totalCustos = custos.reduce((sum, c) => sum + (c.valor || 0), 0)
  const lucro = totais.receita - totalCustos
  const margem = totais.receita > 0 ? (lucro / totais.receita) * 100 : 0

  // resumo por método de pagamento
  const resumoPorMetodo = vendas.reduce<Record<string, number>>((acc, v) => {
    const m = v.formaPagamento || 'outro'
    acc[m] = (acc[m] || 0) + (v.total || 0)
    return acc
  }, {})

  // configurações dos cards
  const tipos = [
    { key: 'pix', label: 'Pix', Icon: Zap },
    { key: 'cartao', label: 'Cartão', Icon: CreditCard },
    { key: 'dinheiro', label: 'Dinheiro', Icon: DollarSign },
    { key: 'outro', label: 'Outro', Icon: Tag },
  ]

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
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  className="p-2 border rounded w-full"
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

            {/* resumo geral no topo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Recebido</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totais.receita.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Pendente</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {totais.pendente.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Custos</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {totalCustos.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Lucro</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {lucro.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Margem: {margem.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* cards de método de pagamento abaixo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tipos.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className="bg-white p-4 rounded-2xl shadow flex flex-col items-center"
                >
                  <Icon size={32} className="text-indigo-600 mb-2" />
                  <p className="font-medium">{label}</p>
                  <p className="text-2xl font-bold mt-1">
                    R$ {(resumoPorMetodo[key] || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
