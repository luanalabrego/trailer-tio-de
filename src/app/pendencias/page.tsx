'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import { listarClientes } from '@/lib/firebase-clientes'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  DocumentData,
} from 'firebase/firestore'
import type { Cliente, PedidoItem } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

type VendaUnificada = {
  id: string
  clienteId: string
  itens: PedidoItem[]
  total: number
  pago: boolean
  data: Timestamp
  formaPagamento: string
  cancelado?: boolean
}

// type guard para objetos Timestamp-like
function hasToDate(obj: unknown): obj is { toDate(): Date } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as { toDate?: unknown }).toDate === 'function'
  )
}

export default function PagamentosPendentesPage() {
  const [vendas, setVendas] = useState<VendaUnificada[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const normalizeTel = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    return digits.length > 11 ? digits.slice(-11) : digits
  }

  const carregar = useCallback(async () => {
    const [listaClientes, snapVendas, snapAgends] = await Promise.all([
      listarClientes(),
      getDocs(collection(db, 'vendas')),
      getDocs(collection(db, 'agendamentos')),
    ])
    setClientes(listaClientes)

    const mapTelToCliente = listaClientes.reduce<Record<string, string>>(
      (acc, c) => {
        acc[normalizeTel(c.telefone)] = c.id
        return acc
      },
      {}
    )

    // vendas normais pendentes, excluindo cancelados
    const pendentesVendas: VendaUnificada[] = snapVendas.docs
      .map(d => {
        const data = d.data() as DocumentData
        return {
          id: d.id,
          clienteId: String(data.clienteId),
          itens: (data.itens as PedidoItem[]) || [],
          total: Number(data.total),
          pago: Boolean(data.pago),
          data: data.criadoEm as Timestamp,
          formaPagamento: String(data.formaPagamento),
          cancelado: data.status === 'cancelado',
        }
      })
      .filter(v => !v.pago && !v.cancelado)

    // agendamentos pendentes, excluindo cancelados
    const pendentesAgend: VendaUnificada[] = snapAgends.docs
      .map(d => {
        const raw = d.data() as DocumentData
        const telNorm = normalizeTel(String(raw.whatsapp || ''))
        const clienteId =
          (raw.clienteId as string) || mapTelToCliente[telNorm] || ''
        return {
          id: d.id,
          clienteId,
          itens: (raw.itens as PedidoItem[]) || [],
          total: Number(raw.total),
          pago: Boolean(raw.pago),
          data: raw.dataHora as Timestamp,
          formaPagamento: String(raw.formaPagamento),
          cancelado: Boolean(raw.cancelado),
        }
      })
      .filter(a => !a.pago && !a.cancelado)

    setVendas([...pendentesVendas, ...pendentesAgend])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const confirmarPagamento = async (id: string) => {
    try {
      await updateDoc(doc(db, 'vendas', id), { pago: true })
    } catch {
      await updateDoc(doc(db, 'agendamentos', id), { pago: true })
    }
    await carregar()
  }

  const pagarTudo = async (lista: VendaUnificada[]) => {
    if (!confirm('Marcar todas como pagas?')) return
    await Promise.all(
      lista.map(v =>
        updateDoc(doc(db, 'vendas', v.id), { pago: true }).catch(() =>
          updateDoc(doc(db, 'agendamentos', v.id), { pago: true })
        )
      )
    )
    await carregar()
  }

  const enviarExtrato = (cliente: Cliente, lista: VendaUnificada[]) => {
    const linhas = lista.map(v => {
      const dataStr = formatarData(v.data)
      const itensText = v.itens
        .map(
          i =>
            `    - ${i.nome} × ${i.qtd} = R$ ${(
              i.preco * i.qtd
            ).toFixed(2)}`
        )
        .join('\n')
      return `Venda em ${dataStr}:\n${itensText}\n    Subtotal: R$ ${v.total.toFixed(
        2
      )}`
    })
    const totalGeral = lista.reduce((s, v) => s + v.total, 0).toFixed(2)
    const texto = [
      `Olá ${cliente.nome}, suas pendências no Trailer do tio Dé:`,
      ...linhas,
      `Total geral: R$ ${totalGeral}`,
      `Aguardamos seu pagamento. Obrigado!`,
    ].join('\n\n')
    const tel = normalizeTel(cliente.telefone)
    window.open(
      `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  const pendenciasPorCliente = vendas.reduce<
    Record<string, VendaUnificada[]>
  >((acc, v) => {
    const arr = acc[v.clienteId] || []
    arr.push(v)
    acc[v.clienteId] = arr
    return acc
  }, {})

  const formatarData = (
    dt: Timestamp | { toDate(): Date } | string
  ): string => {
    let dateObj: Date
    if (dt instanceof Timestamp) dateObj = dt.toDate()
    else if (hasToDate(dt)) dateObj = dt.toDate()
    else dateObj = new Date(dt)
    if (isNaN(dateObj.getTime())) return 'Inválida'
    return dateObj.toLocaleDateString('pt-BR')
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Pagamentos Pendentes
        </h1>

        {Object.keys(pendenciasPorCliente).length === 0 ? (
          <p className="text-gray-600">Não há pendências.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(pendenciasPorCliente).map(
              ([clienteId, lista]) => {
                const cliente = clientes.find(c => c.id === clienteId)
                if (!cliente) return null
                const total = lista.reduce((s, v) => s + v.total, 0)
                const open = expanded.has(clienteId)

                return (
                  <div
                    key={clienteId}
                    className="bg-white rounded-xl shadow border"
                  >
                    <button
                      onClick={() => {
                        const next = new Set(expanded)
                        if (next.has(clienteId)) next.delete(clienteId)
                        else next.add(clienteId)
                        setExpanded(next)
                      }}
                      className="w-full flex justify-between items-center p-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {cliente.nome}
                        </p>
                        <p className="text-sm text-gray-600">
                          {lista.length} pedido(s) — Total: R$ {total.toFixed(
                            2
                          )}
                        </p>
                      </div>
                      {open ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {open && (
                      <div className="px-4 pb-4 space-y-3">
                        <ul className="space-y-2">
                          {lista.map(v => (
                            <li
                              key={v.id}
                              className="flex justify-between items-start bg-gray-50 p-3 rounded"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  Data: {formatarData(v.data)}
                                </p>
                                <ul className="ml-4 text-sm">
                                  {v.itens.map(i => (
                                    <li key={i.id}>
                                      {i.nome} × {i.qtd} = R${' '}
                                      {(i.preco * i.qtd).toFixed(2)}
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-1 text-sm">
                                  Subtotal: R$ {v.total.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Forma: {v.formaPagamento}
                                </p>
                              </div>
                              <button
                                onClick={() => confirmarPagamento(v.id)}
                                className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 self-start"
                              >
                                Marcar Pago
                              </button>
                            </li>
                          ))}
                        </ul>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => pagarTudo(lista)}
                            className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700"
                          >
                            Pagar Tudo
                          </button>
                          <button
                            onClick={() => enviarExtrato(cliente, lista)}
                            className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700"
                          >
                            Enviar Extrato Completo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            )}
          </div>
        )}
      </div>
    </>
  )
}
