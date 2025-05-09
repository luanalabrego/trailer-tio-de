'use client'

import { useEffect, useState, useMemo } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  onSnapshot,
  query,
  orderBy,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import Header from '@/components/Header'
import { Custo } from '@/types'
import { Plus, Pencil, Trash2, X as Close, Search as SearchIcon } from 'lucide-react'

export default function CustosPage() {
  const [custos, setCustos] = useState<Custo[]>([])
  const [showModal, setShowModal] = useState(false)
  const [tipo, setTipo] = useState('Mercado')
  const [descricaoLivre, setDescricaoLivre] = useState('')
  const [valor, setValor] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date()
    // primeiro dia do mês (local)
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  })
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )

  // realtime listener
  useEffect(() => {
    const q = query(collection(db, 'custos'), orderBy('data', 'desc'))
    const unsub = onSnapshot(
      q,
      snap => {
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
      },
      err => {
        console.error('Erro no realtime de custos:', err)
        alert('Não foi possível sincronizar os custos.')
      }
    )
    return () => unsub()
  }, [])

  function formatarData(ts: Timestamp) {
    return ts.toDate().toLocaleDateString('pt-BR')
  }

  const custosFiltrados = useMemo(() => {
    // parsing local das datas
    const [y1, m1, d1] = startDate.split('-').map(Number)
    const inicio = new Date(y1, m1 - 1, d1, 0, 0, 0, 0)
    const [y2, m2, d2] = endDate.split('-').map(Number)
    const fim = new Date(y2, m2 - 1, d2, 23, 59, 59, 999)

    return custos.filter(c => {
      const dt = c.data.toDate()
      return (
        dt >= inicio &&
        dt <= fim &&
        c.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [custos, searchTerm, startDate, endDate])

  function abrirModal(c?: Custo) {
    if (c) {
      setEditingId(c.id)
      setTipo('Outro')
      setDescricaoLivre(c.descricao)
      setValor(String(c.valor))
    } else {
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
    if (!desc) return alert('Informe a descrição.')
    if (!valor) return alert('Informe o valor.')

    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0)
      return alert('Valor inválido.')

    setSaving(true)
    try {
      if (editingId) {
        await updateDoc(doc(db, 'custos', editingId), {
          descricao: desc,
          valor: valorNum,
          data: Timestamp.now(),
        })
        alert('Custo atualizado com sucesso!')
      } else {
        await addDoc(collection(db, 'custos'), {
          descricao: desc,
          valor: valorNum,
          data: Timestamp.now(),
        })
        alert('Custo registrado com sucesso!')
      }
      setShowModal(false)
    } catch (err) {
      console.error('Erro ao salvar custo:', err)
      alert('Falha ao salvar custo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este custo?')) return
    try {
      await deleteDoc(doc(db, 'custos', id))
      alert('Custo excluído!')
    } catch (err) {
      console.error('Erro ao excluir custo:', err)
      alert('Falha ao excluir custo.')
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-6 xl:px-0 max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Custos</h1>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 bg-white border border-indigo-600 text-indigo-600 px-5 py-3 rounded-xl hover:bg-indigo-50 transition"
          >
            <Plus size={20} /> Registrar Custo
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <SearchIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar custos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div className="flex gap-4">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <ul className="space-y-4">
          {custosFiltrados.map(c => (
            <li
              key={c.id}
              className="bg-white p-5 rounded-2xl shadow flex justify-between items-center"
            >
              <div>
                <p className="text-lg font-medium text-gray-800">{c.descricao}</p>
                <p className="text-sm text-gray-500 mt-1">{formatarData(c.data)}</p>
              </div>
              <div className="flex items-center space-x-4">
                <p className="text-xl font-semibold text-red-600">
                  R$ {c.valor.toFixed(2)}
                </p>
                <button onClick={() => abrirModal(c)} className="text-indigo-600 hover:text-indigo-800">
                  <Pencil size={20} />
                </button>
                <button onClick={() => handleExcluir(c.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Editar Custo' : 'Novo Custo'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <Close size={24} className="text-gray-600 hover:text-gray-800" />
              </button>
            </div>
            <form onSubmit={handleSalvar} className="space-y-5">
              <div>
                <label className="block mb-1 text-gray-700">Tipo de Custo</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
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
                  <label className="block mb-1 text-gray-700">Descrição</label>
                  <input
                    type="text"
                    value={descricaoLivre}
                    onChange={e => setDescricaoLivre(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block mb-1 text-gray-700">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 transition flex items-center gap-1"
                >
                  <Close size={16} /> Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
