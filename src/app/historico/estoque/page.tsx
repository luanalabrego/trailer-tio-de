import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { EstoqueItem, RegistroEstoque } from '@/types'

const estoqueCol = collection(db, 'estoque')
const historicoCol = collection(db, 'estoque_historico')

export async function ajustarQuantidade(
  id: string,
  novaQuantidade: number
): Promise<void> {
  await updateDoc(doc(db, 'estoque', id), { quantidade: novaQuantidade })
}

export async function registrarHistoricoEstoque(entry: Omit<RegistroEstoque, 'id'>) {
  await addDoc(historicoCol, {
    ...entry,
    criadoEm: Timestamp.now(),
  })
}
