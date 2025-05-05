'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  updateDoc,
  deleteDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Custo } from '@/types'
import { Pencil, Trash2, X as Close } from 'lucide-react'

export default function CustosPage() {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [custos, setCustos] = useState<Custo[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const snap = await getDocs(collection(db, 'custos'))
    const lista = snap.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        descricao: data.descricao as string,
        valor: Number(data.valor),
        data: data.data as Timestamp,
      }
    })
    setCustos(lista)
  }

  function formatarData(data: Timestamp) {
    try {
      return data.toDate().toLocaleString('pt-BR')
    } catch {
      return ''
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim() || !valor) return

    const valorNum = parseFloat(valor)
    if (editingId) {
      // atualizar custo existente
      const ref = doc(db, 'custos', editingId)
      await updateDoc(ref, {
        descricao: descricao.trim(),
        valor: valorNum,
        data: Timestamp.now(),
      })
    } else {
      // criar novo custo
      await addDoc(collection(db, 'custos'), {
        descricao: descricao.trim(),
        valor: valorNum,
        data: Timestamp.now(),
      })
    }

    // reset form
    setDescricao('')
    setValor('')
    setEditingId(null)
    await carregar()
  }

  function handleEditar(c: Custo) {
    setDescricao(c.descricao)
    setValor(String(c.valor))
    setEditingId(c.id)
  }

  async function handleExcluir(id: string) {
    if (
      !confirm(
        'Deseja realmente excluir este custo? Esta ação não pode ser desfeita.'
      )
    )
      return
    await deleteDoc(doc(db, 'custos', id))
    if (editingId === id) {
      // se estivermos editando o mesmo, cancelar edição
      setEditingId(null)
      setDescricao('')
      setValor('')
    }
    await carregar()
  }

  function handleCancelar() {
    setEditingId(null)
    setDescricao('')
    setValor('')
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Lançar Custos</h1>

        <form
          onSubmit={handleSalvar}
          className="flex flex-col sm:flex-row gap-4 mb-6 items-start"
        >
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

          <div className="flex gap-2">
            <button
              type="submit"
              className={`px-4 py-2 rounded text-white ${
                editingId
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {editingId ? 'Atualizar' : 'Adicionar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelar}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 flex items-center gap-1"
              >
                <Close size={16} /> Cancelar
              </button>
            )}
          </div>
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
              <div className="flex items-center gap-4">
                <p className="font-semibold text-red-600">
                  R$ {c.valor.toFixed(2)}
                </p>
                <button
                  onClick={() => handleEditar(c)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleExcluir(c.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
