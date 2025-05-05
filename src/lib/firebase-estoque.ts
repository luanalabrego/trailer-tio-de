import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  increment,
} from 'firebase/firestore'

const produtosRef = collection(db, 'produtos')

export async function listarEstoque() {
  const snapshot = await getDocs(produtosRef)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[]
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
