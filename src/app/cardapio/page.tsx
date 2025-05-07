'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { listarProdutos } from '@/lib/firebase-produtos'
import { listarClientes } from '@/lib/firebase-clientes'
import { salvarAgendamento } from '@/lib/firebase-agendamentos'
import { Produto, PedidoItem, NovoAgendamento, Cliente } from '@/types'

type AgendamentoPayload = NovoAgendamento & {
  tipoEntrega: 'retirada' | 'entrega'
  localEntrega?: string
  observacao?: string
}

export default function CardapioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<PedidoItem[]>([])
  const [view, setView] = useState<'menu' | 'carrinho'>('menu')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})

  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<'phone' | 'register'>('phone')
  const [telefone, setTelefone] = useState('')
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
  const [nome, setNome] = useState('')
  const [aniversario, setAniversario] = useState('')

  const [dataHoraAgendada, setDataHoraAgendada] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'retirada' | 'entrega'>('retirada')
  const [localEntrega, setLocalEntrega] = useState('')

  useEffect(() => {
    async function init() {
      const [prods, clis] = await Promise.all([
        listarProdutos(),
        listarClientes(),
      ])
      setProdutos(prods)
      setClientes(clis)
      setQuantidades(Object.fromEntries(prods.map(p => [p.id, 1])))

      // pré-login
      const storedTel = localStorage.getItem('clienteTelefone') || ''
      if (storedTel) {
        const clean = storedTel.replace(/\D/g, '')
        const cli = clis.find(c => c.telefone.replace(/\D/g,'') === clean)
        if (cli) {
          setClienteExistente(cli)
          setTelefone(clean)
        }
      }
    }
    init()
  }, [])

  function entrarCarrinho() {
    if (!clienteExistente) {
      setModalStep('phone')
      setShowModal(true)
    } else {
      setView('carrinho')
    }
  }

  function cancelarModal() {
    setShowModal(false)
    setModalStep('phone')
  }

  function handlePhoneContinue() {
    const clean = telefone.replace(/\D/g, '')
    if (!/^\d{10,11}$/.test(clean)) {
      alert('Digite um número válido com DDD, ex: "11999998888".')
      return
    }
    const cli = clientes.find(c => c.telefone.replace(/\D/g,'') === clean)
    if (cli) {
      setClienteExistente(cli)
      localStorage.setItem('clienteTelefone', clean)
      setShowModal(false)
      setView('carrinho')
    } else {
      setModalStep('register')
    }
  }

  function handleRegisterSubmit() {
    if (!nome || !aniversario) {
      alert('Por favor preencha nome e data de nascimento.')
      return
    }
    const clean = telefone.replace(/\D/g, '')
    localStorage.setItem('clienteTelefone', clean)
    localStorage.setItem('clienteNome', nome)
    localStorage.setItem('clienteAniversario', aniversario)
    setClienteExistente({ id: '', nome, telefone: clean, aniversario })
    setShowModal(false)
    setView('carrinho')
  }

  function mudarTelefone() {
    localStorage.removeItem('clienteTelefone')
    localStorage.removeItem('clienteNome')
    localStorage.removeItem('clienteAniversario')
    setClienteExistente(null)
    setTelefone('')
    setNome('')
    setAniversario('')
    setView('menu')
  }

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
    alert('Item adicionado ao carrinho')
  }

  const removerDoCarrinho = (id: string) => {
    setCarrinho(prev => prev.filter(i => i.id !== id))
  }

  const total = carrinho.reduce((sum, i) => sum + i.preco * i.qtd, 0)

  async function handleAgendar() {
    if (!dataHoraAgendada || !formaPagamento || carrinho.length === 0) {
      alert('Defina data/hora, forma de pagamento e adicione itens.')
      return
    }
    if (tipoEntrega === 'entrega' && !localEntrega) {
      alert('Escolha o local de entrega.')
      return
    }
    const payload: AgendamentoPayload = {
      nome: clienteExistente!.nome,
      whatsapp: telefone,
      dataHora: dataHoraAgendada,
      formaPagamento,
      itens: carrinho,
      total,
      observacao,
      tipoEntrega,
      localEntrega: tipoEntrega === 'entrega' ? localEntrega : undefined,
    }
    await salvarAgendamento(payload)
    if (confirm('Pedido confirmado!\n\nDeseja enviar o resumo via WhatsApp?')) {
      const linhas = payload.itens
        .map(i => `- ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`)
        .join('\n')
      const texto = [
        `Olá ${payload.nome}, aqui está seu pedido:`,
        linhas,
        `Total: R$ ${payload.total.toFixed(2)}`,
        `Agendado para: ${new Date(payload.dataHora).toLocaleString('pt-BR')}`,
      ].join('\n\n')
      window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`, '_blank')
    }
    // reset geral
    setCarrinho([])
    setDataHoraAgendada('')
    setFormaPagamento('')
    setObservacao('')
    setTipoEntrega('retirada')
    setLocalEntrega('')
    setView('menu')
  }

  const categorias = Array.from(new Set(produtos.map(p => p.categoria)))

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-4xl mx-auto pt-8">
      {/* Custom Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Logo"
            width={48}
            height={48}
            unoptimized
            className="rounded-full"
          />
          {clienteExistente ? (
            <div>
              <h2 className="text-xl font-bold">Bem-vindo, {clienteExistente.nome}!</h2>
              <p className="text-sm text-gray-600">É ótimo ter você como nosso cliente.</p>
            </div>
          ) : (
            <h2 className="text-xl font-bold">Bem-vindo!</h2>
          )}
        </div>
      </div>

      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cardápio</h1>
        <button
          onClick={entrarCarrinho}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Carrinho ({carrinho.length})
        </button>
      </header>

      {view === 'menu' ? (
        categorias.map(cat => (
          <section key={cat} className="mb-8">
            <h2 className="text-xl font-semibold text-indigo-600 mb-2">{cat}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {produtos
                .filter(p => p.categoria === cat)
                .map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow flex flex-col max-w-xs">
                    {p.imagemUrl && (
                      <Image
                        src={p.imagemUrl}
                        alt={p.nome}
                        width={400}
                        height={200}
                        className="w-full h-28 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="text-lg font-bold">{p.nome}</h3>
                    <p className="text-sm text-gray-600 mb-2">
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
                        className="w-12 p-1 border rounded text-center"
                      />
                    </div>
                    <button
                      onClick={() => adicionarAoCarrinho(p)}
                      className="mt-auto bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
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
          {carrinho.length === 0 ? (
            <p className="text-gray-600">Carrinho vazio.</p>
          ) : (
            <>
              <ul className="space-y-2 mb-4">
                {carrinho.map(item => (
                  <li key={item.id} className="flex justify-between items-center">
                    <div>{item.nome} × {item.qtd}</div>
                    <div className="flex items-center gap-2">
                      <span>R$ {(item.preco * item.qtd).toFixed(2)}</span>
                      <button onClick={() => removerDoCarrinho(item.id)} className="text-red-500 text-sm hover:underline">
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setView('menu')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                  Continuar comprando
                </button>
                <button onClick={handleAgendar} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Finalizar Pedido
                </button>
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-700">Agendar para</label>
                <input
                  type="datetime-local"
                  min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                  value={dataHoraAgendada}
                  onChange={e => setDataHoraAgendada(e.target.value)}
                  className="w-full p-2 border rounded"
                />
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
                  <option value="alelo">Alelo</option>
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

              <div className="text-right font-bold text-lg mb-4">
                Total: R$ {total.toFixed(2)}
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            {modalStep === 'phone' ? (
              <>
                <h2 className="text-xl font-bold mb-4">Digite seu WhatsApp</h2>
                <input
                  type="tel"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="11999998888"
                  className="w-full p-2 border rounded mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={cancelarModal} className="px-4 py-2 rounded border">
                    Cancelar
                  </button>
                  <button onClick={handlePhoneContinue} className="px-4 py-2 bg-indigo-600 text-white rounded">
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2">Cadastro</h2>
                <p className="mb-4 text-gray-600">
                  Verificamos que você não tem cadastro. Preencha abaixo:
                </p>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full p-2 border rounded mb-3"
                />
                <input
                  type="date"
                  value={aniversario}
                  onChange={e => setAniversario(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={cancelarModal} className="px-4 py-2 rounded border">
                    Cancelar
                  </button>
                  <button onClick={handleRegisterSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded">
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
