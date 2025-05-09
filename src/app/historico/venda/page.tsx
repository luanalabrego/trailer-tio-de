'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { listarHistoricoVendas } from '@/lib/firebase-caixa'
import type { Venda, PedidoItem } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { Search } from 'lucide-react'

export default function HistoricoVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [orderSearch, setOrderSearch] = useState<string>('')

  useEffect(() => {
    async function carregarTodasVendas() {
      const todas = await listarHistoricoVendas()
      setVendas(todas)
    }
    carregarTodasVendas()
  }, [])

  const filtered = useMemo(() => {
    return vendas
      .filter(v => {
        // filtro por número do pedido
        if (orderSearch) {
          const num = v.orderNumber?.toString() ?? ''
          if (!num.includes(orderSearch)) return false
        }

        // converte criadoEm para Date
        const dt =
          v.criadoEm instanceof Timestamp
            ? v.criadoEm.toDate()
            : new Date(v.criadoEm)

        // filtro por data início (interpreta como local)
        if (startDate) {
          const [y, m, d] = startDate.split('-').map(Number)
          const start = new Date(y, m - 1, d, 0, 0, 0, 0)
          if (dt < start) return false
        }

        // filtro por data fim (interpreta como local)
        if (endDate) {
          const [y, m, d] = endDate.split('-').map(Number)
          const end = new Date(y, m - 1, d, 23, 59, 59, 999)
          if (dt > end) return false
        }

        return true
      })
      .sort((a, b) => {
        const ta =
          a.criadoEm instanceof Timestamp
            ? a.criadoEm.toMillis()
            : new Date(a.criadoEm).getTime()
        const tb =
          b.criadoEm instanceof Timestamp
            ? b.criadoEm.toMillis()
            : new Date(b.criadoEm).getTime()
        return tb - ta
      })
  }, [vendas, startDate, endDate, orderSearch])

  function formatarData(dt?: Timestamp | Date | string) {
    if (!dt) return '—'
    let date: Date
    if (dt instanceof Timestamp) date = dt.toDate()
    else if (typeof dt === 'string') date = new Date(dt)
    else date = dt
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Histórico de Vendas</h1>

        {/* busca por número do pedido */}
        <div className="bg-white p-4 rounded-xl shadow mb-4 relative">
          <label
            htmlFor="orderSearch"
            className="text-sm font-medium text-gray-700 mb-1 block"
          >
            Pedido Nº
          </label>
          <Search
            size={16}
            className="absolute left-6 top-12 text-gray-400"
          />
          <input
            id="orderSearch"
            type="text"
            placeholder="Buscar nº do pedido"
            value={orderSearch}
            onChange={e => setOrderSearch(e.target.value)}
            className="w-full pl-10 p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* filtros de período lado a lado */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-4 items-end overflow-x-auto">
          <div className="flex-1 min-w-[140px]">
            <label
              htmlFor="startDate"
              className="text-sm font-medium text-gray-700 mb-1 block"
            >
              Data início
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label
              htmlFor="endDate"
              className="text-sm font-medium text-gray-700 mb-1 block"
            >
              Data fim
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-600">
            Nenhuma venda registrada com esses critérios.
          </p>
        ) : (
          <ul className="space-y-4">
            {filtered.map(v => (
              <li
                key={v.id}
                className="bg-white p-4 rounded-xl shadow flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">
                      Pedido Nº: {v.orderNumber ?? v.id}
                    </span>
                    <p className="text-sm text-gray-600">
                      Data do pedido:{' '}
                      <strong>{formatarData(v.criadoEm)}</strong>
                    </p>
                  </div>
                </div>

                <ul className="ml-4 list-disc text-sm">
                  {v.itens.map((i: PedidoItem) => (
                    <li key={i.id}>
                      {i.nome} × {i.qtd} = R$ {(i.preco * i.qtd).toFixed(2)}
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-gray-600">
                  Total: <strong>R$ {v.total.toFixed(2)}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Status: <strong>{v.pago ? 'Pago' : 'Pendente'}</strong>
                </p>
                {v.pago && v.formaPagamento && (
                  <p className="text-sm text-gray-600">
                    Forma de pagamento:{' '}
                    <strong>{v.formaPagamento}</strong>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
