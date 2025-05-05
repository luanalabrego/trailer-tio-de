import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore'
import { Cliente } from '@/types'

const colecao = collection(db, 'clientes')

export async function listarClientes(): Promise<Cliente[]> {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
    const data = doc.data()
    return {
      id: doc.id,
      nome: data.nome as string,
      telefone: data.telefone as string,
      aniversario: data.aniversario,
      observacoes: data.observacoes,
      totalGasto: Number(data.totalGasto ?? 0)
    }
  })
}

export async function salvarCliente(dados: Partial<Cliente>) {
  const cliente = {
    nome: dados.nome,
    telefone: dados.telefone,
    aniversario: dados.aniversario || '',
    observacoes: dados.observacoes || '',
    totalGasto: dados.totalGasto || 0,
  }

  if (dados.id) {
    const refDoc = doc(db, 'clientes', dados.id)
    await updateDoc(refDoc, cliente)
  } else {
    const novo = await addDoc(colecao, cliente)
    return { ...cliente, id: novo.id }
  }
}

export async function excluirCliente(id: string) {
  const refDoc = doc(db, 'clientes', id)
  await deleteDoc(refDoc)
}
