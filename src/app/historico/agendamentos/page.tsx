'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
} from 'firebase/firestore'
import { Agendamento, PedidoItem } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function HistoricoAgendamentosPage() {
  const [historico, setHistorico] = useState<
    (Agendamento & { finishedAt: Timestamp })[]
  >([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState<boolean>(false)

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    const snap = await getDocs(collection(db, 'agendamentos'))
    const todos = snap.docs.map(d => {
      const raw = d.data() as DocumentData
      const dataCriacaoTs: Timestamp =
        (raw.dataCriacao as Timestamp) ?? (raw.criadoEm as Timestamp)
      const finishedAt: Timestamp =
        (raw.finalizadoEm as Timestamp) ??
        (raw.canceladoEm as Timestamp) ??
        dataCriacaoTs

      return {
        id: d.id,
        nome: String(raw.nome),
        whatsapp: String(raw.whatsapp),
        dataHora: raw.dataHora as Timestamp | string | Date,
        dataCriacao: dataCriacaoTs,
        itens: raw.itens as PedidoItem[],
        formaPagamento: String(raw.formaPagamento),
        total: Number(raw.total),
        pago: Boolean(raw.pago),
        status: String(raw.status) as
          | 'pendente'
          | 'confirmado'
          | 'cancelado'
          | 'finalizado',
        localEntrega: raw.localEntrega ? String(raw.localEntrega) : undefined,
        observacao: raw.observacao ? String(raw.observacao) : undefined,
        finishedAt,
      }
    })

    setHistorico(
      todos.filter(a => a.status === 'cancelado' || a.status === 'finalizado')
    )
  }

  const filtered = useMemo(() => {
    return historico
      .filter(ag => {
        const fin =
          ag.finishedAt instanceof Timestamp
            ? ag.finishedAt.toDate()
            : new Date(ag.finishedAt)
        if (startDate) {
          const [y, m, d] = startDate.split('-').map(Number)
          const start = new Date(y, m - 1, d, 0, 0, 0, 0)
          if (fin < start) return false
        }
        if (endDate) {
          const [y, m, d] = endDate.split('-').map(Number)
          const end = new Date(y, m - 1, d, 23, 59, 59, 999)
          if (fin > end) return false
        }
        return true
      })
      .sort((a, b) => b.finishedAt.toMillis() - a.finishedAt.toMillis())
  }, [historico, startDate, endDate])

  function formatarData(dt?: Timestamp | string | Date): string {
    if (!dt) return 'Inválida'
    const date =
      dt instanceof Timestamp
        ? dt.toDate()
        : dt instanceof Date
        ? dt
        : new Date(dt)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <Header />

      <main className="pt-20 px-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Histórico de Agendamentos</h1>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            {showFilters ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </button>
        </div>

        {showFilters && (
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
        )}

        {filtered.length === 0 ? (
          <p className="text-gray-600">
            Nenhum agendamento no período selecionado.
          </p>
        ) : (
          <ul className="space-y-4">
            {filtered.map(ag => (
              <li
                key={ag.id}
                className="bg-white p-4 rounded-xl shadow flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold">
                    {ag.nome} — {formatarData(ag.dataHora)}
                  </p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      ag.status === 'finalizado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {ag.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-gray-600">
                  {ag.status === 'finalizado'
                    ? 'Finalizado em:'
                    : 'Cancelado em:'}{' '}
                  <strong>{formatarData(ag.finishedAt)}</strong>
                </p>

                <p className="text-sm">Itens:</p>
                <ul className="ml-4 list-disc text-sm">
                  {ag.itens.map(i => (
                    <li key={i.id}>
                      {i.nome} × {i.qtd} = R$ {(i.preco * i.qtd).toFixed(2)}
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-gray-600 mt-2">
                  Total do pedido: <strong>R$ {ag.total.toFixed(2)}</strong>
                </p>

                {ag.localEntrega && (
                  <p className="text-sm">
                    <strong>Entrega em:</strong> {ag.localEntrega}
                  </p>
                )}
                {ag.observacao && (
                  <p className="text-sm">
                    <strong>Obs:</strong> {ag.observacao}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
