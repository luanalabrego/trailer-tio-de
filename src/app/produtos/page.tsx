'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Header from '@/components/Header'
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
  const [mlVolume, setMlVolume] = useState('')
  const [controlaEstoque, setControlaEstoque] = useState(false)
  const [disponivel, setDisponivel] = useState(true)
  const [imagem, setImagem] = useState<File | null>(null)

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [busca, setBusca] = useState('')
  const [filtroCat, setFiltroCat] = useState<string | null>(null)

  useEffect(() => {
    carregarProdutos()
    carregarCategorias()
  }, [])

  async function carregarProdutos() {
    setProdutos(await listarProdutos())
  }

  async function carregarCategorias() {
    setCategorias(await listarCategorias())
  }

  const abrirModalNovo = () => {
    setModoEdicao(false)
    setProdutoSelecionado(null)
    setNome('')
    setCategoria('')
    setPreco('')
    setUnidade('')
    setMlVolume('')
    setControlaEstoque(false)
    setDisponivel(true)
    setImagem(null)
    setMostrarModal(true)
  }

  const abrirModalEdicao = (p: Produto) => {
    setModoEdicao(true)
    setProdutoSelecionado(p)
    setNome(p.nome)
    setCategoria(p.categoria)
    setPreco(String(p.preco))
    if (p.unidade.endsWith(' ml')) {
      setUnidade('ml')
      setMlVolume(p.unidade.replace(' ml', ''))
    } else {
      setUnidade(p.unidade)
      setMlVolume('')
    }
    setControlaEstoque(p.controlaEstoque ?? false)
    setDisponivel(p.disponivel ?? true)
    setImagem(null)
    setMostrarModal(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !categoria || !preco || !unidade) return

    const unidadeFinal =
      unidade === 'ml' ? `${mlVolume.trim()} ml` : unidade

    try {
      await salvarProduto(
        {
          id: produtoSelecionado?.id,
          nome: nome.trim(),
          categoria,
          preco: parseFloat(preco),
          unidade: unidadeFinal,
          controlaEstoque,
          disponivel,
          imagemUrl: produtoSelecionado?.imagemUrl || '',
        },
        imagem ?? undefined
      )
      setMostrarModal(false)
      carregarProdutos()
    } catch (erro) {
      console.error('❌ produtos.erro salvarProduto', erro)
      alert('Erro ao salvar produto. Verifique o console.')
    }
  }

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      await excluirProduto(id)
      carregarProdutos()
    }
  }

  const handleToggleDisponivel = async (p: Produto) => {
    if (p.controlaEstoque) return
    try {
      await salvarProduto(
        {
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          preco: p.preco,
          unidade: p.unidade,
          controlaEstoque: p.controlaEstoque ?? false,
          estoque: p.estoque,            // pode ser undefined
          disponivel: !p.disponivel,     // invertendo aqui
          imagemUrl: p.imagemUrl || '',  // garante string
        },
        undefined
      )
      carregarProdutos()
    } catch (err) {
      console.error('❌ erro ao salvar toggle disponivel', err)
      alert('Falha ao atualizar disponibilidade. Veja o console.')
    }
  }

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
      const matchCat = filtroCat ? p.categoria === filtroCat : true
      const visivel = p.controlaEstoque || p.disponivel
      return matchBusca && matchCat && visivel
    })
  }, [produtos, busca, filtroCat])

  const categoriasVisiveis = useMemo(() => {
    return Array.from(new Set(
      produtosFiltrados.map(p => p.categoria)
    ))
  }, [produtosFiltrados])

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-6xl mx-auto">
        {/* cabeçalho */}
        <div className="flex justify-between items-center mb-4">
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
              className="flex items-center gap-2 bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 transition"
            >
              <Plus size={18} /> Novo Produto
            </button>
          </div>
        </div>

        {/* busca e filtro */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-600"
            />
          </div>
          <select
            value={filtroCat ?? ''}
            onChange={e => setFiltroCat(e.target.value || null)}
            className="p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.nome}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        {/* lista por categoria */}
        {categoriasVisiveis.map(cat => (
          <section key={cat} className="mb-8">
            <h2 className="text-xl font-semibold text-indigo-600 mb-4">
              {cat}
            </h2>

            {modoLista ? (
              <table className="w-full text-left border rounded-xl overflow-hidden shadow-md mb-4">
                <thead className="bg-gray-100 text-sm text-gray-700">
                  <tr>
                    <th className="p-3">Nome</th>
                    <th className="p-3">Unidade</th>
                    <th className="p-3">Estoque?</th>
                    <th className="p-3">Disponível?</th>
                    <th className="p-3">Preço</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados
                    .filter(p => p.categoria === cat)
                    .map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium text-gray-800">
                          {p.nome}
                        </td>
                        <td className="p-3">{p.unidade}</td>
                        <td className="p-3">
                          {p.controlaEstoque ? '✔️' : '–'}
                        </td>
                        <td className="p-3">
                          {!p.controlaEstoque && (
                            <button
                              onClick={() => handleToggleDisponivel(p)}
                              className={`px-2 py-1 rounded ${
                                p.disponivel
                                  ? 'bg-green-200'
                                  : 'bg-gray-200'
                              }`}
                            >
                              {p.disponivel ? 'Sim' : 'Não'}
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          R$ {p.preco.toFixed(2)}
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
                        {!produto.controlaEstoque && (
                          <button
                            onClick={() =>
                              handleToggleDisponivel(produto)
                            }
                            className={`w-4 h-4 rounded-full ${
                              produto.disponivel
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                          />
                        )}
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
                      <h2 className="font-bold text-lg text-gray-800">
                        {produto.nome}
                      </h2>
                      <p className="text-sm text-gray-800 mt-2">
                        {produto.unidade} — R$ {produto.preco.toFixed(2)}
                      </p>
                      {produto.controlaEstoque && (
                        <span className="mt-1 inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          controla estoque
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </section>
        ))}

        {/* modal cadastro/edição */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
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
                  className="w-full p-2 border border-gray-200 rounded-md"
                  required
                />
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md"
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
                  className="w-full p-2 border border-gray-200 rounded-md"
                  required
                />
                <select
                  value={unidade}
                  onChange={e => setUnidade(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md"
                  required
                >
                  <option value="">Selecione a unidade</option>
                  <option value="un">Unidade</option>
                  <option value="porção">Porção</option>
                  <option value="kg">Kg</option>
                  <option value="ml">ml</option>
                </select>
                {unidade === 'ml' && (
                  <input
                    type="number"
                    placeholder="Quantidade em ml"
                    value={mlVolume}
                    onChange={e => setMlVolume(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-md"
                    required
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={controlaEstoque}
                    onChange={e => setControlaEstoque(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">
                    Controlar estoque
                  </span>
                </label>
                {!controlaEstoque && (
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      Disponível
                    </span>
                    <button
                      type="button"
                      onClick={() => setDisponivel(v => !v)}
                      className={`px-2 py-1 rounded ${
                        disponivel
                          ? 'bg-green-200'
                          : 'bg-gray-200'
                      }`}
                    >
                      {disponivel ? 'Sim' : 'Não'}
                    </button>
                  </label>
                )}
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200">
                    <Upload size={18} />
                    <span>Selecionar Imagem</span>
                    <input
                      type="file"
                      onChange={e => setImagem(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {imagem && (
                    <p className="text-sm text-gray-600 mt-1">
                      Imagem: {imagem.name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
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
