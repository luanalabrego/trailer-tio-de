'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import {
  listarClientes,
  cadastrarCliente,
  salvarCliente,
  excluirCliente,
} from '@/lib/firebase-clientes'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Cliente } from '@/types'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [aniversario, setAniversario] = useState('')  // YYYY-MM-DD
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const lista = await listarClientes()
    setClientes(lista)
  }

  const abrirModalNovo = () => {
    setModoEdicao(false)
    setClienteSelecionado(null)
    setNome('')
    setTelefone('')
    setAniversario('')
    setObservacoes('')
    setMostrarModal(true)
  }

  const abrirModalEdicao = (cliente: Cliente) => {
    setModoEdicao(true)
    setClienteSelecionado(cliente)
    setNome(cliente.nome)
    setTelefone(cliente.telefone)
    // converte "DD/MM/YYYY" → "YYYY-MM-DD" para o input date
    if (cliente.aniversario) {
      const [dd, mm, yyyy] = cliente.aniversario.split('/')
      setAniversario(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`)
    } else {
      setAniversario('')
    }
    setObservacoes(cliente.observacoes ?? '')
        setMostrarModal(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    // evita duplicação de telefone
    const existeDuplicado = modoEdicao
      ? clientes.some(c => c.telefone === telefone && c.id !== clienteSelecionado?.id)
      : clientes.some(c => c.telefone === telefone)
    if (existeDuplicado) {
      alert('Já existe um cliente cadastrado com este telefone.')
      return
    }

    // formatar data para "DD/MM/YYYY" antes de salvar ou undefined
    const aniversarioFormatado = aniversario
      ? aniversario.split('-').reverse().join('/')
      : undefined

    const dados: Omit<Cliente, 'id'> = {
      nome,
      telefone,
      aniversario: aniversarioFormatado,
      observacoes,
      totalGasto: 0,
    }

    if (modoEdicao && clienteSelecionado) {
      await salvarCliente({ id: clienteSelecionado.id, ...dados })
    } else {
      await cadastrarCliente(dados)
    }

    setMostrarModal(false)
    await carregar()
  }

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      await excluirCliente(id)
      await carregar()
    }
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto bg-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> Novo Cliente
          </button>
        </div>

        <ul className="space-y-2">
          {clientes.map(cliente => (
            <li
              key={cliente.id}
              className="bg-white p-4 rounded-xl shadow flex justify-between items-start sm:items-center flex-col sm:flex-row"
            >
              <div>
                <p className="font-semibold text-gray-800">{cliente.nome}</p>
                <p className="text-sm text-gray-600">📱 {cliente.telefone}</p>
                {cliente.aniversario && (
                  <p className="text-sm text-gray-600">🎂 {cliente.aniversario}</p>
                )}
                {cliente.observacoes && (
                  <p className="text-sm text-gray-500">📝 {cliente.observacoes}</p>
                )}
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <button
                  onClick={() => abrirModalEdicao(cliente)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleExcluir(cliente.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="(DDD) 99999-0000"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de aniversário
                </label>
                <input
                  type="date"
                  value={aniversario}
                  onChange={e => setAniversario(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">(opcional)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="text-right">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Salvar Cliente
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
    </>
  )
}
