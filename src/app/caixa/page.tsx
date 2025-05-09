'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/Header'
import { registrarVenda, listarVendasDoDia } from '@/lib/firebase-caixa'
import { listarClientes, cadastrarCliente } from '@/lib/firebase-clientes'
import { listarProdutos } from '@/lib/firebase-produtos'
import { Plus } from 'lucide-react'
import type { Cliente, Produto, PedidoItem, Venda as VendaType } from '@/types'

// estende VendaType para incluir orderNumber
type Venda = VendaType & { orderNumber?: number }

export default function CaixaPage() {
  // sequência de números de pedido
  const [orderNumber, setOrderNumber] = useState<number>(1)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])

  // carrinho e busca
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const sugeridos = useMemo(
    () =>
      buscaProduto.trim() === ''
        ? []
        : produtos.filter(p =>
            p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
          ),
    [buscaProduto, produtos]
  )

  // soma dos valores do carrinho
  const total = useMemo(
    () => itens.reduce((acc, cur) => acc + cur.preco * cur.qtd, 0),
    [itens]
  )

  // estado da venda
  const [saleType, setSaleType] = useState<'paid' | 'pending' | null>(null)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, 'id'>>({
    nome: '',
    telefone: '',
    aniversario: '',
  })

  // modal final
  const [showFinalModal, setShowFinalModal] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const [c, p, vRaw] = await Promise.all([
      listarClientes(),
      listarProdutos(),
      listarVendasDoDia(),
    ])
    setClientes(c)
    setProdutos(p)
    // tipa o retorno para Venda estendida
    const v = vRaw as Venda[]
    setVendas(v)

    // calcula próximo número de pedido baseado no máximo existente
    const maxNum = v.reduce(
      (max, sale) => Math.max(max, sale.orderNumber ?? 0),
      0
    )
    setOrderNumber(maxNum + 1)
  }

  function adicionarProduto(prod: Produto) {
    setItens(prev => {
      const existe = prev.find(i => i.id === prod.id)
      if (existe) {
        return prev.map(i =>
          i.id === prod.id ? { ...i, qtd: i.qtd + 1 } : i
        )
      }
      return [...prev, { id: prod.id, nome: prod.nome, preco: prod.preco, qtd: 1 }]
    })
    setBuscaProduto('')
  }

  function alterarQtd(id: string, delta: number) {
    setItens(prev =>
      prev
        .map(i => (i.id === id ? { ...i, qtd: Math.max(1, i.qtd + delta) } : i))
        .filter(i => i.qtd > 0)
    )
  }

  function removerProduto(id: string) {
    setItens(prev => prev.filter(i => i.id !== id))
  }

  function handleImprimir() {
    const w = window.open('', '_blank')
    if (!w) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Comprovante de Venda</title>
          <style>
            body { font-family: sans-serif; padding: 1rem; }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            ul { padding-left: 1.2rem; }
            li { margin-bottom: 0.3rem; }
          </style>
        </head>
        <body>
          <h1>Comprovante de Venda</h1>
          <p><strong>Pedido Nº:</strong> ${orderNumber}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <ul>
            ${itens
              .map(
                i =>
                  `<li>${i.nome} × ${i.qtd} = R$ ${(
                    i.preco * i.qtd
                  ).toFixed(2)}</li>`
              )
              .join('')}
          </ul>
          <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
          <p><strong>${
            saleType === 'paid' ? 'Pago' : 'Pendente'
          }</strong></p>
        </body>
      </html>
    `
    w.document.write(html)
    w.document.close()
    w.onload = () => {
      w.focus()
      w.print()
      w.close()
    }
  }

  function abrirWhatsapp() {
    const cli = clientes.find(c => c.id === clienteId)
    if (!cli) return

    const texto =
      `Olá ${cli.nome}, aqui está o resumo da sua compra (Pedido Nº ${orderNumber}):\n\n` +
      itens.map(i => `- ${i.nome} × ${i.qtd}`).join('\n') +
      `\n\nTotal: R$ ${total.toFixed(2)}\nStatus: pendente de pagamento`

    const url = `https://wa.me/55${cli.telefone.replace(
      /\D/g,
      ''
    )}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  function handleShowFinalModal() {
    if (itens.length === 0) {
      alert('Adicione ao menos um produto.')
      return
    }
    if (saleType === 'paid' && !formaPagamento) {
      alert('Selecione a forma de pagamento.')
      return
    }
    if (saleType === 'pending' && !clienteId) {
      alert('Por favor, selecione ou cadastre um cliente antes de continuar.')
      return
    }
    setShowFinalModal(true)
  }

  async function confirmarRegistro(action: 'print' | 'skip' | 'whatsapp') {
    if (action === 'print') handleImprimir()
    if (action === 'whatsapp') abrirWhatsapp()

    await registrarVenda({
      orderNumber,
      clienteId: saleType === 'pending' ? clienteId : '',
      itens,
      formaPagamento: saleType === 'paid' ? formaPagamento : '',
      total,
      pago: saleType === 'paid',
    })

    setOrderNumber(prev => prev + 1)
    alert('Pedido finalizado!')
    setItens([])
    setSaleType(null)
    setFormaPagamento('')
    setClienteId('')
    setShowFinalModal(false)
    await carregar()
  }

  const resumoVendasHoje = useMemo(() => {
    const m = new Map<string, number>()
    vendas.forEach(v =>
      v.itens.forEach(i =>
        m.set(i.nome, (m.get(i.nome) || 0) + i.qtd)
      )
    )
    return Array.from(m.entries()).map(([nome, total]) => ({ nome, total }))
  }, [vendas])

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Caixa</h1>

        <div className="bg-white p-4 rounded-xl shadow space-y-6 mb-8">
          {/* busca */}
          <div>
            <label className="block mb-1 text-sm">Adicionar produto</label>
            <input
              type="text"
              value={buscaProduto}
              onChange={e => setBuscaProduto(e.target.value)}
              placeholder="Digite o nome..."
              className="w-full p-2 border rounded"
            />
            {sugeridos.length > 0 && (
              <ul className="border rounded-md bg-white mt-1 max-h-40 overflow-auto">
                {sugeridos.map(p => (
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

          {/* carrinho */}
          <div>
            <h2 className="font-semibold mb-2">Carrinho</h2>
            {itens.length === 0 ? (
              <p className="text-gray-600">Carrinho vazio</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {itens.map(item => (
                    <li
                      key={item.id}
                      className="bg-gray-50 p-3 rounded flex flex-col gap-2"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{item.nome}</span>
                        <span>R$ {(item.preco * item.qtd).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => alterarQtd(item.id, -1)}
                            disabled={item.qtd <= 1}
                            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                          >
                            –
                          </button>
                          <span>{item.qtd}</span>
                          <button
                            onClick={() => alterarQtd(item.id, +1)}
                            className="px-2 py-1 bg-gray-200 rounded"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removerProduto(item.id)}
                          className="text-red-500 text-xs hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end items-center">
                  <span className="font-semibold mr-2">Total:</span>
                  <span className="text-lg font-bold">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* tipo de venda */}
          {saleType === null && itens.length > 0 && (
            <div className="flex gap-4">
              <button
                onClick={() => setSaleType('paid')}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Pagar
              </button>
              <button
                onClick={() => setSaleType('pending')}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Marcar
              </button>
            </div>
          )}

          {saleType === 'paid' && (
            <div className="space-y-4">
              <button
                onClick={() => setSaleType(null)}
                className="text-gray-600 hover:underline"
              >
                &larr; Voltar
              </button>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Forma de pagamento</option>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="outro">Outro</option>
              </select>
              <button
                onClick={handleShowFinalModal}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Finalizar Pago
              </button>
            </div>
          )}

          {saleType === 'pending' && (
            <div className="space-y-4">
              <button
                onClick={() => setSaleType(null)}
                className="text-gray-600 hover:underline"
              >
                &larr; Voltar
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="flex-1 p-2 border rounded"
                >
                  <option value="">Selecione cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setMostrarModalCliente(true)}
                  className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 flex gap-1 items-center"
                >
                  <Plus size={16} /> Novo
                </button>
              </div>
              <button
                onClick={handleShowFinalModal}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Finalizar Pendente
              </button>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mb-2">Itens vendidos hoje</h2>
        <ul className="space-y-1 bg-white p-4 rounded-xl shadow">
          {resumoVendasHoje.map(r => (
            <li key={r.nome} className="flex justify-between">
              <span>{r.nome}</span>
              <span>Qtd: {r.total}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* modal de conclusão */}
      {showFinalModal && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Pedido finalizado!</h2>
            <div className="flex gap-4">
              <button
                onClick={() => confirmarRegistro('print')}
                className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-900"
              >
                Imprimir recibo
              </button>
              {saleType === 'pending' ? (
                <button
                  onClick={() => confirmarRegistro('whatsapp')}
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Enviar no WhatsApp
                </button>
              ) : (
                <button
                  onClick={() => confirmarRegistro('skip')}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400"
                >
                  Não imprimir
                </button>
              )}
            </div>
            <button
              onClick={() => confirmarRegistro('skip')}
              className="mt-4 text-gray-600 hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* modal novo cliente */}
      {mostrarModalCliente && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Novo Cliente</h2>
            <form
              onSubmit={async e => {
                e.preventDefault()
                const c = await cadastrarCliente(novoCliente)
                setClienteId(c.id)
                setMostrarModalCliente(false)
                await carregar()
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Nome"
                value={novoCliente.nome}
                onChange={e =>
                  setNovoCliente({ ...novoCliente, nome: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Telefone com DDD"
                value={novoCliente.telefone}
                onChange={e =>
                  setNovoCliente({ ...novoCliente, telefone: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="date"
                placeholder="Aniversário"
                value={novoCliente.aniversario}
                onChange={e =>
                  setNovoCliente({ ...novoCliente, aniversario: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMostrarModalCliente(false)}
                  className="mr-4 text-gray-600 hover:underline"
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
