'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { Plus, Minus, X as Close, Search } from 'lucide-react'
import {
  listarEstoque,
  criarOuAtualizarItemEstoque,
  ajustarQuantidade,
  registrarHistoricoEstoque,
  EstoqueItem,
} from '@/lib/firebase-estoque'
import { listarProdutos } from '@/lib/firebase-produtos'
import type { RegistroEstoque, Produto } from '@/types'

export default function EstoquePage() {
  // todos os lotes do estoque
  const [itens, setItens] = useState<EstoqueItem[]>([])
  // produtos que controlam estoque
  const [produtos, setProdutos] = useState<Produto[]>([])

  // filtros e detalhes
  const [busca, setBusca] = useState('')
  const [detalhesVisiveis, setDetalhesVisiveis] = useState<string[]>([])

  // modais
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  // formulário de adicionar/atualizar
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('')
  const [quantidade, setQuantidade] = useState(0)
  const [validade, setValidade] = useState(new Date().toISOString().slice(0, 10))

  // formulário de remoção
  const [produtoRemover, setProdutoRemover] = useState<string>('')
  const [quantidadeRemover, setQuantidadeRemover] = useState(1)
  const [motivoRemocao, setMotivoRemocao] = useState('')

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    // carrega produtos que controlam estoque
    const todos = await listarProdutos()
    const ctrl = todos.filter(p => p.controlaEstoque)
    setProdutos(ctrl)

    // carrega lotes
    setItens(await listarEstoque())
  }

  // resumo agrupado por produtoId
  const resumo = useMemo(() => {
    const mapa = new Map<string, number>()
    itens.forEach(i =>
      mapa.set(i.produtoId, (mapa.get(i.produtoId) || 0) + i.quantidade)
    )
    return Array.from(mapa.entries()).map(([produtoId, total]) => {
      const p = produtos.find(x => x.id === produtoId)
      return {
        produtoId,
        nome: p?.nome ?? produtoId,
        unidade: p?.unidade ?? '',
        total,
      }
    })
  }, [itens, produtos])

  // filtro seguro contra undefined
  const termoBusca = busca.toLowerCase()
  const resumoFiltrado = useMemo(
    () =>
      resumo.filter(r =>
        r.nome.toLowerCase().includes(termoBusca) ||
        r.unidade.toLowerCase().includes(termoBusca)
      ),
    [resumo, termoBusca]
  )

  function toggleDetalhes(id: string) {
    setDetalhesVisiveis(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!produtoSelecionado) return
    const [y, m, d] = validade.split('-').map(Number)
    await criarOuAtualizarItemEstoque(
      produtoSelecionado,
      quantidade,
      new Date(),
      new Date(y, m - 1, d)
    )
    setShowAddModal(false)
    carregarTudo()
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault()
    if (!produtoRemover) return
    let remaining = quantidadeRemover

    // pega lotes do produto, por inserção
    const lotes = itens
      .filter(i => i.produtoId === produtoRemover)
      .sort(
        (a, b) =>
          a.inseridoEm.toDate().getTime() -
          b.inseridoEm.toDate().getTime()
      )

    for (const lote of lotes) {
      if (remaining <= 0) break
      const disponivel = lote.quantidade
      const deduzir = Math.min(disponivel, remaining)

      await ajustarQuantidade(lote.id, disponivel - deduzir)

      // registra nome legível no histórico
      const p = produtos.find(x => x.id === lote.produtoId)
      await registrarHistoricoEstoque({
        produtoId: lote.produtoId,
        nome: p?.nome ?? '',
        ajuste: -deduzir,
        motivo: motivoRemocao,
      } as Omit<RegistroEstoque, 'id'>)

      remaining -= deduzir
    }

    setShowRemoveModal(false)
    carregarTudo()
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0">Estoque</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <Plus size={18} /> Adicionar/Atualizar
            </button>
            <button
              onClick={() => setShowRemoveModal(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              <Minus size={18} /> Remover
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar item..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        {/* Resumo de Estoque */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-3">Resumo de Estoque</h2>
          <ul className="space-y-2">
            {resumoFiltrado.map(r => (
              <li key={r.produtoId} className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {r.nome} — {r.unidade} — Total: {r.total}
                  </span>
                  <button
                    onClick={() => toggleDetalhes(r.produtoId)}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    {detalhesVisiveis.includes(r.produtoId)
                      ? 'Ocultar detalhes'
                      : 'Ver detalhes'}
                  </button>
                </div>
                {detalhesVisiveis.includes(r.produtoId) && (
                  <ul className="mt-2 ml-4 space-y-1 text-sm">
                    {itens
                      .filter(i => i.produtoId === r.produtoId)
                      .map(item => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            Validade:{' '}
                            {item.validade.toDate().toLocaleDateString()}
                          </span>
                          <span>Qtd: {item.quantidade}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal Adicionar/Atualizar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <form
            onSubmit={handleAdd}
            className="p-6 rounded-xl shadow-lg w-full max-w-md bg-white space-y-4"
          >
            <h2 className="text-lg font-semibold">
              Adicionar / Atualizar Estoque
            </h2>

            <label className="flex flex-col text-sm text-gray-700">
              Produto
              <select
                value={produtoSelecionado}
                onChange={e => setProdutoSelecionado(e.target.value)}
                className="mt-1 p-2 border rounded"
                required
              >
                <option value="">Selecione…</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.unidade}
                  </option>
                ))}
              </select>
            </label>

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={e => setQuantidade(+e.target.value)}
              className="w-full p-2 border rounded"
              min={1}
              required
            />

            <label className="flex flex-col text-sm text-gray-700">
              Data de validade
              <input
                type="date"
                value={validade}
                onChange={e => setValidade(e.target.value)}
                className="mt-1 p-2 border rounded"
                required
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 flex items-center gap-1"
              >
                <Close size={16} /> Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
              >
                <Plus size={16} /> Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Remoção */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <form
            onSubmit={handleRemove}
            className="p-6 rounded-xl shadow-lg w-full max-w-md bg-white space-y-4"
          >
            <h2 className="text-lg font-semibold">Remover Estoque</h2>

            <label className="flex flex-col text-sm text-gray-700">
              Produto
              <select
                value={produtoRemover}
                onChange={e => setProdutoRemover(e.target.value)}
                className="mt-1 p-2 border rounded"
                required
              >
                <option value="">Selecione…</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.unidade}
                  </option>
                ))}
              </select>
            </label>

            <input
              type="number"
              placeholder="Quantidade a remover"
              value={quantidadeRemover}
              onChange={e => setQuantidadeRemover(+e.target.value)}
              className="w-full p-2 border rounded"
              min={1}
              required
            />

            <label className="flex flex-col text-sm text-gray-700">
              Motivo da remoção
              <textarea
                value={motivoRemocao}
                onChange={e => setMotivoRemocao(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                placeholder="Descreva o motivo"
                required
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 flex items-center gap-1"
              >
                <Close size={16} /> Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
              >
                <Minus size={16} /> Remover
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
