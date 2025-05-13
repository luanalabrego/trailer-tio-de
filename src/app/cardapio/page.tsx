'use client';

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { listarProdutos } from '@/lib/firebase-produtos'
import { listarClientes, cadastrarCliente } from '@/lib/firebase-clientes'
import { salvarAgendamento } from '@/lib/firebase-agendamentos'
import { Produto, PedidoItem, NovoAgendamento, Cliente } from '@/types'
import { Timestamp } from 'firebase/firestore'
import {
  listarEstoque,
  ajustarQuantidade,
  registrarHistoricoEstoque,
} from '@/lib/firebase-estoque'

type AgendamentoPayload = NovoAgendamento & {
  tipoEntrega: 'retirada' | 'entrega'
  localEntrega?: string
  observacao?: string
}

export default function CardapioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({})
  const [carrinho, setCarrinho] = useState<PedidoItem[]>([])
  const [view, setView] = useState<'menu' | 'carrinho'>('menu')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // modal de cadastro telefônico
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<'phone' | 'register'>('phone')
  const [telefone, setTelefone] = useState('')
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
  const [nome, setNome] = useState('')
  const [aniversario, setAniversario] = useState('')

  // dados de agendamento
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

      // monta o mapa produtoId → soma de todos os lotes
      const lots = await listarEstoque()
      const counts: Record<string, number> = {}
      lots.forEach(l => {
        counts[l.produtoId] = (counts[l.produtoId] || 0) + l.quantidade
      })
      setStockCounts(counts)

      const stored = localStorage.getItem('clienteTelefone') || ''
      if (stored) {
        const clean = stored.replace(/\D/g, '')
        const cli = clis.find(c => c.telefone.replace(/\D/g, '') === clean)
        if (cli) {
          setClienteExistente(cli)
          setTelefone(clean)
        }
      }
    }
    init()
  }, [])

  const categorias = Array.from(new Set(produtos.map(p => p.categoria)))
  const categoriasToShow = selectedCategory ? [selectedCategory] : categorias

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
    const cli = clientes.find(c => c.telefone.replace(/\D/g, '') === clean)
    if (cli) {
      setClienteExistente(cli)
      localStorage.setItem('clienteTelefone', clean)
      setShowModal(false)
      setView('carrinho')
    } else {
      setModalStep('register')
    }
  }

  async function handleRegisterSubmit() {
    if (!nome || !aniversario) {
      alert('Por favor preencha nome e data de nascimento.')
      return
    }
    const clean = telefone.replace(/\D/g, '')
    const newCli = await cadastrarCliente({ nome, telefone: clean, aniversario })
    localStorage.setItem('clienteTelefone', clean)
    setClienteExistente(newCli)
    setClientes(prev => [...prev, newCli])
    setShowModal(false)
    setView('carrinho')
  }

  function mudarTelefone() {
    localStorage.removeItem('clienteTelefone')
    setClienteExistente(null)
    setTelefone('')
    setNome('')
    setAniversario('')
    setSelectedCategory(null)
    setModalStep('phone')
    setShowModal(true)
  }

  const incrementarItem = (id: string) =>
    setCarrinho(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const product = produtos.find(p => p.id === id)!
        const disponivel = product.controlaEstoque
          ? stockCounts[id] ?? 0
          : product.disponivel
          ? Infinity
          : 0
        if (item.qtd < disponivel) {
          return { ...item, qtd: item.qtd + 1 }
        } else {
          alert(
            product.controlaEstoque
              ? `Só há ${stockCounts[id]} em estoque para este produto.`
              : 'Este produto não está mais disponível.'
          )
          return item
        }
      })
    )

  const decrementarItem = (id: string) =>
    setCarrinho(prev =>
      prev.flatMap(i => {
        if (i.id === id) {
          if (i.qtd > 1) return { ...i, qtd: i.qtd - 1 }
          return []
        }
        return i
      })
    )

  const adicionarAoCarrinho = (p: Produto) => {
    const qtdDesejada = quantidades[p.id] || 1
    const jaNoCarrinho = carrinho.find(i => i.id === p.id)?.qtd ?? 0
    const disponivel = p.controlaEstoque
      ? stockCounts[p.id] ?? 0
      : p.disponivel
      ? Infinity
      : 0
    const restante = disponivel - jaNoCarrinho

    if (qtdDesejada > restante) {
      alert(
        p.controlaEstoque
          ? `Você só pode adicionar mais ${restante} unidade(s) deste produto.`
          : 'Este produto não está mais disponível.'
      )
      return
    }

    setCarrinho(prev => {
      const exists = prev.find(i => i.id === p.id)
      if (exists) {
        return prev.map(i =>
          i.id === p.id ? { ...i, qtd: i.qtd + qtdDesejada } : i
        )
      }
      return [...prev, { id: p.id, nome: p.nome, preco: p.preco, qtd: qtdDesejada }]
    })

    setQuantidades(q => ({ ...q, [p.id]: 1 }))
    alert('Item adicionado ao carrinho')
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

    // Deduza estoque FIFO lote a lote
    const lots = await listarEstoque()
    for (const item of carrinho) {
      let remaining = item.qtd
      const productLots = lots
        .filter(l => l.produtoId === item.id)
        .sort((a, b) =>
          a.inseridoEm.toDate().getTime() - b.inseridoEm.toDate().getTime()
        )

      for (const lot of productLots) {
        if (remaining <= 0) break
        const toDeduct = Math.min(lot.quantidade, remaining)
        await ajustarQuantidade(lot.id, lot.quantidade - toDeduct)
        await registrarHistoricoEstoque({
          produtoId: lot.produtoId,
          nome: item.nome,
          ajuste: -toDeduct,
          motivo: 'Venda',
          criadoEm: Timestamp.now(),
        })
        remaining -= toDeduct
      }
    }

    // Atualiza o estado local de estoque
    const updatedLots = await listarEstoque()
    const newCounts: Record<string, number> = {}
    updatedLots.forEach(l => {
      newCounts[l.produtoId] = (newCounts[l.produtoId] || 0) + l.quantidade
    })
    setStockCounts(newCounts)

    if (confirm('Pedido confirmado!\n\nDeseja enviar o resumo via WhatsApp?')) {
      const linhas = payload.itens
        .map(
          i =>
            `- ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`
        )
        .join('\n')
      const when =
        payload.dataHora instanceof Timestamp
          ? payload.dataHora.toDate().toLocaleString('pt-BR')
          : new Date(payload.dataHora).toLocaleString('pt-BR')

      window.open(
        `https://wa.me/55${telefone}?text=${encodeURIComponent(
          `Olá ${payload.nome},\n${linhas}\nTotal: R$ ${payload.total.toFixed(
            2
          )}\nAgendado para: ${when}`
        )}`,
        '_blank'
      )
    }

    // limpa tudo e volta ao menu
    setCarrinho([])
    setDataHoraAgendada('')
    setFormaPagamento('')
    setObservacao('')
    setTipoEntrega('retirada')
    setLocalEntrega('')
    setView('menu')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-4xl mx-auto pt-8">
      {/* Cabeçalho e boas-vindas */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Logo"
            width={48}
            height={48}
            className="rounded-full"
            unoptimized
          />
          <div>
            {clienteExistente ? (
              <>
                <h2 className="text-xl font-bold">
                  Bem-vindo, {clienteExistente.nome}!
                </h2>
                <p className="text-sm text-gray-600">
                  É ótimo ter você como nosso cliente.
                </p>
              </>
            ) : (
              <h2 className="text-xl font-bold">Bem-vindo!</h2>
            )}
          </div>
        </div>
      </div>

      {/* Título e botão do carrinho */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Cardápio</h1>
        <button
          onClick={entrarCarrinho}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Carrinho ({carrinho.length})
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto whitespace-nowrap mb-4">
  <button
    onClick={() => setSelectedCategory(null)}
    className={`flex-none px-3 py-1 rounded whitespace-nowrap ${
      !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-gray-200'
    }`}
  >
    Todos
  </button>
  {categorias.map(cat => (
    <button
      key={cat}
      onClick={() => setSelectedCategory(cat)}
      className={`flex-none px-3 py-1 rounded whitespace-nowrap ${
        selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-200'
      }`}
    >
      {cat}
    </button>
  ))}
</div>



      {view === 'menu' ? (
        <>
          {/* Lista de produtos */}
          {categoriasToShow.map(cat => (
            <section key={cat} className="mb-8">
              <h2 className="text-xl font-semibold text-indigo-600 mb-2">
                {cat}
              </h2>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
              {produtos
                  .filter(p =>
                    p.categoria === cat &&
                    (
                      p.controlaEstoque
                        ? (stockCounts[p.id] ?? 0) > 0
                        : p.disponivel
                    )
                  )
                  .map(p => (
                    <div key={p.id} className="bg-white p-2 rounded shadow flex flex-col">
                      {p.imagemUrl && (
  <div className="relative w-full h-32 overflow-hidden rounded mb-1">
    <Image
      src={p.imagemUrl}
      alt={p.nome}
      fill
      className="object-cover"
    />
  </div>
)}

                      <h3 className="text-md font-bold">{p.nome}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {p.unidade} — R$ {p.preco.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 mb-2">
                        <label className="text-sm">Qtd:</label>
                        <input
                          type="number"
                          min={1}
                          max={p.controlaEstoque ? stockCounts[p.id] ?? 1 : undefined}
                          value={quantidades[p.id] || 1}
                          onChange={e =>
                            setQuantidades(q => ({
                              ...q,
                              [p.id]: Math.max(1, Number(e.target.value)),
                            }))
                          }
                          className="w-8 h-8 p-0.5 border rounded text-center text-xs"                        />
                      </div>
                      <button
                        onClick={() => adicionarAoCarrinho(p)}
                        disabled={
                          p.controlaEstoque
                            ? (quantidades[p.id] || 1) > (stockCounts[p.id] ?? 0)
                            : !p.disponivel
                        }
                        className="mt-auto bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <>
          {/* Tela carrinho */}
          <div className="mb-4">
            <button
              onClick={() => setView('menu')}
              className="text-indigo-600 hover:underline"
            >
              ← Voltar ao menu
            </button>
          </div>
          <div className="bg-white p-4 rounded shadow border">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">
                Cliente: {clienteExistente?.nome}
              </span>
              <button
                onClick={mudarTelefone}
                className="text-sm text-indigo-600 hover:underline"
              >
                Mudar número
              </button>
            </div>
            {carrinho.length === 0 ? (
              <p className="text-gray-600">Carrinho vazio.</p>
            ) : (
              <>
                <ul className="space-y-2 mb-4">
                  {carrinho.map(item => (
                    <li key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button onClick={() => decrementarItem(item.id)} className="px-2 py-1 bg-gray-200 rounded">–</button>
                        <span className="text-sm">{item.nome} × {item.qtd}</span>
                        <button onClick={() => incrementarItem(item.id)} className="px-2 py-1 bg-gray-200 rounded">+</button>
                      </div>
                      <span className="text-sm">R$ {(item.preco * item.qtd).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                {/* Tipo de entrega */}
                <div className="mb-4">
                  <label className="block mb-1 text-sm text-gray-700">Tipo de Entrega</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="tipoEntrega"
                        value="retirada"
                        checked={tipoEntrega === 'retirada'}
                        onChange={() => setTipoEntrega('retirada')}
                        className="form-radio"
                      />
                      Retirada
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="tipoEntrega"
                        value="entrega"
                        checked={tipoEntrega === 'entrega'}
                        onChange={() => setTipoEntrega('entrega')}
                        className="form-radio"
                      />
                      Entrega
                    </label>
                  </div>
                </div>
                {tipoEntrega === 'entrega' && (
                  <div className="mb-4">
                    <label className="block mb-1 text-sm text-gray-700">Local de Entrega</label>
                    <input
                      type="text"
                      value={localEntrega}
                      onChange={e => setLocalEntrega(e.target.value)}
                      placeholder="Endereço para entrega"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                )}

                {/* Agendamento, pagamento e observação */}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setView('menu')}
                    className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
                  >
                    Continuar Comprando
                  </button>
                  <button
                    onClick={handleAgendar}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    Finalizar Pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Modal de telefone/cadastro */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            {modalStep === 'phone' ? (
              <>
                <h2 className="text-xl font-bold mb-2">Digite seu WhatsApp</h2>
                <label className="block mb-1 text-sm">Digite seu número:</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
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
                <label className="block mb-1 text-sm">Digite seu nome:</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full p-2 border rounded mb-3"
                />
                <label className="block mb-1 text-sm">Digite sua data de nascimento:</label>
                <input
                  type="date"
                  value={aniversario}
                  onChange={e => setAniversario(e.target.value)}
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
