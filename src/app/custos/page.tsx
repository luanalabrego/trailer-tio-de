'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Custo } from '@/types'

export default function CustosPage() {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [custos, setCustos] = useState<Custo[]>([])

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const snap = await getDocs(collection(db, 'custos'))
    const lista = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        descricao: data.descricao as string,
        valor: Number(data.valor),
        data: data.data as Timestamp,
      }
    })
    setCustos(lista)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor) return

    await addDoc(collection(db, 'custos'), {
      descricao,
      valor: parseFloat(valor),
      data: Timestamp.now()
    })

    setDescricao('')
    setValor('')
    await carregar()
  }

  const formatarData = (data: Timestamp) => {
    try {
      return data.toDate().toLocaleString('pt-BR')
    } catch {
      return ''
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Lançar Custos</h1>

        <form onSubmit={handleSalvar} className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="flex-1 p-2 border rounded"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Valor (R$)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-32 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Adicionar
          </button>
        </form>

        <ul className="space-y-2 text-sm">
          {custos.map((c) => (
            <li
              key={c.id}
              className="bg-white p-3 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-800">{c.descricao}</p>
                <p className="text-gray-500">Data: {formatarData(c.data)}</p>
              </div>
              <p className="font-semibold text-red-600">
                R$ {parseFloat(String(c.valor)).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
