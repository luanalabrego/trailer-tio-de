// src/categorias/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import {
  listarCategorias,
  salvarCategoria,
  excluirCategoria,
} from '@/lib/firebase-categorias'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Categoria } from '@/types'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nome, setNome] = useState('')
  const [editarId, setEditarId] = useState<string | null>(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const lista = await listarCategorias()
    setCategorias(lista)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    try {
      await salvarCategoria({ id: editarId ?? undefined, nome: nome.trim() })
      setNome('')
      setEditarId(null)
      await carregar()
    } catch (err) {
      console.error('❌ categorias.erro salvando', err)
    }
  }

  function handleEditar(cat: Categoria) {
    setEditarId(cat.id)
    setNome(cat.nome)
  }

  function handleCancelar() {
    setEditarId(null)
    setNome('')
  }

  async function handleExcluir(id: string) {
    if (confirm('Deseja realmente excluir esta categoria?')) {
      await excluirCategoria(id)
      await carregar()
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Categorias</h1>

        <form onSubmit={handleSalvar} className="flex items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="Nome da categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded text-white flex items-center gap-1 ${
              editarId ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
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
          {editarId && (
            <button
              type="button"
              onClick={handleCancelar}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 flex items-center gap-1"
            >
              <X size={16} /> Cancelar
            </button>
          )}
        </form>

        <ul className="space-y-2">
          {categorias.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between bg-white p-3 rounded shadow"
            >
              <span className="text-gray-800 font-medium">{cat.nome}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditar(cat)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleExcluir(cat.id)}
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
