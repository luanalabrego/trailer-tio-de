'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import {
  listarCategorias,
  salvarCategoria,
  excluirCategoria,
} from '@/lib/firebase-categorias'
import { Pencil, Plus, Trash2 } from 'lucide-react'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [editarId, setEditarId] = useState<string | null>(null)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const lista = await listarCategorias()
    setCategorias(lista)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    try {
      await salvarCategoria({ id: editarId, nome })
      setNome('')
      setEditarId(null)
      await carregar()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
    }
  }

  const handleEditar = (categoria: any) => {
    setEditarId(categoria.id)
    setNome(categoria.nome)
  }

  const handleExcluir = async (id: string) => {
    const confirmar = confirm('Deseja realmente excluir esta categoria?')
    if (confirmar) {
      await excluirCategoria(id)
      await carregar()
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Categorias</h1>

        <form onSubmit={handleSalvar} className="flex gap-2 mb-6">
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
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={18} />
            {editarId ? 'Atualizar' : 'Salvar'}
          </button>
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
