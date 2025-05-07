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
} from 'firebase/firestore'
import { Cliente, Venda, PedidoItem } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

type VendaUnificada = Omit<Venda, 'id'> & { id: string }

export default function PagamentosPendentesPage() {
  const [vendas, setVendas] = useState<VendaUnificada[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    const [listaClientes, snapVendas, snapAgendamentos] = await Promise.all([
      listarClientes(),
      getDocs(collection(db, 'vendas')),
      getDocs(collection(db, 'agendamentos')),
    ])
    setClientes(listaClientes)

    // mapeia telefone → clienteId
    const mapClientePorTel = listaClientes.reduce<Record<string, string>>(
      (acc, c) => {
        const tel = c.telefone.replace(/\D/g, '')
        acc[tel] = c.id
        return acc
      },
      {}
    )

    // pendências de vendas
    const pendentesVendas: VendaUnificada[] = snapVendas.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Venda, 'id'>) }))
      .filter(v => !v.pago)

    // pendências de agendamentos
    const pendentesAgend: VendaUnificada[] = snapAgendamentos.docs
      .map(d => {
        const raw = d.data() as Record<string, any>
        // use raw.clienteId if você salvou no agendamento, ou fallback por telefone
        const clienteId =
          (raw.clienteId as string | undefined) ||
          mapClientePorTel[
            String(raw.whatsapp || '').replace(/\D/g, '').slice(-11)
          ] ||
          ''
        return {
          id: d.id,
          itens: raw.itens as PedidoItem[],
          total: Number(raw.total),
          pago: Boolean(raw.pago),
          data: raw.dataHora, // pode ser Timestamp ou ISO string
          formaPagamento: String(raw.formaPagamento),
          clienteId,
        }
      })
      .filter(a => !a.pago)

    setVendas([...pendentesVendas, ...pendentesAgend])
  }

  async function confirmarPagamento(id: string) {
    // tenta em 'vendas', senão em 'agendamentos'
    try {
      await updateDoc(doc(db, 'vendas', id), { pago: true })
    } catch {
      await updateDoc(doc(db, 'agendamentos', id), { pago: true })
    }
    await carregar()
  }

  async function pagarTudo(vendasCliente: VendaUnificada[]) {
    if (
      !confirm(
        'Deseja mesmo marcar todas as pendências deste cliente como pagas?'
      )
    )
      return

    await Promise.all(
      vendasCliente.map(v =>
        updateDoc(doc(db, 'vendas', v.id), { pago: true }).catch(() =>
          updateDoc(doc(db, 'agendamentos', v.id), { pago: true })
        )
      )
    )
    await carregar()
  }

  function enviarExtrato(cliente: Cliente, vendasCliente: VendaUnificada[]) {
    const linhas = vendasCliente.map(v => {
      const dataStr = formatarData(v.data)
      const itens = v.itens
        .map(i => `    - ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`)
        .join('\n')
      return `Venda em ${dataStr}:\n${itens}\n    Subtotal: R$ ${v.total.toFixed(2)}`
    })
    const total = vendasCliente.reduce((s, v) => s + v.total, 0).toFixed(2)
    const texto = [
      `Olá ${cliente.nome}, suas pendências no Trailer do tio Dé:`,
      ...linhas,
      `Total geral: R$ ${total}`,
      `Aguardamos seu pagamento. Obrigado!`,
    ].join('\n\n')
    const tel = cliente.telefone.replace(/\D/g, '')
    window.open(
      `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  // agrupa por clienteId
  const porCliente = vendas.reduce<Record<string, VendaUnificada[]>>(
    (acc, v) => {
      ;(acc[v.clienteId] ??= []).push(v)
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

  function formatarData(dt: any): string {
    let d: Date
    if (dt?.toDate) d = dt.toDate()
    else d = new Date(dt)
    return isNaN(d.getTime()) ? 'Inválida' : d.toLocaleDateString('pt-BR')
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Pagamentos Pendentes
        </h1>

        {Object.keys(porCliente).length === 0 ? (
          <p className="text-gray-600">Não há pendências.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(porCliente).map(([clienteId, list]) => {
              const cliente = clientes.find(c => c.id === clienteId)
              if (!cliente) return null
              const total = list.reduce((s, v) => s + v.total, 0)
              const open = expanded.has(clienteId)

              return (
                <div key={clienteId} className="bg-white rounded-xl shadow border">
                  <button
                    onClick={() => toggle(clienteId)}
                    className="w-full flex justify-between items-center p-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {cliente.nome}
                      </p>
                      <p className="text-sm text-gray-600">
                        {list.length} pedido(s) — Total: R$ {total.toFixed(2)}
                      </p>
                    </div>
                    {open ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3">
                      <ul className="space-y-2">
                        {list.map(v => (
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
                          onClick={() => pagarTudo(list)}
                          className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700"
                        >
                          Pagar Tudo
                        </button>
                        <button
                          onClick={() => enviarExtrato(cliente, list)}
                          className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700"
                        >
                          Enviar Extrato Completo
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
