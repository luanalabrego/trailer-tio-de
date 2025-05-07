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

  // modal
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<'phone' | 'register'>('phone')
  const [telefone, setTelefone] = useState('')
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
  const [nome, setNome] = useState('')
  const [aniversario, setAniversario] = useState('')

  // agendamento
  const [dataHoraAgendada, setDataHoraAgendada] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'retirada' | 'entrega'>('retirada')
  const [localEntrega, setLocalEntrega] = useState('')

  useEffect(() => {
    async function init() {
      const [produtos_, clientes_] = await Promise.all([
        listarProdutos(),
        listarClientes(),
      ])
      setProdutos(produtos_)
      setClientes(clientes_)
      setQuantidades(Object.fromEntries(produtos_.map(p => [p.id, 1])))

      // pré-login
      const tel = localStorage.getItem('clienteTelefone') || ''
      if (tel) {
        setTelefone(tel)
        const cli = clientes_.find(c => c.telefone.replace(/\D/g,'') === tel.replace(/\D/g,''))
        if (cli) setClienteExistente(cli)
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
      // já cadastrado: grava e vai ao carrinho
      setClienteExistente(cli)
      localStorage.setItem('clienteTelefone', clean)
      localStorage.setItem('clienteNome', cli.nome)
      if (cli.aniversario) localStorage.setItem('clienteAniversario', cli.aniversario)
      setShowModal(false)
      setView('carrinho')
    } else {
      // novo cliente: passo 2
      setModalStep('register')
    }
  }

  function handleRegisterSubmit() {
    if (!nome || !aniversario) {
      alert('Por favor preencha nome e aniversário.')
      return
    }
    // grava localStorage e segue
    localStorage.setItem('clienteTelefone', telefone.replace(/\D/g,''))
    localStorage.setItem('clienteNome', nome)
    localStorage.setItem('clienteAniversario', aniversario)
    setClienteExistente({ id: '', nome, telefone, aniversario })
    setShowModal(false)
    setView('carrinho')
  }

  const adicionarAoCarrinho = (p: Produto) => {
    const qtd = quantidades[p.id] || 1
    setCarrinho(prev => {
      const exists = prev.find(i => i.id === p.id)
      if (exists) return prev.map(i => i.id === p.id ? { ...i, qtd: i.qtd + qtd } : i)
      return [...prev, { id: p.id, nome: p.nome, preco: p.preco, qtd }]
    })
    setQuantidades(q => ({ ...q, [p.id]: 1 }))
    alert('Item adicionado ao carrinho')
  }

  const total = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0)

  async function handleAgendar() {
    if (!dataHoraAgendada || !formaPagamento || carrinho.length === 0) {
      alert('Defina data/hora, pagamento e adicione itens.')
      return
    }
    if (tipoEntrega === 'entrega' && !localEntrega) {
      alert('Escolha local de entrega.')
      return
    }
    const payload: AgendamentoPayload = {
      nome:      clienteExistente!.nome,
      whatsapp:  telefone,
      dataHora:  dataHoraAgendada,
      formaPagamento,
      itens:     carrinho,
      total,
      observacao,
      tipoEntrega,
      localEntrega: tipoEntrega==='entrega'? localEntrega : undefined,
    }
    await salvarAgendamento(payload)
    if (confirm('Pedido confirmado!\n\nEnviar resumo via WhatsApp?')) {
      const linhas = payload.itens.map(i=>`- ${i.nome}×${i.qtd}=R$${(i.preco*i.qtd).toFixed(2)}`).join('\n')
      const txt = `Olá ${payload.nome}, seu pedido:\n${linhas}\nTotal: R$${payload.total.toFixed(2)}\nAgendado: ${new Date(payload.dataHora).toLocaleString('pt-BR')}`
      window.open(`https://wa.me/55${telefone.replace(/\D/g,'')}?text=${encodeURIComponent(txt)}`, '_blank')
    }
    // limpa
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
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cardápio</h1>
        <button
          onClick={entrarCarrinho}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Carrinho ({carrinho.length})
        </button>
      </header>

      {view==='menu'
        ? categorias.map(cat=>(
            <section key={cat} className="mb-8">
              <h2 className="text-xl font-semibold text-indigo-600 mb-2">{cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {produtos.filter(p=>p.categoria===cat).map(p=>(
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow flex flex-col">
                    {p.imagemUrl && <Image src={p.imagemUrl} alt={p.nome} width={400} height={200} className="w-full h-32 object-cover rounded mb-2"/>}
                    <h3 className="text-lg font-bold">{p.nome}</h3>
                    <p className="text-sm text-gray-600 mb-4">{p.unidade} — R$ {p.preco.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm">Qtd:</label>
                      <input
                        type="number" min={1}
                        value={quantidades[p.id]||1}
                        onChange={e=>setQuantidades(q=>({...q,[p.id]:Math.max(1,+e.target.value)}))}
                        className="w-16 p-1 border rounded text-center"
                      />
                    </div>
                    <button onClick={()=>adicionarAoCarrinho(p)} className="mt-auto bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        : (
            <div className="bg-white p-4 rounded-xl shadow border">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Cliente: {clienteExistente!.nome}</span>
                <button onClick={()=>{
                  localStorage.clear()
                  setClienteExistente(null)
                  setView('menu')
                }} className="text-sm text-indigo-600 hover:underline">
                  Mudar número
                </button>
              </div>
              {carrinho.length===0
                ? <p className="text-gray-600">Carrinho vazio.</p>
                : <>
                    {/* campos de agendamento aqui */}
                    <div className="mb-4">
                      <label className="block mb-1 text-sm text-gray-700">Agendar para</label>
                      <input
                        type="datetime-local"
                        min={new Date(Date.now()+3600000).toISOString().slice(0,16)}
                        value={dataHoraAgendada}
                        onChange={e=>setDataHoraAgendada(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block mb-1 text-sm text-gray-700">Forma de Pagamento</label>
                      <select
                        value={formaPagamento}
                        onChange={e=>setFormaPagamento(e.target.value)}
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
                        onChange={e=>setObservacao(e.target.value)}
                        className="w-full p-2 border rounded"
                        rows={3}
                      />
                    </div>
                    <div className="text-right font-bold text-lg mb-4">
                      Total: R$ {total.toFixed(2)}
                    </div>
                    <button onClick={handleAgendar} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                      Finalizar Pedido
                    </button>
                  </>}
            </div>
          )
      }

      {/* modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            {modalStep === 'phone' ? (
              <>
                <h2 className="text-xl font-bold mb-4">Digite seu WhatsApp</h2>
                <input
                  type="tel"
                  value={telefone}
                  onChange={e=>setTelefone(e.target.value)}
                  placeholder="11999998888"
                  className="w-full p-2 border rounded mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={cancelarModal} className="px-4 py-2 rounded border">Cancelar</button>
                  <button onClick={handlePhoneContinue} className="px-4 py-2 bg-indigo-600 text-white rounded">Continuar</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2">Cadastro</h2>
                <p className="mb-4 text-gray-600">
                  Verificamos que você não tem cadastro. Preencha abaixo, por favor:
                </p>
                <input
                  type="text"
                  value={nome}
                  onChange={e=>setNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full p-2 border rounded mb-3"
                />
                <input
                  type="date"
                  value={aniversario}
                  onChange={e=>setAniversario(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={cancelarModal} className="px-4 py-2 rounded border">Cancelar</button>
                  <button onClick={handleRegisterSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded">Enviar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
