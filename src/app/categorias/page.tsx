'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import {
  listarCategorias,
  salvarCategoria,
  excluirCategoria,
} from '@/lib/firebase-categorias'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'
import { Categoria } from '@/types'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [showModal, setShowModal] = useState(false)
  const [nome, setNome] = useState('')
  const [editarId, setEditarId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCategorias(await listarCategorias())
  }

  function abrirModalNovo() {
    setEditarId(null)
    setNome('')
    setShowModal(true)
  }

  function abrirModalEdicao(cat: Categoria) {
    setEditarId(cat.id)
    setNome(cat.nome)
    setShowModal(true)
  }

  function fecharModal() {
    setEditarId(null)
    setNome('')
    setShowModal(false)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    const nomeTrim = nome.trim()
    if (!nomeTrim) return

    const existe = categorias.some(
      c =>
        c.nome.toLowerCase() === nomeTrim.toLowerCase() &&
        c.id !== editarId
    )
    if (existe) {
      alert('Já existe uma categoria com este nome.')
      return
    }

    try {
      await salvarCategoria({ id: editarId ?? undefined, nome: nomeTrim })
      await carregar()
      fecharModal()
    } catch (err) {
      console.error('❌ categorias.erro salvando', err)
      alert('Erro ao salvar categoria.')
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja realmente excluir esta categoria?')) return
    try {
      await excluirCategoria(id)
      await carregar()
    } catch (err) {
      console.error('❌ categorias.erro excluindo', err)
      alert('Erro ao excluir categoria.')
    }
  }

  const categoriasFiltradas = useMemo(
    () =>
      categorias.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase())
      ),
    [categorias, busca]
  )

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-2xl mx-auto">

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 transition"
          >
            <Plus size={18} />
            Nova Categoria
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600" size={18} />
          <input
            type="text"
            placeholder="Buscar categoria..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <ul className="space-y-2">
          {categoriasFiltradas.map(cat => (
            <li
              key={cat.id}
              className="flex items-center justify-between bg-white p-3 rounded shadow"
            >
              <span className="text-gray-800 font-medium">{cat.nome}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirModalEdicao(cat)}
                  className="text-indigo-600 hover:text-indigo-800"
                  title="Editar"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleExcluir(cat.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editarId ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <form onSubmit={handleSalvar} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-600"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md flex items-center gap-1"
                  >
                    <X size={16} /> Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-md text-white flex items-center gap-1 ${
                      editarId
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {editarId ? (
                      <>
                        <Pencil size={16} /> Atualizar
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Salvar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
