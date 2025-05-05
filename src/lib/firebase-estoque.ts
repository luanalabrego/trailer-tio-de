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

const produtosRef = collection(db, 'produtos')

// Tipo reduzido para uso no estoque
export interface ProdutoEstoque {
  id: string
  nome: string
  estoque: number
}

// Lista apenas os campos essenciais para visualização de estoque
export async function listarEstoque(): Promise<ProdutoEstoque[]> {
  const snapshot = await getDocs(produtosRef)
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data()
    return {
      id: doc.id,
      nome: data.nome ?? '',
      estoque: Number(data.estoque ?? 0),
    }
  })
}

export async function criarProduto(nome: string, quantidade: number): Promise<void> {
  const novo = {
    nome,
    estoque: quantidade,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }
  await addDoc(produtosRef, novo)
}

export async function alterarEstoque(id: string, quantidade: number): Promise<void> {
  const ref = doc(db, 'produtos', id)
  await updateDoc(ref, {
    estoque: increment(quantidade),
    atualizadoEm: new Date(),
  })
}
