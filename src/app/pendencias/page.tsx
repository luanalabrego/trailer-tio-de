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

export default function PagamentosPendentesPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const [listaClientes, snapVendas] = await Promise.all([
      listarClientes(),
      getDocs(collection(db, 'vendas')),
    ])
    setClientes(listaClientes)
    const pendentes = snapVendas.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Venda))
      .filter(v => !v.pago)
    setVendas(pendentes)
  }

  async function confirmarPagamento(id: string) {
    await updateDoc(doc(db, 'vendas', id), { pago: true })
    await carregar()
  }

  async function pagarTudo(vendasCliente: Venda[]) {
    if (!confirm('Deseja mesmo marcar todas as pendências deste cliente como pagas?')) {
      return
    }
    await Promise.all(
      vendasCliente.map(v => updateDoc(doc(db, 'vendas', v.id), { pago: true }))
    )
    await carregar()
  }

  function enviarExtrato(cliente: Cliente, vendasCliente: Venda[]) {
    const linhasPorVenda = vendasCliente.map(v => {
      const dataStr = formatarData(v)
      const itensList = (v.itens as PedidoItem[])
        .map(i =>
          `    - ${i.nome} × ${i.qtd} = R$ ${(i.preco * i.qtd).toFixed(2)}`
        )
        .join('\n')
      return `Venda em ${dataStr}:\n${itensList}\n    Subtotal: R$ ${v.total.toFixed(2)}`
    })
    const totalGeral = vendasCliente
      .reduce((sum, v) => sum + v.total, 0)
      .toFixed(2)
    const texto = [
      `Olá ${cliente.nome}, aqui estão suas pendências do mês no Trailer do tio Dé:`,
      ...linhasPorVenda,
      `Total geral: R$ ${totalGeral}`,
      `Aguardamos o pagamento, obrigado! É ótimo te ter como nosso cliente.`
    ].join('\n\n')
    const tel = cliente.telefone.replace(/\D/g, '')
    window.open(
      `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,
      '_blank'
    )
  }

  // agrupa vendas pendentes por clienteId
  const vendasPorCliente = vendas.reduce<Record<string, Venda[]>>((acc, v) => {
    (acc[v.clienteId] ??= []).push(v)
    return acc
  }, {})

  function toggle(clienteId: string) {
    const s = new Set(expanded)
    s.has(clienteId) ? s.delete(clienteId) : s.add(clienteId)
    setExpanded(s)
  }

  function formatarData(v: Venda) {
    if (v.data && typeof (v.data as any).toDate === 'function') {
      return (v.data as any).toDate().toLocaleDateString('pt-BR')
    }
    return new Date(v.data as any).toLocaleDateString('pt-BR')
  }

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Pagamentos Pendentes
        </h1>

        {Object.entries(vendasPorCliente).length === 0 ? (
          <p className="text-gray-600">Não há pagamentos pendentes.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(vendasPorCliente).map(([clienteId, vendasCliente]) => {
              const cliente = clientes.find(c => c.id === clienteId)
              if (!cliente) return null
              const totalCliente = vendasCliente.reduce((sum, v) => sum + v.total, 0)
              const isOpen = expanded.has(clienteId)

              return (
                <div
                  key={clienteId}
                  className="bg-white rounded-xl shadow border"
                >
                  {/* Cabeçalho */}
                  <button
                    onClick={() => toggle(clienteId)}
                    className="w-full flex justify-between items-center p-4"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{cliente.nome}</p>
                      <p className="text-sm text-gray-600">
                        {vendasCliente.length} pedido(s) — Total: R$ {totalCliente.toFixed(2)}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                  </button>

                  {/* Detalhes expandidos */}
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <ul className="space-y-2">
                        {vendasCliente.map(v => (
                          <li
                            key={v.id}
                            className="flex justify-between items-start bg-gray-50 p-3 rounded"
                          >
                            <div>
                              <p className="text-sm font-medium">Data: {formatarData(v)}</p>
                              <ul className="ml-4 text-sm">
                                {(v.itens as PedidoItem[]).map(i => (
                                  <li key={i.id}>
                                    {i.nome} × {i.qtd} = R$ {(i.preco * i.qtd).toFixed(2)}
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
                          onClick={() => pagarTudo(vendasCliente)}
                          className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700"
                        >
                          Pagar Tudo
                        </button>
                        <button
                          onClick={() => enviarExtrato(cliente, vendasCliente)}
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
