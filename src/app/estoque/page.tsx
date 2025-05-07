'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/Header'
import { Plus, Minus, X as Close } from 'lucide-react'
import {
  listarEstoque,
  criarOuAtualizarItemEstoque,
  ajustarQuantidade,
  EstoqueItem,
} from '@/lib/firebase-estoque'

export default function EstoquePage() {
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  // adicionar/atualizar
  const [isNewItem, setIsNewItem] = useState(false)
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState(0)
  const [validade, setValidade] = useState(
    new Date().toISOString().slice(0, 10)
  )

  // remoção
  const [nomeRemover, setNomeRemover] = useState('')
  const [quantidadeRemover, setQuantidadeRemover] = useState(1)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setItens(await listarEstoque())
  }

  const nomesUnicos = useMemo(
    () => Array.from(new Set(itens.map(i => i.nome))),
    [itens]
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()

    // usa data de hoje como inserção
    const dataInsercao = new Date()

    const [y2, m2, d2] = validade.split('-').map(Number)
    const dataValidade = new Date(y2, m2 - 1, d2)

    await criarOuAtualizarItemEstoque(
      nome.trim(),
      quantidade,
      dataInsercao,
      dataValidade
    )
    resetAddForm()
    carregar()
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault()
    let remaining = quantidadeRemover
    const lotes = itens
      .filter(i => i.nome === nomeRemover)
      .sort((a, b) =>
        (a.inseridoEm?.toDate?.() ?? new Date()).getTime() -
        (b.inseridoEm?.toDate?.() ?? new Date()).getTime()
      )

    for (const lote of lotes) {
      if (remaining <= 0) break
      const disponivel = lote.quantidade
      const deduzir = Math.min(disponivel, remaining)
      await ajustarQuantidade(lote.id, disponivel - deduzir)
      remaining -= deduzir
    }

    resetRemoveForm()
    carregar()
  }

  function resetAddForm() {
    setIsNewItem(false)
    setNome('')
    setQuantidade(0)
    setValidade(new Date().toISOString().slice(0, 10))
    setShowAddModal(false)
  }

  function resetRemoveForm() {
    setNomeRemover('')
    setQuantidadeRemover(1)
    setShowRemoveModal(false)
  }

  const resumo = useMemo(() => {
    const map = new Map<string, { total: number; proximidade: Date }>()
    itens.forEach(item => {
      const vd = item.validade?.toDate?.() ?? new Date()
      const e = map.get(item.nome)
      if (e) {
        e.total += item.quantidade
        if (vd < e.proximidade) e.proximidade = vd
      } else {
        map.set(item.nome, { total: item.quantidade, proximidade: vd })
      }
    })
    return Array.from(map.entries()).map(([nome, { total, proximidade }]) => ({
      nome,
      total,
      proximidade,
    }))
  }, [itens])

  return (
    <>
      <Header />

      <div className="pt-20 px-4 max-w-4xl mx-auto">

        {/* Título e Botões acima do resumo */}
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

        {/* Resumo de Estoque */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-3">Resumo de Estoque</h2>
          <ul className="space-y-1">
            {resumo.map(r => (
              <li key={r.nome} className="flex justify-between">
                <span>{r.nome}</span>
                <span>
                  Total: <strong>{r.total}</strong> | Validade:{' '}
                  {r.proximidade.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Listagem detalhada */}
        <ul className="space-y-2 mb-12">
          {itens.map(item => (
            <li
              key={item.id}
              className="flex justify-between items-center bg-white p-4 rounded shadow"
            >
              <div>
                <p className="font-medium">{item.nome}</p>
                <p className="text-sm text-gray-600">
                  Inserido:{' '}
                  {item.inseridoEm?.toDate
                    ? item.inseridoEm.toDate().toLocaleDateString()
                    : '—'}
                </p>
                <p className="text-sm text-gray-600">
                  Validade:{' '}
                  {item.validade?.toDate
                    ? item.validade.toDate().toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <span className="font-semibold">Qtd: {item.quantidade}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal Adicionar/Atualizar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <form
            onSubmit={handleAdd}
            className="p-6 rounded-xl shadow-lg w-full max-w-md space-y-4 bg-white"
          >
            <h2 className="text-lg font-semibold">
              Adicionar / Atualizar Estoque
            </h2>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={!isNewItem}
                  onChange={() => { setIsNewItem(false); setNome('') }}
                /> Existente
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={isNewItem}
                  onChange={() => { setIsNewItem(true); setNome('') }}
                /> Novo item
              </label>
            </div>

            {!isNewItem ? (
              <select
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Selecione um item</option>
                {nomesUnicos.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Nome do novo item"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            )}

            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={e => setQuantidade(Number(e.target.value))}
              className="w-full p-2 border rounded"
              min={0}
              required
            />

            <label className="flex flex-col">
              Data de validade
              <input
                type="date"
                value={validade}
                onChange={e => setValidade(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetAddForm}
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
            className="p-6 rounded-xl shadow-lg w-full max-w-md space-y-4 bg-white"
          >
            <h2 className="text-lg font-semibold">Remover Estoque</h2>

            <select
              value={nomeRemover}
              onChange={e => setNomeRemover(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Selecione o item</option>
              {nomesUnicos.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantidade a remover"
              value={quantidadeRemover}
              onChange={e => setQuantidadeRemover(Number(e.target.value))}
              className="w-full p-2 border rounded"
              min={1}
              required
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetRemoveForm}
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
