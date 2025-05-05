import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { Categoria } from '@/types'

const colecao = collection(db, 'categorias')

export async function listarCategorias(): Promise<Categoria[]> {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    nome: doc.data().nome as string,
  }))
}

export async function salvarCategoria(dados: Partial<Categoria>) {
  if (dados.id) {
    const refDoc = doc(db, 'categorias', dados.id)
    await updateDoc(refDoc, { nome: dados.nome })
  } else {
    await addDoc(colecao, { nome: dados.nome })
  }
}

export async function excluirCategoria(id: string) {
  const refDoc = doc(db, 'categorias', id)
  await deleteDoc(refDoc)
}
