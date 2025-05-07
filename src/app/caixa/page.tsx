'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import { registrarVenda, listarVendasDoDia } from '@/lib/firebase-caixa'
import { listarClientes, cadastrarCliente } from '@/lib/firebase-clientes'
import { listarProdutos } from '@/lib/firebase-produtos'
import { Plus } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Cliente, Produto, PedidoItem, Venda } from '@/types'

export default function CaixaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])

  // carrinho
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')

  // sugestões
  const sugeridos = useMemo(
    () =>
      buscaProduto.trim() === ''
        ? []
        : produtos.filter(p =>
            p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
          ),
    [buscaProduto, produtos]
  )

  // estado da venda
  const [saleType, setSaleType] = useState<'paid' | 'pending' | null>(null)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente,'id'>>({
    nome:'', telefone:'', aniversario:''
  })
  const [showFinalModal, setShowFinalModal] = useState(false)

  const total = itens.reduce((acc, cur) => acc + cur.preco * cur.qtd, 0)

  useEffect(() => {
    carregar()
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
        .map(i =>
          i.id === id ? { ...i, qtd: Math.max(1, i.qtd + delta) } : i
        )
        .filter(i => i.qtd > 0)
    )
  }

  function removerProduto(id: string) {
    setItens(prev => prev.filter(i => i.id !== id))
  }

  function abrirWhatsapp() {
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) return
    const texto =
      `Olá ${cliente.nome}, aqui está o resumo da sua compra:\n\n` +
      itens.map(i => `- ${i.nome} × ${i.qtd}`).join('\n')
    window.open(
      `https://wa.me/55${cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  function gerarPDF() {
    const doc = new jsPDF()
    const data = new Date().toLocaleString('pt-BR')
    doc.setFontSize(16)
    doc.text('Comprovante de Venda', 10, 10)
    doc.setFontSize(12)
    doc.text(`Data: ${data}`, 10, 20)
    itens.forEach((i, idx) => {
      doc.text(`${i.nome} × ${i.qtd}`, 10, 30 + idx * 10)
    })
    doc.text(`Total: R$ ${total.toFixed(2)}`, 10, 40 + itens.length * 10)
    doc.save('recibo.pdf')
  }

  async function handleFinalizar() {
    if (itens.length === 0) {
      alert('Adicione ao menos um produto.')
      return
    }
    if (saleType === 'paid' && !formaPagamento) {
      alert('Selecione a forma de pagamento.')
      return
    }
    if (saleType === 'pending' && !clienteId) {
      alert('Selecione ou cadastre um cliente.')
      return
    }
    await registrarVenda({
      clienteId: saleType === 'pending' ? clienteId : '',
      itens,
      formaPagamento: saleType === 'paid' ? formaPagamento : '',
      total,
      pago: saleType === 'paid',
    })
    setShowFinalModal(true)
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Caixa</h1>

        <div className="bg-white p-4 rounded-xl shadow space-y-6 mb-8">
          {/* adicionar produto */}
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

          {/* carrinho mobile-friendly */}
          <div>
            <h2 className="font-semibold mb-2">Carrinho</h2>
            {itens.length === 0 ? (
              <p className="text-gray-600">Carrinho vazio</p>
            ) : (
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
            )}
          </div>

          {/* escolher tipo de venda */}
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

          {/* detalhe pagamento */}
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
                onClick={handleFinalizar}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Finalizar Paga
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
                onClick={handleFinalizar}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Finalizar Pendente
              </button>
            </div>
          )}
        </div>

        {/* vendas de hoje resumido */}
        <h2 className="text-xl font-bold mb-2">Itens vendidos hoje</h2>
        <ul className="space-y-1 bg-white p-4 rounded-xl shadow">
          {useMemo(() => {
            const m = new Map<string, number>()
            vendas.forEach(v =>
              v.itens.forEach(i =>
                m.set(i.nome, (m.get(i.nome) || 0) + i.qtd)
              )
            )
            return Array.from(m.entries()).map(([nome, total]) => ({ nome, total }))
          }, [vendas]).map(r => (
            <li key={r.nome} className="flex justify-between">
              <span>{r.nome}</span>
              <span>Qtd: {r.total}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* modal finalizar */}
      {showFinalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Venda registrada!</h2>
            <div className="flex gap-4">
              <button
                onClick={() => { gerarPDF(); setShowFinalModal(false) }}
                className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-900"
              >
                Imprimir recibo
              </button>
              {saleType === 'pending' && (
                <button
                  onClick={() => { abrirWhatsapp(); setShowFinalModal(false) }}
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Enviar no WhatsApp
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFinalModal(false)}
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
                  className="mr-4 text-gray-600 hover:underline"
                >
                  Cancelar
                </button>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
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
