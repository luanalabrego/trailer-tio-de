'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
} from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Agendamento, PedidoItem } from '@/types'

export default function HistoricoAgendamentosPage() {
  const [historico, setHistorico] = useState<Agendamento[]>([])

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    const snap = await getDocs(collection(db, 'agendamentos'))
    const todos = snap.docs.map(d => {
      const raw = d.data() as DocumentData
      const dataCriacaoTs: Timestamp =
        (raw.dataCriacao as Timestamp) ?? (raw.criadoEm as Timestamp)

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
      } as Agendamento
    })

    // mantém só cancelados e finalizados
    setHistorico(
      todos.filter(
        a => a.status === 'cancelado' || a.status === 'finalizado'
      )
    )
  }

  function formatarData(dt?: Timestamp | string | Date): string {
    if (!dt) return 'Inválida'
    const date =
      dt instanceof Timestamp
        ? dt.toDate()
        : dt instanceof Date
        ? dt
        : new Date(dt)
    if (isNaN(date.getTime())) return 'Inválida'
    return date.toLocaleString('pt-BR', {
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
          <p className="text-gray-600">
            Nenhum agendamento concluído ou cancelado.
          </p>
        ) : (
          <ul className="space-y-4">
            {historico.map(ag => (
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
                  Total: <strong>R$ {ag.total.toFixed(2)}</strong>
                </p>

                <p className="text-sm">Itens:</p>
                <ul className="ml-4 list-disc text-sm">
                  {ag.itens.map(i => (
                    <li key={i.id}>
                      {i.nome} × {i.qtd} = R$ {(i.preco * i.qtd).toFixed(2)}
                    </li>
                  ))}
                </ul>

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
      </div>
    </>
  )
}
