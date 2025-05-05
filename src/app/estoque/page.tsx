'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { listarEstoque, criarProduto, alterarEstoque } from '@/lib/firebase-estoque'

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false)
  const [mostrarRemover, setMostrarRemover] = useState(false)

  const [produtoSelecionado, setProdutoSelecionado] = useState('')
  const [produtoNovoNome, setProdutoNovoNome] = useState('')
  const [quantidade, setQuantidade] = useState(0)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const lista = await listarEstoque()
    setProdutos(lista)
  }

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (produtoNovoNome) {
      await criarProduto(produtoNovoNome, quantidade)
    } else if (produtoSelecionado) {
      await alterarEstoque(produtoSelecionado, quantidade)
    }
    reset()
    await carregar()
  }

  const handleRemover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!produtoSelecionado || !quantidade || !motivo.trim()) {
      alert('Preencha todos os campos.')
      return
    }
    await alterarEstoque(produtoSelecionado, -quantidade)
    reset()
    await carregar()
  }

  const reset = () => {
    setProdutoSelecionado('')
    setProdutoNovoNome('')
    setQuantidade(0)
    setMotivo('')
    setMostrarAdicionar(false)
    setMostrarRemover(false)
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Estoque</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMostrarAdicionar(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Adicionar Item
          </button>
          <button
            onClick={() => setMostrarRemover(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Remover Item
          </button>
        </div>

        <table className="w-full text-sm border rounded-xl overflow-hidden shadow">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Produto</th>
              <th className="p-3 text-center">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium text-gray-800">{p.nome}</td>
                <td className={`p-3 text-center font-bold ${p.estoque < 5 ? 'text-red-600' : 'text-gray-700'}`}>
                  {p.estoque ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Adicionar */}
      {mostrarAdicionar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Adicionar Estoque</h2>
            <form onSubmit={handleAdicionar} className="space-y-4">
              <label className="block text-sm font-medium">Selecione um produto existente</label>
              <select
                value={produtoSelecionado}
                onChange={(e) => setProdutoSelecionado(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">—</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              <label className="block text-sm font-medium">Ou digite um novo nome</label>
              <input
                type="text"
                value={produtoNovoNome}
                onChange={(e) => setProdutoNovoNome(e.target.value)}
                placeholder="Novo produto"
                className="w-full p-2 border rounded"
              />

              <input
                type="number"
                placeholder="Quantidade"
                value={quantidade || ''}
                onChange={(e) => setQuantidade(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />

              <div className="text-right">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Salvar
                </button>
                <button type="button" onClick={reset} className="ml-2 text-sm text-gray-600 hover:underline">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Remover */}
      {mostrarRemover && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Remover Estoque</h2>
            <form onSubmit={handleRemover} className="space-y-4">
              <label className="block text-sm font-medium">Selecione o produto</label>
              <select
                value={produtoSelecionado}
                onChange={(e) => setProdutoSelecionado(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">—</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Quantidade"
                value={quantidade || ''}
                onChange={(e) => setQuantidade(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />

              <textarea
                placeholder="Motivo da saída"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />

              <div className="text-right">
                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Remover
                </button>
                <button type="button" onClick={reset} className="ml-2 text-sm text-gray-600 hover:underline">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
