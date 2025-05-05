// src/app/estoque/page.tsx

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/Header'
import { Plus, Minus, X as Close } from 'lucide-react'
import {
  listarEstoque,
  criarOuAtualizarItemEstoque,
  EstoqueItem,
} from '@/lib/firebase-estoque'

export default function EstoquePage() {
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  // formulário de adicionar/atualizar
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [inseridoEm, setInseridoEm] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [validade, setValidade] = useState(
    new Date().toISOString().slice(0, 10)
  )

  // formulário de remover
  const [nomeRemover, setNomeRemover] = useState('')
  const [quantidadeRemover, setQuantidadeRemover] = useState(1)
  const [validadeRemover, setValidadeRemover] = useState(
    new Date().toISOString().slice(0, 10)
  )

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const lista = await listarEstoque()
    setItens(lista)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await criarOuAtualizarItemEstoque(
      nome.trim(),
      quantidade,
      new Date(inseridoEm),
      new Date(validade)
    )
    resetAddForm()
    await carregar()
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault()
    await criarOuAtualizarItemEstoque(
      nomeRemover,
      -quantidadeRemover,
      new Date(), // data de inserção não usada na remoção
      new Date(validadeRemover)
    )
    resetRemoveForm()
    await carregar()
  }

  function resetAddForm() {
    setNome('')
    setQuantidade(1)
    const hoje = new Date().toISOString().slice(0, 10)
    setInseridoEm(hoje)
    setValidade(hoje)
    setShowAddModal(false)
  }

  function resetRemoveForm() {
    setNomeRemover('')
    setQuantidadeRemover(1)
    setValidadeRemover(new Date().toISOString().slice(0, 10))
    setShowRemoveModal(false)
  }

  const resumo = useMemo(() => {
    const map = new Map<string, { total: number; proximidade: Date }>()
    itens.forEach(item => {
      const vdDate = item.validade?.toDate?.() ?? new Date()
      const entry = map.get(item.nome)
      if (entry) {
        entry.total += item.quantidade
        if (vdDate < entry.proximidade) entry.proximidade = vdDate
      } else {
        map.set(item.nome, { total: item.quantidade, proximidade: vdDate })
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

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Estoque</h1>
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

        {/* Listagem detalhada */}
        <ul className="space-y-2">
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

      {/* Modal de Adicionar/Atualizar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <form
            onSubmit={handleAdd}
            className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold">
              Adicionar / Atualizar Estoque
            </h2>
            {/* ... campos de adicionar permaneçam os mesmos ... */}
          </form>
        </div>
      )}

      {/* Modal de Remoção */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <form
            onSubmit={handleRemove}
            className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold">Remover Estoque</h2>
            <select
              value={nomeRemover}
              onChange={e => setNomeRemover(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Selecione o item</option>
              {itens.map(item => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                </option>
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
            <label className="flex flex-col">
              Data de validade
              <input
                type="date"
                value={validadeRemover}
                onChange={e => setValidadeRemover(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </label>
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
