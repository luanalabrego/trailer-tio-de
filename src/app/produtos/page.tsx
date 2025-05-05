'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { Plus, Upload, Pencil, Trash2, Table, LayoutGrid } from 'lucide-react'
import {
  listarProdutos,
  salvarProduto,
  excluirProduto,
} from '@/lib/firebase-produtos'
import { Produto } from '@/types'

export default function ProdutosPage() {
  const [modoLista, setModoLista] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [unidade, setUnidade] = useState('')
  const [imagem, setImagem] = useState<File | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    const lista = await listarProdutos()
    setProdutos(lista)
  }

  const abrirModalNovo = () => {
    setModoEdicao(false)
    setProdutoSelecionado(null)
    setNome('')
    setCategoria('')
    setPreco('')
    setUnidade('')
    setImagem(null)
    setMostrarModal(true)
  }

  const abrirModalEdicao = (produto: Produto) => {
    setModoEdicao(true)
    setProdutoSelecionado(produto)
    setNome(produto.nome)
    setCategoria(produto.categoria)
    setPreco(String(produto.preco))
    setUnidade(produto.unidade)
    setImagem(null)
    setMostrarModal(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await salvarProduto(
        {
          id: produtoSelecionado?.id,
          nome,
          categoria,
          preco,
          unidade,
          imagemUrl: produtoSelecionado?.imagemUrl || '',
        },
        imagem
      )

      setMostrarModal(false)
      await carregarProdutos()
    } catch (erro) {
      console.error('Erro ao salvar produto:', erro)
      alert('Erro ao salvar produto. Verifique o console.')
    }
  }

  const handleExcluir = async (produtoId: string) => {
    const confirmar = confirm('Deseja realmente excluir este produto?')
    if (confirmar) {
      await excluirProduto(produtoId)
      await carregarProdutos()
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setModoLista(!modoLista)}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200"
            >
              {modoLista ? <LayoutGrid size={18} /> : <Table size={18} />}
            </button>
            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
            >
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        </div>

        {modoLista ? (
          <table className="w-full text-left border rounded-xl overflow-hidden shadow-md">
            <thead className="bg-gray-100 text-sm text-gray-700">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Imagem</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium text-gray-800">{p.nome}</td>
                  <td className="p-3">{p.categoria}</td>
                  <td className="p-3">{p.unidade}</td>
                  <td className="p-3">R$ {p.preco.toFixed(2)}</td>
                  <td className="p-3">
                    {p.imagemUrl && (
                      <img src={p.imagemUrl} alt={p.nome} className="w-10 h-10 object-cover rounded" />
                    )}
                  </td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => abrirModalEdicao(p)} className="text-indigo-600 hover:text-indigo-800">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleExcluir(p.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition relative"
              >
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={() => abrirModalEdicao(produto)} className="text-indigo-600 hover:text-indigo-800">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleExcluir(produto.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </div>
                {produto.imagemUrl && (
                  <img src={produto.imagemUrl} alt={produto.nome} className="w-full h-32 object-cover mb-2 rounded" />
                )}
                <h2 className="font-bold text-lg text-gray-800">{produto.nome}</h2>
                <p className="text-sm text-gray-600">{produto.categoria}</p>
                <p className="text-sm text-gray-800 mt-2">
                  {produto.unidade} — R$ {produto.preco.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl relative">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {modoEdicao ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <form onSubmit={handleSalvar} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Selecione a categoria</option>
                  <option value="Lanches">Lanches</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Salgados">Salgados</option>
                </select>

                <input
                  type="number"
                  placeholder="Preço"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Selecione a unidade</option>
                  <option value="un">Unidade</option>
                  <option value="porção">Porção</option>
                  <option value="kg">Kg</option>
                  <option value="ml">ml</option>
                </select>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                  <Upload size={18} />
                  <span>Selecionar Imagem</span>
                  <input
                    type="file"
                    onChange={(e) => setImagem(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {imagem && <p className="text-sm text-gray-600">Imagem: {imagem.name}</p>}
                <div className="text-right">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Salvar Produto
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModal(false)}
                    className="ml-2 px-4 py-2 text-sm text-gray-600 hover:underline"
                  >
                    Cancelar
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
