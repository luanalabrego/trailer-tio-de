// src/lib/firebase-caixa.ts
import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import type { Venda } from '@/types'

const colecao = collection(db, 'vendas')

/**
 * Registra uma nova venda com timestamp e orderNumber opcional.
 */
export async function registrarVenda(
  venda: Omit<Venda, 'id' | 'criadoEm'>
): Promise<void> {
  // Define um type-safe payload sem usar `any`
  type Payload = Omit<Venda, 'id' | 'criadoEm'> & {
    criadoEm: Timestamp
    pago: boolean
    orderNumber?: number
  }

  const payload: Payload = {
    ...venda,
    criadoEm: Timestamp.now(),
    pago: venda.pago ?? false,
  }

  if (venda.orderNumber !== undefined) {
    payload.orderNumber = venda.orderNumber
  }

  await addDoc(colecao, payload)
}

/**
 * Lista apenas as vendas do dia atual, da mais recente para a mais antiga.
 */
export async function listarVendasDoDia(): Promise<Venda[]> {
  const hoje = new Date()
  const inicio = Timestamp.fromDate(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0, 0)
  )
  const fim = Timestamp.fromDate(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999)
  )

  const q = query(
    colecao,
    where('criadoEm', '>=', inicio),
    where('criadoEm', '<=', fim),
    orderBy('criadoEm', 'desc')
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      clienteId: data.clienteId,
      itens: data.itens,
      formaPagamento: data.formaPagamento || '',
      total: Number(data.total),
      pago: Boolean(data.pago),
      criadoEm: data.criadoEm as Timestamp,
      orderNumber: (data.orderNumber as number) || undefined,
    } as Venda
  })
}

/**
 * Lista todo o histórico de vendas, sem filtro de data, da mais recente para a mais antiga.
 */
export async function listarHistoricoVendas(): Promise<Venda[]> {
  const q = query(colecao, orderBy('criadoEm', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      clienteId: data.clienteId,
      itens: data.itens,
      formaPagamento: data.formaPagamento || '',
      total: Number(data.total),
      pago: Boolean(data.pago),
      criadoEm: data.criadoEm as Timestamp,
      orderNumber: (data.orderNumber as number) || undefined,
    } as Venda
  })
}
