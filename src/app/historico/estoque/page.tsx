'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  Timestamp,
  DocumentData,
  query,
  orderBy,
  where
} from 'firebase/firestore'
import { RegistroEstoque } from '@/types'

export default function HistoricoEstoquePage() {
  const [registros, setRegistros] = useState<RegistroEstoque[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    // Supondo que você tenha uma coleção "estoque_historico"
    const col = collection(db, 'estoque_historico')
    const q = query(col, orderBy('criadoEm', 'desc'))
    const snap = await getDocs(q)
    const todos = snap.docs.map(d => {
      const raw = d.data() as DocumentData
      return {
        id: d.id,
        produtoId: String(raw.produtoId),
        nome: String(raw.nome),
        ajuste: Number(raw.ajuste),         // + ou – unidades
        criadoEm: raw.criadoEm as Timestamp, // Timestamp.now() ao registrar
        motivo: raw.motivo ? String(raw.motivo) : undefined,
      } as RegistroEstoque
    })
    setRegistros(todos)
  }

  const filtered = useMemo(() => {
    return registros
      .filter(r => {
        const dt = r.criadoEm.toDate()
        if (startDate && dt < new Date(startDate)) return false
        if (endDate) {
          const e = new Date(endDate)
          e.setHours(23, 59, 59, 999)
          if (dt > e) return false
        }
        return true
      })
      .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis())
  }, [registros, startDate, endDate])

  function formatarData(ts: Timestamp) {
    return ts.toDate().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <Header />
      <main className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Histórico de Estoque</h1>

        {/* filtros de período */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mb-1">
              Data início
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full sm:w-48 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-1">
              Data fim
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full sm:w-48 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate('') }}
            className="h-fit px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Limpar filtros
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-600">Nenhum registro de estoque neste período.</p>
        ) : (
          <ul className="space-y-4">
            {filtered.map(r => (
              <li
                key={r.id}
                className="bg-white p-4 rounded-xl shadow flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{r.nome}</span>
                  <span className="text-sm text-gray-600">{formatarData(r.criadoEm)}</span>
                </div>
                <p className="text-sm">
                  Ajuste: <strong>{r.ajuste > 0 ? `+${r.ajuste}` : r.ajuste}</strong>
                </p>
                {r.motivo && <p className="text-sm">Motivo: {r.motivo}</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
