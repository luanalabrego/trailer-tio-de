// src/app/agendamentos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Agendamento, Cliente, PedidoItem, Venda } from '@/types'
import { listarClientes } from '@/lib/firebase-clientes'
import { registrarVenda } from '@/lib/firebase-caixa'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Tipo para os dados vindos do Firestore, sem o campo 'id'
type AgendamentoFirestore = Omit<Agendamento, 'id'>

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    const [listaClientes, snap] = await Promise.all([
      listarClientes(),
      getDocs(collection(db, 'agendamentos')),
    ])
    setClientes(listaClientes)
    const dados = snap.docs.map(d => {
      const data = d.data() as AgendamentoFirestore
      return { id: d.id, ...data }
    })
    setAgendamentos(dados)
  }

  function toggle(id: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(id)) {
        s.delete(id)
      } else {
        s.add(id)
      }
      return s
    })
  }

  function formatarData(dt: Timestamp | { toDate(): Date } | string) {
    if (!dt) return 'Inválida'
    let date: Date
    if (dt instanceof Timestamp) {
      date = dt.toDate()
    } else if (typeof (dt as { toDate?: unknown }).toDate === 'function') {
      date = (dt as { toDate(): Date }).toDate()
    } else {
      date = new Date(dt as string)
    }
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
      () => carregar()
    )
  }

  async function handleRegistrarPagamento(ag: Agendamento) {
    try {
      console.log('Registrando pagamento para', ag.id)
      await updateDoc(doc(db, 'agendamentos', ag.id), { pago: true })
      await carregar()
      alert('Pagamento registrado!')
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err)
      alert('Falha ao registrar pagamento. Veja o console.')
    }
  }

  async function finalizarPedido(ag: Agendamento) {
    const cli = clientes.find(
      c => c.telefone.replace(/\D/g, '') === ag.whatsapp.replace(/\D/g, '')
    )
    const venda: Omit<Venda, 'id' | 'data'> = {
      clienteId: cli?.id || '',
      itens: ag.itens as PedidoItem[],
      formaPagamento: ag.formaPagamento,
      total: Number(ag.total),
      pago: Boolean(ag.pago),
    }
    await registrarVenda(venda)
    await deleteDoc(doc(db, 'agendamentos', ag.id))
    if (!ag.pago) {
      const txt = `Olá ${ag.nome}, seu pedido de ${formatarData(
        ag.dataHora
      )} foi entregue, mas ainda consta *pendente* de R$ ${Number(
        ag.total
      ).toFixed(2)}.`
      enviarWhatsApp(txt, ag.whatsapp)
    }
    await carregar()
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Agendamentos
        </h1>

        {agendamentos.length === 0 ? (
          <p className="text-gray-600">Nenhum agendamento.</p>
        ) : (
          <div className="space-y-4">
            {agendamentos.map(ag => {
              const isOpen = expanded.has(ag.id)
              const tipo = ag.localEntrega ? 'Entrega' : 'Retirada'
              return (
                <div
                  key={ag.id}
                  className="bg-white rounded-xl shadow border"
                >
                  <button
                    onClick={() => toggle(ag.id)}
                    className="w-full flex justify-between items-center p-4"
                  >
                    <div className="flex items-center gap-2">
                      {ag.pago && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Pago
                        </span>
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">
                          {ag.nome} — {tipo} — {formatarData(ag.dataHora)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(ag.itens as PedidoItem[]).length} item(s) • {ag.formaPagamento}
                        </p>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp /> : <ChevronDown />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4">
                      <ul className="space-y-2">
                        {(ag.itens as PedidoItem[]).map(i => (
                          <li key={i.id} className="flex justify-between">
                            <span>
                              {i.nome} × {i.qtd}
                            </span>
                            <span>
                              R$ {(i.preco * i.qtd).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => confirmacaoPedido(ag)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Confirmar Pedido
                        </button>
                        <button
                          onClick={() => handleRegistrarPagamento(ag)}
                          disabled={ag.pago}
                          className={`px-3 py-1 rounded text-sm ${
                            ag.pago
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {ag.pago ? 'Já Pago' : 'Registrar Pagamento'}
                        </button>
                        <button
                          onClick={() => finalizarPedido(ag)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Finalizar Pedido
                        </button>
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
