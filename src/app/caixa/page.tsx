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

  // carrinho
  const [itens, setItens] = useState<PedidoItem[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')

  // sugestão de produtos pela busca
  const sugeridos = useMemo(
    () =>
      buscaProduto.trim() === ''
        ? []
        : produtos.filter(p =>
            p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
          ),
    [buscaProduto, produtos]
  )

  // seleção de venda: pago agora ou pendente
  const [saleType, setSaleType] = useState<'paid' | 'pending' | null>(null)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente,'id'>>({
    nome:'', telefone:'', aniversario:''
  })

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
    const texto = `Olá ${cliente.nome}, aqui está o resumo da sua compra:\n\n` +
      itens.map(i => `- ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`).join('\n') +
      `\n\nTotal: R$ ${total.toFixed(2)}`
    window.open(
      `https://wa.me/55${cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  function handleImprimir() {
    const data = new Date().toLocaleString('pt-BR')
    const html = `
      <h1>Comprovante de Venda</h1>
      <p><strong>Data:</strong> ${data}</p>
      <ul>
        ${itens.map(i => `<li>${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}</li>`).join('')}
      </ul>
      <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
      <p><strong>${saleType === 'paid' ? 'Pago' : 'Pendente'}</strong></p>
    `
    const w = window.open('', '_blank', 'width=600,height=600')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.focus()
      w.print()
      w.close()
    }
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
    // após sucesso, oferecer opções
    if (saleType === 'paid') {
      if (window.confirm('Venda registrada! Deseja enviar confirmação via WhatsApp?')) {
        abrirWhatsapp()
      }
      if (window.confirm('Deseja imprimir o comprovante?')) {
        handleImprimir()
      }
    } else {
      if (window.confirm('Venda pendente registrada! Deseja imprimir o comprovante?')) {
        handleImprimir()
      }
    }
    // resetar tudo
    setItens([])
    setSaleType(null)
    setFormaPagamento('')
    setClienteId('')
    await carregar()
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Caixa</h1>

        <div className="bg-white p-4 rounded-xl shadow space-y-6 mb-8">
          {/* busca produto */}
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
                  {itens.map(item => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.nome}</td>
                      <td className="p-2 text-center">{item.qtd}</td>
                      <td className="p-2 text-right">R$ {item.preco.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        R$ {(item.preco * item.qtd).toFixed(2)}
                      </td>
                      <td className="p-2 text-right flex gap-1 justify-end">
                        <button
                          onClick={() => alterarQtd(item.id, -1)}
                          className="bg-gray-200 px-2 rounded hover:bg-gray-300 disabled:opacity-50"
                          disabled={item.qtd <= 1}
                        >
                          –
                        </button>
                        <button
                          onClick={() => alterarQtd(item.id, +1)}
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

          {/* finalização com botão Voltar */}
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
                <option value="">Selecione forma de pagamento</option>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="outro">Outro</option>
              </select>
              <button
                onClick={handleFinalizar}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Finalizar venda paga
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
                  <option value="">Selecione o cliente</option>
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
                Finalizar venda pendente
              </button>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mb-2">Vendas de hoje</h2>
        <ul className="space-y-2">
          {vendas.map(v => (
            <li key={v.id} className="bg-white p-3 rounded shadow text-sm">
              Cliente:{' '}
              {!v.pago
                ? clientes.find(c => c.id === v.clienteId)?.nome || '—'
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
