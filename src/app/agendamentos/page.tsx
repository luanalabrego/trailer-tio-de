'use client'

import { useEffect, useState, useMemo } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
  DocumentData,
} from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Agendamento, Cliente, PedidoItem, Venda } from '@/types'
import { listarClientes } from '@/lib/firebase-clientes'
import { registrarVenda } from '@/lib/firebase-caixa'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const [listaClientes, snap] = await Promise.all([
      listarClientes(),
      getDocs(collection(db, 'agendamentos')),
    ])
    setClientes(listaClientes)

    const dados = snap.docs.map(d => {
      // pega os dados crus como DocumentData (sem usar any)
      const raw = d.data() as DocumentData
      // Timestamp pode vir em 'dataCriacao' ou 'criadoEm'
      const dataCriacaoTs: Timestamp =
        (raw.dataCriacao as Timestamp) ?? (raw.criadoEm as Timestamp)

      return {
        id: d.id,
        nome: String(raw.nome),
        whatsapp: String(raw.whatsapp),
        dataHora: raw.dataHora as Timestamp | string | Date,
        dataCriacao: dataCriacaoTs,
        itens: raw.itens as PedidoItem[],
        formaPagamento: String(raw.formaPagamento),
        total: raw.total as number | string,
        pago: Boolean(raw.pago),
        localEntrega: raw.localEntrega ? String(raw.localEntrega) : undefined,
        observacao: raw.observacao ? String(raw.observacao) : undefined,
        status: raw.status as 'pendente' | 'confirmado' | 'cancelado',
      } as Agendamento
    })

    setAgendamentos(dados)
  }

  // Ordena agendamentos por dataHora ascendente
  const sortedAgendamentos = useMemo(() => {
    return [...agendamentos].sort((a, b) => {
      const getTime = (dt: Timestamp | Date | string): number => {
        if (dt instanceof Timestamp) return dt.toDate().getTime()
        if (dt instanceof Date) return dt.getTime()
        // string
        return new Date(dt).getTime()
      }
      return getTime(a.dataHora) - getTime(b.dataHora)
    })
  }, [agendamentos])

  function toggle(id: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function formatarData(dt?: Timestamp | Date | string): string {
    if (!dt) return 'Inválida'
    const date =
      dt instanceof Timestamp
        ? dt.toDate()
        : dt instanceof Date
        ? dt
        : new Date(dt)
    if (isNaN(date.getTime())) return 'Inválida'
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  function enviarWhatsApp(texto: string, telRaw: string) {
    const tel = telRaw.replace(/\D/g, '')
    window.open(
      `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  function confirmacaoPedido(ag: Agendamento) {
    const txt = `Olá ${ag.nome}, seu pedido agendado para ${formatarData(
      ag.dataHora
    )} foi *confirmado*!`
    enviarWhatsApp(txt, ag.whatsapp)
    updateDoc(doc(db, 'agendamentos', ag.id), { status: 'confirmado' }).then(
      carregar
    )
  }

  async function handleRegistrarPagamento(ag: Agendamento) {
    if (!confirm('Deseja registrar o pagamento deste pedido?')) return
    try {
      await updateDoc(doc(db, 'agendamentos', ag.id), { pago: true })
      await carregar()
      alert('Pagamento registrado!')
    } catch {
      alert('Falha ao registrar pagamento. Veja o console.')
    }
  }

  async function handleCancelarPedido(ag: Agendamento) {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return
    await updateDoc(doc(db, 'agendamentos', ag.id), { status: 'cancelado' })
    await carregar()
  }

  async function finalizarPedido(ag: Agendamento) {
    const cli = clientes.find(
      c => c.telefone.replace(/\D/g, '') === ag.whatsapp.replace(/\D/g, '')
    )
    const venda: Omit<Venda, 'id' | 'data'> = {
      clienteId: cli?.id || '',
      itens: ag.itens,
      formaPagamento: ag.formaPagamento,
      total: Number(ag.total),
      pago: ag.pago,
    }
    await registrarVenda(venda)
    await deleteDoc(doc(db, 'agendamentos', ag.id))
    if (!ag.pago) {
      enviarWhatsApp(
        `Olá ${ag.nome}, seu pedido de ${formatarData(
          ag.dataHora
        )} foi entregue, mas ainda consta pendente de R$ ${Number(
          ag.total
        ).toFixed(2)}.`,
        ag.whatsapp
      )
    }
    await carregar()
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Agendamentos</h1>

        {sortedAgendamentos.length === 0 ? (
          <p className="text-gray-600">Nenhum agendamento.</p>
        ) : (
          <div className="space-y-4">
            {sortedAgendamentos.map(ag => {
              const isOpen = expanded.has(ag.id)
              const tipo = ag.localEntrega ? 'Entrega' : 'Retirada'
              const borderClass =
                ag.status === 'pendente'
                  ? 'border-yellow-400'
                  : ag.status === 'confirmado'
                  ? 'border-green-400'
                  : 'border-red-400'

              return (
                <div
                  key={ag.id}
                  className={`bg-white rounded-xl shadow border-l-4 ${borderClass}`}
                >
                  <button
                    onClick={() => toggle(ag.id)}
                    className="w-full flex justify-between items-center p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          ag.pago
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ag.pago ? 'Pago' : 'Pendente'}
                      </span>
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">
                          {ag.nome} — {tipo} — {formatarData(ag.dataHora)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {ag.itens.length} item(s) • {ag.formaPagamento}
                        </p>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp /> : <ChevronDown />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4">
                      <p className="text-sm text-gray-500">
                        Pedido registrado em: {formatarData(ag.dataCriacao)}
                      </p>

                      {ag.localEntrega && (
                        <p className="text-sm text-gray-700">
                          <strong>Local de entrega:</strong> {ag.localEntrega}
                        </p>
                      )}

                      {ag.observacao && (
                        <p className="text-sm text-gray-700">
                          <strong>Observação:</strong> {ag.observacao}
                        </p>
                      )}

                      <ul className="space-y-2">
                        {ag.itens.map(i => (
                          <li key={i.id} className="flex justify-between">
                            <span>
                              {i.nome} × {i.qtd}
                            </span>
                            <span>R$ {(i.preco * i.qtd).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex gap-2 pt-2">
                        {ag.status !== 'confirmado' && (
                          <button
                            onClick={() => confirmacaoPedido(ag)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Confirmar Pedido
                          </button>
                        )}
                        {ag.status !== 'cancelado' && (
                          <button
                            onClick={() => handleCancelarPedido(ag)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Cancelar Pedido
                          </button>
                        )}
                        {ag.status === 'confirmado' && !ag.pago && (
                          <button
                            onClick={() => handleRegistrarPagamento(ag)}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                          >
                            Registrar Pagamento
                          </button>
                        )}
                        {ag.status === 'confirmado' && (
                          <button
                            onClick={() => finalizarPedido(ag)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Finalizar Pedido
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
