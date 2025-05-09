'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { listarVendasDoDia } from '@/lib/firebase-caixa'
import { Venda, PedidoItem } from '@/types'
import { Timestamp } from 'firebase/firestore'

export default function HistoricoVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])

  useEffect(() => {
    async function carregarVendas() {
      const v = await listarVendasDoDia()
      setVendas(v)
    }
    carregarVendas()
  }, [])

  function formatarData(dt?: Date | string | Timestamp) {
    if (!dt) return '—'
    let date: Date
    if (dt instanceof Timestamp) date = dt.toDate()
    else if (typeof dt === 'string') date = new Date(dt)
    else date = dt
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <Header />
      <main className="pt-20 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Histórico de Vendas</h1>

        {vendas.length === 0 ? (
          <p className="text-gray-600">Nenhuma venda registrada hoje.</p>
        ) : (
          <ul className="space-y-4">
            {vendas.map(v => (
              <li
                key={v.id}
                className="bg-white p-4 rounded-xl shadow flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Venda: {v.id}</span>
                  <span className="text-sm text-gray-600">
                    {formatarData(
                      // ajuste conforme seu campo de criação
                      (v as any).criadoEm || (v as any).createdAt
                    )}
                  </span>
                </div>

                <ul className="ml-4 list-disc text-sm">
                  {v.itens.map((i: PedidoItem) => (
                    <li key={i.id}>
                      {i.nome} × {i.qtd} = R$ {(i.preco * i.qtd).toFixed(2)}
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-gray-600">
                  Total: <strong>R$ {v.total.toFixed(2)}</strong>
                </p>

                <p className="text-sm text-gray-600">
                  Status: <strong>{v.pago ? 'Pago' : 'Pendente'}</strong>
                </p>

                {v.pago && v.formaPagamento && (
                  <p className="text-sm text-gray-600">
                    Forma de pagamento: <strong>{v.formaPagamento}</strong>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
