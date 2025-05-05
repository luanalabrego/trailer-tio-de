'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { Header } from '@/components/Header' // 👈 Importa o Header

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const snap = await getDocs(collection(db, 'agendamentos'))
    const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    setAgendamentos(lista)
  }

  const atualizarStatus = async (id: string, status: string) => {
    const ref = doc(db, 'agendamentos', id)
    await updateDoc(ref, {
      status,
      confirmado: status === 'confirmado'
    })
    await carregar()
  }

  const formatarData = (dt: string) => {
    try {
      return new Date(dt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    } catch {
      return dt
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Agendamentos</h1>

        <ul className="space-y-4">
          {agendamentos.map((ag) => (
            <li
              key={ag.id}
              className={`bg-white p-4 rounded-xl shadow border ${
                ag.status === 'confirmado'
                  ? 'border-green-500'
                  : ag.status === 'cancelado'
                  ? 'border-red-500'
                  : 'border-yellow-400'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-800">{ag.nome}</p>
                  <p className="text-sm text-gray-600">📞 {ag.whatsapp}</p>
                  <p className="text-sm text-gray-600">🗓 {formatarData(ag.dataHora)}</p>
                  <p className="text-sm text-gray-600">💳 {ag.formaPagamento}</p>
                </div>
                <div className="flex gap-2">
                  {ag.status !== 'confirmado' && (
                    <button
                      onClick={() => atualizarStatus(ag.id, 'confirmado')}
                      className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
                    >
                      Confirmar
                    </button>
                  )}
                  {ag.status !== 'cancelado' && (
                    <button
                      onClick={() => atualizarStatus(ag.id, 'cancelado')}
                      className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              <ul className="text-sm text-gray-700 mb-2">
                {ag.itens?.map((item: any, i: number) => (
                  <li key={i}>
                    - {item.nome} × {item.qtd} = R$ {(item.preco * item.qtd).toFixed(2)}
                  </li>
                ))}
              </ul>

              <div className="text-right font-semibold text-indigo-600">
                Total: R$ {ag.total?.toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
