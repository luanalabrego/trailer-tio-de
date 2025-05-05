'use client'

import { useEffect, useState } from 'react'
import { db } from '@/firebase/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Header } from '@/components/Header'
import { Venda, Custo } from '@/types'

export default function FinanceiroPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [custos, setCustos] = useState<Custo[]>([])
  const [acessoNegado, setAcessoNegado] = useState(false)

  useEffect(() => {
    const perfil = localStorage.getItem('perfil')
    if (perfil !== 'ADM') {
      setAcessoNegado(true)
    } else {
      carregar()
    }
  }, [])

  const carregar = async () => {
    const snapVendas = await getDocs(collection(db, 'vendas'))
    const snapCustos = await getDocs(collection(db, 'custos'))

    const listaVendas = snapVendas.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        clienteId: data.clienteId,
        itens: data.itens,
        formaPagamento: data.formaPagamento,
        total: Number(data.total),
        pago: data.pago,
        data: data.data
      }
    })

    const listaCustos = snapCustos.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        descricao: data.descricao,
        valor: Number(data.valor),
        data: data.data
      }
    })

    setVendas(listaVendas)
    setCustos(listaCustos)
  }

  const totais = vendas.reduce(
    (acc, v) => {
      const valor = v.total || 0
      const forma = v.formaPagamento || 'outro'

      if (v.pago) {
        acc.receita += valor
        acc.porForma[forma] = (acc.porForma[forma] || 0) + valor
      } else {
        acc.pendente += valor
      }

      return acc
    },
    { receita: 0, pendente: 0, porForma: {} as Record<string, number> }
  )

  const totalCustos = custos.reduce((acc, cur) => acc + (cur.valor || 0), 0)
  const lucro = totais.receita - totalCustos
  const margem = totais.receita > 0 ? (lucro / totais.receita) * 100 : 0

  return (
    <>
      <Header />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        {acessoNegado ? (
          <div className="text-center text-red-600 text-lg font-semibold">
            Acesso negado — esta área é restrita a administradores.
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Resumo Financeiro</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">R$ {totais.receita.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Total Pendente</p>
                <p className="text-2xl font-bold text-red-600">R$ {totais.pendente.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Total de Custos</p>
                <p className="text-2xl font-bold text-orange-600">R$ {totalCustos.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded shadow text-center">
                <p className="text-sm text-gray-500">Lucro</p>
                <p className="text-2xl font-bold text-blue-600">R$ {lucro.toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-1">Margem: {margem.toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2 text-gray-800">Recebido por Forma de Pagamento</h2>
              <ul className="text-sm text-gray-700 space-y-1">
                {Object.entries(totais.porForma).map(([forma, valor]) => (
                  <li key={forma} className="flex justify-between">
                    <span>{forma}</span>
                    <span className="font-medium">R$ {valor.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  )
}
