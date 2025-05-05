import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore'

const colecao = collection(db, 'clientes')

export async function listarClientes() {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[]
}

export async function salvarCliente(dados: any) {
  const cliente = {
    nome: dados.nome,
    telefone: dados.telefone,
    aniversario: dados.aniversario,
    observacoes: dados.observacoes || '',
    totalGasto: dados.totalGasto || 0,
  }

  if (dados.id) {
    const refDoc = doc(db, 'clientes', dados.id)
    await updateDoc(refDoc, cliente)
  } else {
    await addDoc(colecao, cliente)
  }
}

export async function excluirCliente(id: string) {
  const refDoc = doc(db, 'clientes', id)
  await deleteDoc(refDoc)
}
