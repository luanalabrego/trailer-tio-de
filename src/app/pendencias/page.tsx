'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Venda } from '@/types'

export default function PendenciasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const snap = await getDocs(collection(db, 'vendas'))
    const pendentes = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Venda))
      .filter((v) => v.pago === false)

    setVendas(pendentes)
  }

  const confirmarPagamento = async (id: string) => {
    const ref = doc(db, 'vendas', id)
    await updateDoc(ref, { pago: true })
    await carregar()
  }

  const formatarData = (venda: Venda) => {
    try {
      return venda.data?.toDate?.().toLocaleString('pt-BR') || '—'
    } catch {
      return '—'
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Pagamentos Pendentes</h1>

        {vendas.length === 0 ? (
          <p className="text-gray-600 text-sm">Nenhum pagamento pendente no momento.</p>
        ) : (
          <ul className="space-y-4">
            {vendas.map((v) => (
              <li key={v.id} className="bg-white p-4 rounded-xl shadow border flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">
                    Cliente: {v.clienteId || '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: R$ {v.total?.toFixed(2)} | Forma: {v.formaPagamento}
                  </p>
                  <p className="text-sm text-gray-500">Data: {formatarData(v)}</p>
                </div>
                <button
                  onClick={() => confirmarPagamento(v.id)}
                  className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
                >
                  Marcar como Pago
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
