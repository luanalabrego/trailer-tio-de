'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { RegistroEstoque } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function HistoricoEstoquePage() {
  const [registros, setRegistros] = useState<RegistroEstoque[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState<boolean>(false)

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

  const filtered = useMemo(() => {
    return registros
      .filter(r => {
        const dt = r.criadoEm.toDate()
        if (startDate) {
          const [y, m, d] = startDate.split('-').map(Number)
          const start = new Date(y, m - 1, d, 0, 0, 0, 0)
          if (dt < start) return false
        }
        if (endDate) {
          const [y, m, d] = endDate.split('-').map(Number)
          const end = new Date(y, m - 1, d, 23, 59, 59, 999)
          if (dt > end) return false
        }
        return true
      })
      .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis())
  }, [registros, startDate, endDate])

  function formatarData(ts: { toDate(): Date }): string {
    return ts.toDate().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <Header />

      <main className="pt-20 px-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Histórico de Estoque</h1>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            {showFilters ? <ChevronUp /> : <ChevronDown />}
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
          <p className="text-gray-600">Nenhum registro de estoque.</p>
        ) : (
          <ul className="space-y-4">
            {filtered.map(r => (
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
      </main>
    </>
  )
}
