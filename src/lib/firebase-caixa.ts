import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { Venda } from '@/types'

const colecao = collection(db, 'vendas')

export async function registrarVenda(venda: Omit<Venda, 'id' | 'data'>) {
  const vendaCompleta = {
    ...venda,
    data: Timestamp.now(),
    pago: venda.pago ?? false,
  }

  await addDoc(colecao, vendaCompleta)
}

export async function listarVendasDoDia(): Promise<Venda[]> {
  const snapshot = await getDocs(colecao)
  const hoje = new Date().toISOString().split('T')[0]

  return snapshot.docs
    .map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data()
      return {
        id: doc.id,
        clienteId: data.clienteId,
        itens: data.itens,
        formaPagamento: data.formaPagamento,
        total: Number(data.total),
        pago: data.pago,
        data: data.data,
      } as Venda
    })
    .filter((v) => {
      const data = v.data?.toDate?.()
      return data?.toISOString().startsWith(hoje)
    })
}
