'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import { registrarVenda, listarVendasDoDia } from '@/lib/firebase-caixa'
import { listarClientes, cadastrarCliente } from '@/lib/firebase-clientes'
import { listarProdutos } from '@/lib/firebase-produtos'
import { Plus } from 'lucide-react'
import { Cliente, Produto, PedidoItem, Venda } from '@/types'

export default function CaixaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])

  const [clienteId, setClienteId] = useState('')
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, 'id'>>({
    nome: '',
    telefone: '',
    aniversario: '',
  })
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)

  const [itens, setItens] = useState<PedidoItem[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pago, setPago] = useState(true)

  const total = itens.reduce((acc, cur) => acc + cur.preco * cur.qtd, 0)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    const [c, p, v] = await Promise.all([
      listarClientes(),
      listarProdutos(),
      listarVendasDoDia(),
    ])
    setClientes(c)
    setProdutos(p)
    setVendas(v)
  }

  const sugeridos = useMemo(
    () =>
      buscaProduto.trim() === ''
        ? []
        : produtos.filter((p) =>
            p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
          ),
    [buscaProduto, produtos]
  )

  function adicionarProduto(prod: Produto) {
    const existe = itens.find((i) => i.id === prod.id)
    if (existe) {
      setItens((prev) =>
        prev.map((i) =>
          i.id === prod.id ? { ...i, qtd: i.qtd + 1 } : i
        )
      )
    } else {
      setItens((prev) => [
        ...prev,
        { id: prod.id, nome: prod.nome, preco: prod.preco, qtd: 1 },
      ])
    }
    setBuscaProduto('')
  }

  function removerProduto(id: string) {
    setItens((prev) => prev.filter((i) => i.id !== id))
  }

  async function handleFinalizar() {
    if (itens.length === 0) {
      alert('Adicione ao menos um produto ao carrinho.')
      return
    }
    if (pago && !formaPagamento) {
      alert('Selecione a forma de pagamento.')
      return
    }
    if (!pago && !clienteId) {
      alert('Para venda pendente, selecione ou cadastre um cliente.')
      return
    }
    await registrarVenda({
      clienteId,
      itens,
      formaPagamento: pago ? formaPagamento : '',
      total,
      pago,
    })
    alert('Venda registrada com sucesso!')
    setClienteId('')
    setItens([])
    setFormaPagamento('')
    setPago(true)
    await carregar()
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Caixa</h1>

        <div className="bg-white p-4 rounded-xl shadow space-y-4 mb-8">

          {/* Pago? */}
          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={pago}
                onChange={() => setPago((v) => !v)}
                className="form-checkbox"
              />
              Venda paga
            </label>
          </div>

          {/* Cliente só se não pago */}
          {!pago && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block mb-1 text-sm text-gray-700">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setMostrarModalCliente(true)}
                className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 flex gap-1 items-center"
              >
                <Plus size={16} /> Novo
              </button>
            </div>
          )}

          {/* Busca de produto */}
          <div>
            <label className="block mb-1 text-sm text-gray-700">
              Adicionar produto
            </label>
            <input
              type="text"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              placeholder="Digite o nome..."
              className="w-full p-2 border rounded"
            />
            {sugeridos.length > 0 && (
              <ul className="border rounded-md bg-white mt-1 max-h-40 overflow-auto">
                {sugeridos.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => adicionarProduto(p)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {p.nome} — R$ {p.preco.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Carrinho */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Carrinho</h3>
            {itens.length === 0 ? (
              <p className="text-gray-600">Sem itens</p>
            ) : (
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-right">Preço</th>
                    <th className="p-2 text-right">Subtotal</th>
                    <th className="p-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.nome}</td>
                      <td className="p-2 text-center">{item.qtd}</td>
                      <td className="p-2 text-right">
                        R$ {item.preco.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        R$ {(item.preco * item.qtd).toFixed(2)}
                      </td>
                      <td className="p-2 text-right flex gap-1 justify-end">
                        <button
                          onClick={() =>
                            setItens((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? { ...i, qtd: i.qtd - 1 }
                                  : i
                              )
                            )
                          }
                          className="bg-gray-200 px-2 rounded hover:bg-gray-300"
                        >
                          –
                        </button>
                        <button
                          onClick={() =>
                            setItens((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? { ...i, qtd: i.qtd + 1 }
                                  : i
                              )
                            )
                          }
                          className="bg-gray-200 px-2 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removerProduto(item.id)}
                          className="text-red-500 text-xs ml-2 hover:underline"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagamento e ações */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleFinalizar}
              className="w-full sm:w-auto bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Finalizar Venda
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">Vendas de hoje</h2>
        <ul className="space-y-2">
          {vendas.map((v) => (
            <li
              key={v.id}
              className="bg-white p-3 rounded shadow text-sm"
            >
              Cliente:{' '}
              {!v.pago
                ? clientes.find((c) => c.id === v.clienteId)?.nome || '—'
                : '—'}
              <br />
              Total: R$ {v.total.toFixed(2)}<br />
              Pago: {v.pago ? 'Sim' : 'Não'}
            </li>
          ))}
        </ul>
      </div>

      {mostrarModalCliente && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Novo Cliente
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                cadastrarCliente(novoCliente).then(() => {
                  setMostrarModalCliente(false)
                  carregar()
                })
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Nome"
                value={novoCliente.nome}
                onChange={(e) =>
                  setNovoCliente({ ...novoCliente, nome: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Telefone com DDD"
                value={novoCliente.telefone}
                onChange={(e) =>
                  setNovoCliente({
                    ...novoCliente,
                    telefone: e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
                required
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMostrarModalCliente(false)}
                  className="text-gray-600 hover:underline mr-4"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
