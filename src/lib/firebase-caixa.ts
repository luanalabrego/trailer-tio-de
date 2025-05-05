import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore'

const colecao = collection(db, 'vendas')

export async function registrarVenda(venda: any) {
  const vendaCompleta = {
    ...venda,
    data: Timestamp.now(),
    pago: venda.pago ?? false,
  }

  await addDoc(colecao, vendaCompleta)
}

export async function listarVendasDoDia() {
  const snapshot = await getDocs(colecao)
  const hoje = new Date().toISOString().split('T')[0]

  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter((v: any) => {
      const data = v.data?.toDate?.()
      return data?.toISOString().startsWith(hoje)
    }) as any[]
}
