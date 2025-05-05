import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore'

const colecao = collection(db, 'categorias')

export async function listarCategorias() {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[]
}

export async function salvarCategoria(dados: any) {
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
