'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { Pencil, Trash2, X as Close, Search as SearchIcon } from 'lucide-react'

export default function CustosPage() {
  // estados do form/modal
  const [showModal, setShowModal] = useState(false)
  const [tipo, setTipo] = useState('Mercado')
  const [descricaoLivre, setDescricaoLivre] = useState('')
  const [valor, setValor] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // estados de dados
  const [custos, setCustos] = useState<Custo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date()
    return now.toISOString().slice(0, 10)
  })

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
    return data.toDate().toLocaleDateString('pt-BR')
  }

  // filtra a lista de custos por busca e intervalo de datas
  const custosFiltrados = useMemo(() => {
    const inicio = new Date(startDate)
    const fim = new Date(endDate)
    fim.setHours(23, 59, 59)
    return custos.filter((c) => {
      const d = c.data.toDate()
      const matchDate = d >= inicio && d <= fim
      const matchSearch = c.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      return matchDate && matchSearch
    })
  }, [custos, searchTerm, startDate, endDate])

  // abre modal para novo registro ou edição
  function abrirModal(c?: Custo) {
    if (c) {
      // editar
      setEditingId(c.id)
      setTipo('Outro')
      setDescricaoLivre(c.descricao)
      setValor(String(c.valor))
    } else {
      // novo
      setEditingId(null)
      setTipo('Mercado')
      setDescricaoLivre('')
      setValor('')
    }
    setShowModal(true)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    const desc = tipo === 'Outro' ? descricaoLivre.trim() : tipo
    if (!desc || !valor) return

    const valorNum = parseFloat(valor)
    if (editingId) {
      await updateDoc(doc(db, 'custos', editingId), {
        descricao: desc,
        valor: valorNum,
        data: Timestamp.now(),
      })
    } else {
      await addDoc(collection(db, 'custos'), {
        descricao: desc,
        valor: valorNum,
        data: Timestamp.now(),
      })
    }

    setShowModal(false)
    await carregar()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja realmente excluir este custo?')) return
    await deleteDoc(doc(db, 'custos', id))
    await carregar()
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Custos</h1>
          <button
            onClick={() => abrirModal()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Registrar Custo
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar custos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2 py-2 w-full border rounded"
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded"
          />
        </div>

        <ul className="space-y-2 text-sm">
          {custosFiltrados.map((c) => (
            <li
              key={c.id}
              className="bg-white p-4 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-800">{c.descricao}</p>
                <p className="text-gray-500">{formatarData(c.data)}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-red-600">R$ {c.valor.toFixed(2)}</p>
                <button onClick={() => abrirModal(c)} className="text-indigo-600 hover:text-indigo-800">
                  <Pencil size={18} />
                </button>
                <button onClick={() => handleExcluir(c.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar Custo' : 'Novo Custo'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <Close size={20} />
              </button>
            </div>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block mb-1">Tipo de Custo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option>Mercado</option>
                  <option>Gás</option>
                  <option>Funcionário</option>
                  <option>Gasolina</option>
                  <option>Outro</option>
                </select>
              </div>
              {tipo === 'Outro' && (
                <div>
                  <label className="block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={descricaoLivre}
                    onChange={(e) => setDescricaoLivre(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
