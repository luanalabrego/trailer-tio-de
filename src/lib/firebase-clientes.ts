// src/lib/firebase-clientes.ts

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
  Timestamp,
} from 'firebase/firestore'
import { Cliente } from '@/types'

const colecao = collection(db, 'clientes')

export async function listarClientes(): Promise<Cliente[]> {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const data = docSnap.data()

    // formata aniversário para DD/MM/YYYY
    let aniversarioBr = ''
    if (data.aniversario) {
      if (data.aniversario instanceof Timestamp) {
        aniversarioBr = data.aniversario
          .toDate()
          .toLocaleDateString('pt-BR')
      } else if (typeof data.aniversario === 'string') {
        // converte "YYYY-MM-DD" → "DD/MM/YYYY" manualmente
        const [yyyy, mm, dd] = data.aniversario.split('-')
        aniversarioBr = `${dd}/${mm}/${yyyy}`
      }
    }

    return {
      id: docSnap.id,
      nome: data.nome as string,
      telefone: data.telefone as string,
      aniversario: aniversarioBr,
      observacoes: (data.observacoes as string) || '',
      totalGasto: Number(data.totalGasto ?? 0),
    }
  })
}

export async function salvarCliente(
  dados: Partial<Cliente>
): Promise<Cliente | void> {
  // prepara aniversário para salvar: aceita 'DD/MM/YYYY' ou 'YYYY-MM-DD'
  let aniversarioSalvar: string | Timestamp = dados.aniversario || ''
  if (typeof aniversarioSalvar === 'string' && aniversarioSalvar.includes('/')) {
    // converte "DD/MM/YYYY" -> "YYYY-MM-DD"
    const [dd, mm, yyyy] = aniversarioSalvar.split('/')
    aniversarioSalvar = `${yyyy}-${mm}-${dd}`
  }
  // opcional: se quiser salvar como Timestamp em vez de string, descomente:
  // if (typeof aniversarioSalvar === 'string') {
  //   aniversarioSalvar = Timestamp.fromDate(new Date(aniversarioSalvar))
  // }

  const cliente = {
    nome: dados.nome,
    telefone: dados.telefone,
    aniversario: aniversarioSalvar,
    observacoes: dados.observacoes || '',
    totalGasto: dados.totalGasto || 0,
  }

  if (dados.id) {
    const refDoc = doc(db, 'clientes', dados.id)
    await updateDoc(refDoc, cliente)
  } else {
    const novo = await addDoc(colecao, cliente)
    return { ...cliente, id: novo.id } as Cliente
  }
}

export async function excluirCliente(id: string) {
  const refDoc = doc(db, 'clientes', id)
  await deleteDoc(refDoc)
}
