'use client'

import { useEffect, useState } from 'react'
import { listarProdutos } from '@/lib/firebase-produtos'
import { salvarAgendamento } from '@/lib/firebase-agendamentos'

export default function CardapioPage() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [carrinho, setCarrinho] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')

  useEffect(() => {
    async function carregar() {
      const todos = await listarProdutos()
      const ativos = todos.filter(p => (p.estoque ?? 0) > 0)
      setProdutos(ativos)
    }
    carregar()
  }, [])

  const adicionarAoCarrinho = (produto: any) => {
    const existe = carrinho.find((i) => i.id === produto.id)
    if (existe) {
      setCarrinho(
        carrinho.map((i) =>
          i.id === produto.id ? { ...i, qtd: i.qtd + 1 } : i
        )
      )
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1 }])
    }
  }

  const removerDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter((i) => i.id !== id))
  }

  const total = carrinho.reduce((acc, cur) => acc + cur.preco * cur.qtd, 0)

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !whatsapp || !dataHora || !formaPagamento || carrinho.length === 0) {
      alert('Preencha todos os campos e adicione itens ao pedido.')
      return
    }

    await salvarAgendamento({
      nome,
      whatsapp,
      dataHora,
      formaPagamento,
      itens: carrinho,
      total,
    })

    alert('Agendamento enviado com sucesso!')

    // Reset
    setCarrinho([])
    setNome('')
    setWhatsapp('')
    setDataHora('')
    setFormaPagamento('')
  }

  const categorias = Array.from(new Set(produtos.map((p) => p.categoria)))

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-4xl mx-auto pt-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Cardápio</h1>

      {categorias.map((categoria) => (
        <div key={categoria} className="mb-8">
          <h2 className="text-xl font-semibold text-indigo-600 mb-2">{categoria}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {produtos
              .filter((p) => p.categoria === categoria)
              .map((produto) => (
                <div key={produto.id} className="bg-white p-4 rounded-xl shadow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{produto.nome}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {produto.unidade} — R$ {produto.preco.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => adicionarAoCarrinho(produto)}
                    className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* CARRINHO + AGENDAMENTO */}
      {carrinho.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow border mt-6">
          <h3 className="text-lg font-semibold mb-2">Seu Pedido</h3>
          <ul className="space-y-1 text-sm">
            {carrinho.map((item) => (
              <li key={item.id} className="flex justify-between items-center">
                <span>
                  {item.nome} × {item.qtd}
                </span>
                <div className="flex gap-2 items-center">
                  <span className="text-gray-700 font-medium">
                    R$ {(item.qtd * item.preco).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removerDoCarrinho(item.id)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAgendar} className="mt-6 space-y-4 text-sm">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Data e Hora do pedido</label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Forma de pagamento</label>
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

            <div className="text-right font-bold text-lg">
              Total: R$ {total.toFixed(2)}
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Confirmar Agendamento
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
