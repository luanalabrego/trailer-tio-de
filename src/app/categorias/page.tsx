'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import {
  listarCategorias,
  salvarCategoria,
  excluirCategoria,
} from '@/lib/firebase-categorias'
import { Plus, Pencil, Trash2, X as Close, Search as SearchIcon } from 'lucide-react'
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
      fecharModal()
      return
    }

    try {
      await salvarCategoria({ id: editarId ?? undefined, nome: nomeTrim })
      await carregar()
      fecharModal()
    } catch (err) {
      console.error('Erro ao salvar categoria', err)
      alert('Erro ao salvar categoria.')
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja realmente excluir esta categoria?')) return
    try {
      await excluirCategoria(id)
      await carregar()
    } catch (err) {
      console.error('Erro ao excluir categoria', err)
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
      <div className="pt-20 px-6 xl:px-0 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Categorias</h1>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <Plus size={20} />
            Nova Categoria
          </button>
        </div>

        <div className="relative mb-8">
          <SearchIcon
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-600"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar categoria..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <ul className="space-y-4">
          {categoriasFiltradas.map(cat => (
            <li
              key={cat.id}
              className="bg-white p-5 rounded-2xl shadow flex justify-between items-center"
            >
              <span className="text-lg font-medium text-gray-800">{cat.nome}</span>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => abrirModalEdicao(cat)}
                  className="text-indigo-600 hover:text-indigo-800 transition"
                  title="Editar"
                >
                  <Pencil size={20} />
                </button>
                <button
                  onClick={() => handleExcluir(cat.id)}
                  className="text-red-500 hover:text-red-700 transition"
                  title="Excluir"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {editarId ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button onClick={fecharModal}>
                <Close size={24} className="text-gray-600 hover:text-gray-800 transition" />
              </button>
            </div>
            <form onSubmit={handleSalvar} className="space-y-5">
              <input
                type="text"
                placeholder="Nome da categoria"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition flex items-center gap-1"
                >
                  <Close size={16} />
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white flex items-center gap-1 ${
                    editarId ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                  } focus:outline-none focus:ring-2 transition`}
                >
                  {editarId ? (
                    <>
                      <Pencil size={16} />
                      Atualizar
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
