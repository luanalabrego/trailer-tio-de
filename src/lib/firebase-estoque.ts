import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  increment,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore'
import { Produto } from '@/types'

const produtosRef = collection(db, 'produtos')

export async function listarEstoque(): Promise<Produto[]> {
  const snapshot = await getDocs(produtosRef)
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data()
    return {
      id: doc.id,
      nome: data.nome as string,
      estoque: Number(data.estoque ?? 0),
    }
  })
}

export async function criarProduto(nome: string, quantidade: number) {
  const novo = {
    nome,
    estoque: quantidade,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }
  await addDoc(produtosRef, novo)
}

export async function alterarEstoque(id: string, quantidade: number) {
  const ref = doc(db, 'produtos', id)
  await updateDoc(ref, {
    estoque: increment(quantidade),
    atualizadoEm: new Date()
  })
}
