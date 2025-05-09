'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Agendamento } from '@/types'

export default function HistoricoAgendamentosPage() {
  const [historico, setHistorico] = useState<Agendamento[]>([])

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    const snap = await getDocs(collection(db, 'agendamentos'))
    const todos = snap.docs.map(d => {
      const raw = d.data() as DocumentData
      return {
        id: d.id,
        nome: String(raw.nome),
        dataHora: raw.dataHora as Timestamp | string | Date,
        dataCriacao:
          (raw.dataCriacao as Timestamp) ?? (raw.criadoEm as Timestamp),
        itens: raw.itens as PedidoItem[],
        formaPagamento: String(raw.formaPagamento),
        total: Number(raw.total),
        pago: Boolean(raw.pago),
        status: raw.status as 'pendente' | 'confirmado' | 'cancelado' | 'finalizado',
        localEntrega: raw.localEntrega ? String(raw.localEntrega) : undefined,
        observacao: raw.observacao ? String(raw.observacao) : undefined,
      } as Agendamento
    })
    // só cancelados e finalizados
    setHistorico(todos.filter(a => a.status === 'cancelado' || a.status === 'finalizado'))
  }

  function formatarData(dt?: Timestamp | string | Date) {
    if (!dt) return 'Inválida'
    const date =
      dt instanceof Timestamp
        ? dt.toDate()
        : dt instanceof Date
        ? dt
        : new Date(dt)
    return isNaN(date.getTime())
      ? 'Inválida'
      : date.toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Histórico de Agendamentos</h1>
        {historico.length === 0 ? (
          <p className="text-gray-600">Nenhum agendamento concluído ou cancelado.</p>
        ) : (
          <ul className="space-y-4">
            {historico.map(ag => (
              <li key={ag.id} className="bg-white p-4 rounded-xl shadow">
                <p className="font-semibold">
                  {ag.nome} — {formatarData(ag.dataHora)}
                </p>
                <p className="text-sm text-gray-600">
                  Status:{' '}
                  <span
                    className={
                      ag.status === 'finalizado'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {ag.status.toUpperCase()}
                  </span>
                </p>
                <p className="mt-2">
                  Total: <strong>R$ {ag.total.toFixed(2)}</strong>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
