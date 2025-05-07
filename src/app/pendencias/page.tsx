// src/app/pendencias/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { listarClientes } from '@/lib/firebase-clientes'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { Cliente, Venda, PedidoItem } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Tipo unificado para vendas e agendamentos
type Pendencia = {
  id: string
  clienteId: string
  data: Timestamp
  itens: PedidoItem[]
  total: number
  formaPagamento: string
  type: 'venda' | 'agendamento'
}

export default function PagamentosPendentesPage() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    carregarPendencias()
  }, [])

  async function carregarPendencias() {
    const listaClientes = await listarClientes()
    setClientes(listaClientes)

    // --- VENDAS PENDENTES ---
    const snapVendas = await getDocs(collection(db, 'vendas'))
    const vendasPendentes: Pendencia[] = snapVendas.docs
      .filter(docSnap => {
        const d = docSnap.data() as any
        return d.pago === false
      })
      .map(docSnap => {
        const v = docSnap.data() as Omit<Venda, 'id'> & { pago: boolean }
        return {
          id: docSnap.id,
          clienteId: v.clienteId,
          data: v.data as Timestamp,
          itens: v.itens as PedidoItem[],
          total: v.total,
          formaPagamento: v.formaPagamento,
          type: 'venda',
        }
      })

    // --- AGENDAMENTOS PENDENTES ---
    const snapAg = await getDocs(collection(db, 'agendamentos'))
    const agendPendentes: Pendencia[] = snapAg.docs
      .filter(docSnap => {
        const a = docSnap.data() as any
        return a.pago === false
      })
      .map(docSnap => {
        const a = docSnap.data() as any
        // encontra cliente pelo WhatsApp cadastrado
        const telClean = (a.whatsapp as string).replace(/\D/g, '')
        const cli = listaClientes.find(c =>
          c.telefone.replace(/\D/g, '') === telClean
        )
        return {
          id: docSnap.id,
          clienteId: cli ? cli.id : '',
          data:
            typeof a.dataHora === 'string'
              ? Timestamp.fromDate(new Date(a.dataHora))
              : (a.dataHora as Timestamp),
          itens: a.itens as PedidoItem[],
          total: a.total as number,
          formaPagamento: a.formaPagamento as string,
          type: 'agendamento',
        }
      })
      .filter(a => a.clienteId) // descarta se não encontrou cliente

    setPendencias([...vendasPendentes, ...agendPendentes])
  }

  async function confirmarPagamento(p: Pendencia) {
    const col = p.type === 'venda' ? 'vendas' : 'agendamentos'
    await updateDoc(doc(db, col, p.id), { pago: true })
    await carregarPendencias()
  }

  async function pagarTudo(lista: Pendencia[]) {
    if (!confirm('Marcar todas pendências deste cliente como pagas?')) return
    await Promise.all(
      lista.map(p =>
        updateDoc(
          doc(db, p.type === 'venda' ? 'vendas' : 'agendamentos', p.id),
          { pago: true }
        )
      )
    )
    await carregarPendencias()
  }

  function enviarExtrato(cliente: Cliente, lista: Pendencia[]) {
    const linhas = lista.map(p => {
      const dt = p.data.toDate().toLocaleDateString('pt-BR')
      const itensTxt = p.itens
        .map(i => `    - ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`)
        .join('\n')
      return `Pedido em ${dt}:\n${itensTxt}\n    Subtotal: R$ ${p.total.toFixed(2)}`
    })
    const totalGeral = lista.reduce((s, p) => s + p.total, 0).toFixed(2)
    const texto = [
      `Olá ${cliente.nome}, aqui estão suas pendências no Trailer do Tio Dé:`,
      ...linhas,
      `Total geral: R$ ${totalGeral}`,
      'Aguardamos o pagamento, obrigado!',
    ].join('\n\n')
    const tel = cliente.telefone.replace(/\D/g, '')
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  // agrupa pendências por cliente
  const pendenciasPorCliente = pendencias.reduce<Record<string, Pendencia[]>>(
    (acc, p) => {
      ;(acc[p.clienteId] ??= []).push(p)
      return acc
    },
    {}
  )

  function toggle(clienteId: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(clienteId) ? s.delete(clienteId) : s.add(clienteId)
      return s
    })
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Pagamentos Pendentes</h1>

        {Object.keys(pendenciasPorCliente).length === 0 ? (
          <p className="text-gray-600">Não há pendências.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(pendenciasPorCliente).map(([cid, lista]) => {
              const cliente = clientes.find(c => c.id === cid)!
              const soma = lista.reduce((s, p) => s + p.total, 0)
              const isOpen = expanded.has(cid)

              return (
                <div key={cid} className="bg-white rounded-xl shadow border">
                  <button
                    onClick={() => toggle(cid)}
                    className="w-full flex justify-between items-center p-4"
                  >
                    <div>
                      <p className="font-semibold">{cliente.nome}</p>
                      <p className="text-sm text-gray-600">
                        {lista.length} pedido(s) — Total: R$ {soma.toFixed(2)}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp /> : <ChevronDown />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <ul className="space-y-2">
                        {lista.map(p => (
                          <li
                            key={p.id}
                            className="flex justify-between items-start bg-gray-50 p-3 rounded"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                Data: {p.data.toDate().toLocaleDateString('pt-BR')}
                              </p>
                              <ul className="ml-4 text-sm">
                                {p.itens.map(i => (
                                  <li key={i.id}>
                                    {i.nome} × {i.qtd} = R$ {(i.preco * i.qtd).toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-1 text-sm">
                                Subtotal: R$ {p.total.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Forma: {p.formaPagamento}
                              </p>
                            </div>
                            <button
                              onClick={() => confirmarPagamento(p)}
                              className="bg-blue-600 text-white text-sm px-3 py-1 rounded"
                            >
                              Marcar Pago
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => pagarTudo(lista)}
                          className="bg-red-600 text-white text-sm px-4 py-2 rounded"
                        >
                          Pagar Tudo
                        </button>
                        <button
                          onClick={() => enviarExtrato(cliente, lista)}
                          className="bg-green-600 text-white text-sm px-4 py-2 rounded"
                        >
                          Enviar Extrato
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
