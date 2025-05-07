'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/Header'
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  Table,
  LayoutGrid,
  Search,
} from 'lucide-react'
import Image from 'next/image'
import {
  listarProdutos,
  salvarProduto,
  excluirProduto,
} from '@/lib/firebase-produtos'
import { listarCategorias } from '@/lib/firebase-categorias'
import { Produto, Categoria } from '@/types'

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
  const [categorias, setCategorias] = useState<Categoria[]>([])

  // novos estados para busca e filtro
  const [busca, setBusca] = useState('')
  const [filtroCat, setFiltroCat] = useState<string | null>(null)

  useEffect(() => {
    carregarProdutos()
    carregarCategorias()
  }, [])

  async function carregarProdutos() {
    const lista = await listarProdutos()
    setProdutos(lista)
  }

  async function carregarCategorias() {
    const lista = await listarCategorias()
    setCategorias(lista)
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

  const abrirModalEdicao = (p: Produto) => {
    setModoEdicao(true)
    setProdutoSelecionado(p)
    setNome(p.nome)
    setCategoria(p.categoria)
    setPreco(String(p.preco))
    setUnidade(p.unidade)
    setImagem(null)
    setMostrarModal(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !categoria || !preco || !unidade) return

    try {
      await salvarProduto(
        {
          id: produtoSelecionado?.id,
          nome: nome.trim(),
          categoria,
          preco: parseFloat(preco),
          unidade,
          imagemUrl: produtoSelecionado?.imagemUrl || '',
        },
        imagem ?? undefined
      )
      setMostrarModal(false)
      await carregarProdutos()
    } catch (erro) {
      console.error('❌ produtos.erro salvarProduto', erro)
      alert('Erro ao salvar produto. Verifique o console.')
    }
  }

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      await excluirProduto(id)
      await carregarProdutos()
    }
  }

  // produtos filtrados por busca e categoria
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
      const matchCat = filtroCat ? p.categoria === filtroCat : true
      return matchBusca && matchCat
    })
  }, [produtos, busca, filtroCat])

  // categorias que aparecem na listagem
  const categoriasVisiveis = useMemo(() => {
    return categorias
      .map(c => c.nome)
      .filter((cat, i, arr) =>
        produtosFiltrados.some(p => p.categoria === cat) && arr.indexOf(cat) === i
      )
  }, [categorias, produtosFiltrados])

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setModoLista(!modoLista)}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200"
              title="Alternar lista/grade"
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

        {/* Busca e filtros */}
        <div className="flex flex-wrap gap-2 items-center mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 p-2 border rounded-md"
            />
          </div>
          <select
            value={filtroCat ?? ''}
            onChange={e => setFiltroCat(e.target.value || null)}
            className="p-2 border rounded-md"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.nome}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Agrupamento por categoria */}
        {categoriasVisiveis.map(cat => (
          <section key={cat} className="mb-8">
            <h2 className="text-xl font-semibold text-indigo-600 mb-4">{cat}</h2>

            {modoLista ? (
              <table className="w-full text-left border rounded-xl overflow-hidden shadow-md mb-4">
                <thead className="bg-gray-100 text-sm text-gray-700">
                  <tr>
                    <th className="p-3">Nome</th>
                    <th className="p-3">Unidade</th>
                    <th className="p-3">Preço</th>
                    <th className="p-3">Imagem</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados
                    .filter(p => p.categoria === cat)
                    .map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium text-gray-800">{p.nome}</td>
                        <td className="p-3">{p.unidade}</td>
                        <td className="p-3">R$ {p.preco.toFixed(2)}</td>
                        <td className="p-3">
                          {p.imagemUrl && (
                            <Image
                              src={p.imagemUrl}
                              alt={p.nome}
                              width={40}
                              height={40}
                              className="object-cover rounded"
                            />
                          )}
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <button
                            onClick={() => abrirModalEdicao(p)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleExcluir(p.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {produtosFiltrados
                  .filter(p => p.categoria === cat)
                  .map(produto => (
                    <div
                      key={produto.id}
                      className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition relative"
                    >
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => abrirModalEdicao(produto)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleExcluir(produto.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      {produto.imagemUrl && (
                        <Image
                          src={produto.imagemUrl}
                          alt={produto.nome}
                          width={500}
                          height={200}
                          className="w-full h-32 object-cover mb-2 rounded"
                        />
                      )}
                      <h2 className="font-bold text-lg text-gray-800">{produto.nome}</h2>
                      <p className="text-sm text-gray-800 mt-2">
                        {produto.unidade} — R$ {produto.preco.toFixed(2)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        ))}

        {/* Modal de cadastro/edição */}
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
                  onChange={e => setNome(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Selecione a categoria</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Preço"
                  value={preco}
                  onChange={e => setPreco(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
                <select
                  value={unidade}
                  onChange={e => setUnidade(e.target.value)}
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
                    onChange={e => setImagem(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {imagem && (
                  <p className="text-sm text-gray-600">Imagem: {imagem.name}</p>
                )}
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
