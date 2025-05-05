'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { registrarVenda, listarVendasDoDia } from '@/lib/firebase-caixa'
import { listarClientes, salvarCliente } from '@/lib/firebase-clientes'
import { listarProdutos } from '@/lib/firebase-produtos'
import { Plus } from 'lucide-react'

export default function CaixaPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])

  const [clienteId, setClienteId] = useState('')
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', aniversario: '' })
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)

  const [itens, setItens] = useState<any[]>([])
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pago, setPago] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    const [c, p, v] = await Promise.all([
      listarClientes(),
      listarProdutos(),
      listarVendasDoDia(),
    ])
    setClientes(c)
    setProdutos(p)
    setVendas(v)
  }

  const adicionarProduto = (id: string) => {
    const existe = itens.find((i) => i.id === id)
    if (existe) {
      setItens(itens.map(i => i.id === id ? { ...i, qtd: i.qtd + 1 } : i))
    } else {
      const produto = produtos.find(p => p.id === id)
      setItens([...itens, { id, nome: produto.nome, preco: produto.preco, qtd: 1 }])
    }
  }

  const removerProduto = (id: string) => {
    setItens(itens.filter(i => i.id !== id))
  }

  const total = itens.reduce((acc, cur) => acc + cur.preco * cur.qtd, 0)

  const handleFinalizar = async () => {
    if (!clienteId || !itens.length || !formaPagamento) {
      alert('Preencha todos os campos antes de finalizar.')
      return
    }

    await registrarVenda({
      clienteId,
      itens,
      formaPagamento,
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

  const abrirWhatsapp = () => {
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) return

    const texto = `Olá ${cliente.nome}, aqui está o resumo da sua compra:\n\n${itens
      .map(i => `- ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`)
      .join('\n')}\n\nTotal: R$ ${total.toFixed(2)}`

    const url = `https://wa.me/55${cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const handleSalvarNovoCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCliente.nome || !novoCliente.telefone) return

    const clienteCriado = await salvarCliente(novoCliente)
    setNovoCliente({ nome: '', telefone: '', aniversario: '' })
    setMostrarModalCliente(false)
    await carregar()
    setClienteId(clienteCriado.id)
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Caixa</h1>

        <div className="bg-white p-4 rounded-xl shadow space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <div className="w-full">
              <label className="block mb-1 text-sm text-gray-700">Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Selecione o cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setMostrarModalCliente(true)}
              className="ml-2 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 flex gap-1 items-center"
            >
              <Plus size={16} />
              Novo
            </button>
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-700">Adicionar Produtos</label>
            <select
              onChange={(e) => adicionarProduto(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Escolha um produto</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco.toFixed(2)}</option>
              ))}
            </select>

            {/* Carrinho estilo mercado */}
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Carrinho</h3>
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
                      <td className="p-2 text-right">R$ {item.preco.toFixed(2)}</td>
                      <td className="p-2 text-right">R$ {(item.preco * item.qtd).toFixed(2)}</td>
                      <td className="p-2 text-right flex gap-1 justify-end">
                        <button onClick={() => setItens(prev => prev.map(i => i.id === item.id && i.qtd > 1 ? { ...i, qtd: i.qtd - 1 } : i))} className="bg-gray-200 px-2 rounded hover:bg-gray-300">–</button>
                        <button onClick={() => setItens(prev => prev.map(i => i.id === item.id ? { ...i, qtd: i.qtd + 1 } : i))} className="bg-gray-200 px-2 rounded hover:bg-gray-300">+</button>
                        <button onClick={() => removerProduto(item.id)} className="text-red-500 text-xs ml-2 hover:underline">Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-700">Forma de Pagamento</label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Selecione</option>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
            />
            <label className="text-sm text-gray-700">Venda paga?</label>
          </div>

          <div className="text-right font-bold text-lg">
            Total: R$ {total.toFixed(2)}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleFinalizar}
              className="w-full sm:w-auto bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Finalizar Venda
            </button>
            <button
              onClick={abrirWhatsapp}
              disabled={!clienteId}
              className="w-full sm:w-auto bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Enviar via WhatsApp
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">Vendas de hoje</h2>
        <ul className="space-y-2">
          {vendas.map(v => (
            <li key={v.id} className="bg-white p-3 rounded shadow text-sm">
              Cliente: {clientes.find(c => c.id === v.clienteId)?.nome || '—'}<br />
              Total: R$ {v.total.toFixed(2)}<br />
              Pago: {v.pago ? 'Sim' : 'Não'}
            </li>
          ))}
        </ul>
      </div>

      {mostrarModalCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Novo Cliente</h2>
            <form onSubmit={handleSalvarNovoCliente} className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                value={novoCliente.nome}
                onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Telefone com DDD"
                value={novoCliente.telefone}
                onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="date"
                placeholder="Data de aniversário"
                value={novoCliente.aniversario}
                onChange={(e) => setNovoCliente({ ...novoCliente, aniversario: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500">Formato: dia/mês/ano</p>
              <div className="text-right">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Salvar
                </button>
                <button type="button" onClick={() => setMostrarModalCliente(false)} className="ml-3 text-sm text-gray-600 hover:underline">
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
