// src/app/pendencias/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
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

type VendaUnificada = {
  id: string
  clienteId: string
  itens: PedidoItem[]
  total: number
  pago: boolean
  data: Timestamp
  formaPagamento: string
}

export default function PagamentosPendentesPage() {
  const [vendas, setVendas] = useState<VendaUnificada[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // padroniza telefone para lookup (DDD + número)
  const normalizeTel = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    return digits.length > 11 ? digits.slice(-11) : digits
  }

  // carrega vendas + agendamentos pendentes
  const carregar = useCallback(async () => {
    const [listaClientes, snapVendas, snapAgends] = await Promise.all([
      listarClientes(),
      getDocs(collection(db, 'vendas')),
      getDocs(collection(db, 'agendamentos')),
    ])
    setClientes(listaClientes)

    // mapa telefone → clienteId
    const mapTelToCliente = listaClientes.reduce<Record<string, string>>(
      (acc, c) => {
        acc[ normalizeTel(c.telefone) ] = c.id
        return acc
      },
      {}
    )

    // pendências de vendas
    const pendentesVendas: VendaUnificada[] = snapVendas.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Venda, 'id'>) }))
      .filter(v => !v.pago)
      .map(v => ({
        id: v.id,
        clienteId: v.clienteId,
        itens: v.itens as PedidoItem[],
        total: v.total,
        pago: v.pago,
        data: v.data as Timestamp,
        formaPagamento: v.formaPagamento,
      }))

    // pendências de agendamentos
    const pendentesAgend: VendaUnificada[] = snapAgends.docs
      .map(d => {
        const raw = d.data() as Record<string, unknown>
        // agendamento pode ter clienteId ou só Whatsapp
        const telNorm = normalizeTel((raw.whatsapp as string) || '')
        const clienteId = (raw.clienteId as string) || mapTelToCliente[telNorm] || ''
        return {
          id: d.id,
          clienteId,
          itens: (raw.itens as PedidoItem[]) || [],
          total: Number(raw.total),
          pago: Boolean(raw.pago),
          data: raw.dataHora as Timestamp,
          formaPagamento: String(raw.formaPagamento),
        }
      })
      .filter(a => !a.pago)

    setVendas([ ...pendentesVendas, ...pendentesAgend ])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // marca pago em vendas ou agendamentos
  const confirmarPagamento = async (id: string) => {
    try {
      await updateDoc(doc(db, 'vendas', id), { pago: true })
    } catch {
      await updateDoc(doc(db, 'agendamentos', id), { pago: true })
    }
    await carregar()
  }

  // marca todas as pendências de um cliente como pagas
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

  // dispara WhatsApp com resumo de pendências
  const enviarExtrato = (cliente: Cliente, lista: VendaUnificada[]) => {
    const linhas = lista.map(v => {
      const dataStr = formatarData(v.data)
      const itensText = v.itens
        .map(i => `    - ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`)
        .join('\n')
      return `Venda em ${dataStr}:\n${itensText}\n    Subtotal: R$ ${v.total.toFixed(2)}`
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

  // agrupa por clienteId
  const pendenciasPorCliente = vendas.reduce<Record<string, VendaUnificada[]>>(
    (acc, v) => {
      const arr = acc[v.clienteId] || []
      arr.push(v)
      acc[v.clienteId] = arr
      return acc
    },
    {}
  )

  const formatarData = (dt: Timestamp | { toDate(): Date } | string) => {
    const dateObj =
      dt instanceof Timestamp
        ? dt.toDate()
        : 'toDate' in (dt as any)
        ? (dt as { toDate(): Date }).toDate()
        : new Date(dt as string)
    return isNaN(dateObj.getTime())
      ? 'Inválida'
      : dateObj.toLocaleDateString('pt-BR')
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
                        const s = new Set(expanded)
                        s.has(clienteId) ? s.delete(clienteId) : s.add(clienteId)
                        setExpanded(s)
                      }}
                      className="w-full flex justify-between items-center p-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {cliente.nome}
                        </p>
                        <p className="text-sm text-gray-600">
                          {lista.length} pedido(s) — Total: R$ {total.toFixed(2)}
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
