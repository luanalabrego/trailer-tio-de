'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { RegistroEstoque } from '@/types'

export default function HistoricoEstoquePage() {
  const [registros, setRegistros] = useState<RegistroEstoque[]>([])

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    const col = collection(db, 'estoque_historico')
    const q = query(col, orderBy('criadoEm', 'desc'))
    const snap = await getDocs(q)
    const todos = snap.docs.map(docSnap => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        produtoId: String(data.produtoId),
        nome: String(data.nome),
        ajuste: Number(data.ajuste),
        motivo: String(data.motivo),
        criadoEm: data.criadoEm,
      } as RegistroEstoque
    })
    setRegistros(todos)
  }

  function formatarData(ts: { toDate(): Date }): string {
    return ts.toDate().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Histórico de Estoque</h1>

        {registros.length === 0 ? (
          <p className="text-gray-600">Nenhum registro de estoque.</p>
        ) : (
          <ul className="space-y-4">
            {registros.map(r => (
              <li
                key={r.id}
                className="bg-white p-4 rounded-xl shadow flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{r.nome}</span>
                  <span className="text-sm text-gray-600">
                    {formatarData(r.criadoEm)}
                  </span>
                </div>
                <p className="text-sm">
                  Ajuste:{' '}
                  <strong>
                    {r.ajuste > 0 ? `+${r.ajuste}` : r.ajuste}
                  </strong>
                </p>
                <p className="text-sm">
                  <strong>Motivo:</strong> {r.motivo}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
