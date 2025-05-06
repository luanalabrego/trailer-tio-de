// src/app/cardapio/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { listarProdutos } from '@/lib/firebase-produtos'
import { listarClientes } from '@/lib/firebase-clientes'
import { salvarAgendamento } from '@/lib/firebase-agendamentos'
import { Produto, PedidoItem, NovoAgendamento, Cliente } from '@/types'

// Payload inclui também tipoEntrega e localEntrega
type AgendamentoPayload = NovoAgendamento & {
  tipoEntrega: 'retirada' | 'entrega'
  localEntrega?: string
}

export default function CardapioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<PedidoItem[]>([])
  const [view, setView] = useState<'menu' | 'carrinho'>('menu')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})

  // modal para dados do cliente
  const [showModal, setShowModal] = useState(false)
  const [telefone, setTelefone] = useState('')
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
  const [nome, setNome] = useState('')
  const [aniversario, setAniversario] = useState('')

  // campos de carrinho
  const [dataHoraAgendada, setDataHoraAgendada] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'retirada' | 'entrega'>('retirada')
  const [localEntrega, setLocalEntrega] = useState('')

  // ref para o input de data/hora
  const dtRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      const [produtos_, clientes_] = await Promise.all([
        listarProdutos(),
        listarClientes(),
      ])
      setProdutos(produtos_)
      setClientes(clientes_)
      setQuantidades(Object.fromEntries(produtos_.map(p => [p.id, 1])))
    }
    init()
  }, [])

  const adicionarAoCarrinho = (p: Produto) => {
    const qtd = quantidades[p.id] || 1
    setCarrinho(prev => {
      const exists = prev.find(i => i.id === p.id)
      if (exists) {
        return prev.map(i =>
          i.id === p.id ? { ...i, qtd: i.qtd + qtd } : i
        )
      }
      return [...prev, { id: p.id, nome: p.nome, preco: p.preco, qtd }]
    })
    setQuantidades(q => ({ ...q, [p.id]: 1 }))
  }

  const total = carrinho.reduce((sum, i) => sum + i.preco * i.qtd, 0)

  function onTelefoneChange(val: string) {
    setTelefone(val)
    const clean = val.replace(/\D/g, '')
    const cli = clientes.find(c => c.telefone.replace(/\D/g, '') === clean)
    if (cli) {
      setClienteExistente(cli)
      setNome(cli.nome)
      setAniversario(cli.aniversario || '')
    } else {
      setClienteExistente(null)
      setNome('')
      setAniversario('')
    }
  }

  async function handleConfirmarCliente() {
    if (!telefone) {
      alert('Informe o WhatsApp.')
      return
    }
    if (!clienteExistente && (!nome || !aniversario)) {
      alert('Informe nome e aniversário.')
      return
    }
    setShowModal(false)
    await handleAgendar()
  }

  function confirmDate() {
    dtRef.current?.blur()
  }

  function enviarWhatsAppResumo(order: AgendamentoPayload) {
    const linhas = order.itens
      .map(i => `- ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`)
      .join('\n')
    const texto = [
      `Olá ${order.nome}, aqui está seu pedido:`,
      linhas,
      `Total: R$ ${order.total.toFixed(2)}`,
      `Agendado para: ${new Date(order.dataHora).toLocaleString('pt-BR')}`,
      `Forma: ${order.formaPagamento}`,
      order.tipoEntrega === 'entrega'
        ? `Entrega em: ${order.localEntrega}`
        : 'Retirada no trailer',
      `Observação: ${order.observacao || '–'}`,
    ].join('\n\n')
    const tel = order.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  async function handleAgendar() {
    if (!telefone) {
      setShowModal(true)
      return
    }
    if (!dataHoraAgendada || !formaPagamento || carrinho.length === 0) {
      alert('Defina data/hora, forma de pagamento e adicione itens.')
      return
    }
    if (tipoEntrega === 'entrega' && !localEntrega) {
      alert('Escolha o local de entrega.')
      return
    }

    const payload: AgendamentoPayload = {
      nome: clienteExistente?.nome || nome,
      whatsapp: telefone,
      dataHora: dataHoraAgendada,
      criadoEm: new Date().toISOString(),
      formaPagamento,
      itens: carrinho,
      total,
      observacao,
      aniversario: clienteExistente?.aniversario || aniversario,
      tipoEntrega,
      localEntrega: tipoEntrega === 'entrega' ? localEntrega : undefined,
    }

    await salvarAgendamento(payload)

    if (confirm('Pedido confirmado!\n\nDeseja enviar o resumo via WhatsApp?')) {
      enviarWhatsAppResumo(payload)
    }

    // reset geral
    setCarrinho([])
    setView('menu')
    setShowModal(false)
    setTelefone('')
    setClienteExistente(null)
    setNome('')
    setAniversario('')
    setDataHoraAgendada('')
    setFormaPagamento('')
    setObservacao('')
    setTipoEntrega('retirada')
    setLocalEntrega('')
  }

  const categorias = Array.from(new Set(produtos.map(p => p.categoria)))

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-4xl mx-auto pt-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cardápio</h1>
        <button
          onClick={() => setView(v => (v === 'menu' ? 'carrinho' : 'menu'))}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          {view === 'menu' ? `Carrinho (${carrinho.length})` : 'Voltar'}
        </button>
      </header>

      {view === 'menu' ? (
        categorias.map(cat => (
          <section key={cat} className="mb-8">
            <h2 className="text-xl font-semibold text-indigo-600 mb-2">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {produtos
                .filter(p => p.categoria === cat)
                .map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow flex flex-col">
                    {p.imagemUrl && (
                      <Image
                        src={p.imagemUrl}
                        alt={p.nome}
                        width={400}
                        height={200}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="text-lg font-bold">{p.nome}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {p.unidade} — R$ {p.preco.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm">Qtd:</label>
                      <input
                        type="number"
                        min={1}
                        value={quantidades[p.id] || 1}
                        onChange={e =>
                          setQuantidades(q => ({
                            ...q,
                            [p.id]: Math.max(1, Number(e.target.value)),
                          }))
                        }
                        className="w-16 p-1 border rounded text-center"
                      />
                    </div>
                    <button
                      onClick={() => adicionarAoCarrinho(p)}
                      className="mt-auto bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
            </div>
          </section>
        ))
      ) : (
        <div className="bg-white p-4 rounded-xl shadow border">
          <h2 className="text-xl font-semibold mb-4">Seu Carrinho</h2>
          {carrinho.length === 0 ? (
            <p className="text-gray-600">Carrinho vazio.</p>
          ) : (
            <>
              <ul className="space-y-2 mb-4">
                {carrinho.map(item => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.nome} × {item.qtd}</span>
                    <span>R$ {(item.preco * item.qtd).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-700">Agendar para</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={dtRef}
                    type="datetime-local"
                    value={dataHoraAgendada}
                    onChange={e => {
                      setDataHoraAgendada(e.target.value)
                      dtRef.current?.blur()
                    }}
                    className="w-full p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={confirmDate}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    OK
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-700">Forma de Pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={e => setFormaPagamento(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Selecione</option>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-700">Observação</label>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block mb-1 text-sm text-gray-700">Retirada / Entrega</label>
                  <select
                    value={tipoEntrega}
                    onChange={e => setTipoEntrega(e.target.value as 'retirada' | 'entrega')}
                    className="w-full p-2 border rounded"
                  >
                    <option value="retirada">Retirada</option>
                    <option value="entrega">Entrega</option>
                  </select>
                </div>
                {tipoEntrega === 'entrega' && (
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-gray-700">Local de Entrega</label>
                    <select
                      value={localEntrega}
                      onChange={e => setLocalEntrega(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Selecione</option>
                      <option value="Sala Privalia">Sala Privalia</option>
                      <option value="Sala IDL">Sala IDL</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="text-right font-bold text-lg mb-4">
                Total: R$ {total.toFixed(2)}
              </div>
              <button
                onClick={handleAgendar}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Finalizar Pedido
              </button>
            </>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Seus Dados</h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={e => onTelefoneChange(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              {!clienteExistente && (
                <>
                  <div>
                    <label className="block mb-1">Nome</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Aniversário</label>
                    <input
                      type="date"
                      value={aniversario}
                      onChange={e => setAniversario(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded border"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarCliente}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
