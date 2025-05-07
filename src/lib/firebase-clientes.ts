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
        aniversarioBr = data.aniversario.toDate().toLocaleDateString('pt-BR')
      } else if (typeof data.aniversario === 'string') {
        // converte "YYYY-MM-DD" → "DD/MM/YYYY"
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

export async function cadastrarCliente(
  dados: Omit<Cliente, 'id'>
): Promise<Cliente> {
  // prepara aniversário para salvar: aceita 'DD/MM/YYYY' ou 'YYYY-MM-DD'
  let aniversarioSalvar: string | Timestamp = dados.aniversario || ''
  if (typeof aniversarioSalvar === 'string' && aniversarioSalvar.includes('/')) {
    // converte "DD/MM/YYYY" -> "YYYY-MM-DD"
    const [dd, mm, yyyy] = aniversarioSalvar.split('/')
    aniversarioSalvar = `${yyyy}-${mm}-${dd}`
  }
  // opcional: para salvar como Timestamp em vez de string, descomente:
  // aniversarioSalvar = Timestamp.fromDate(new Date(aniversarioSalvar))

  const clienteData = {
    nome: dados.nome,
    telefone: dados.telefone,
    aniversario: aniversarioSalvar,
    observacoes: dados.observacoes || '',
    totalGasto: dados.totalGasto || 0,
  }

  const docRef = await addDoc(colecao, clienteData)
  return {
    id: docRef.id,
    ...clienteData,
    aniversario:
      typeof aniversarioSalvar === 'string'
        ? // já estava em YYYY-MM-DD, converta para DD/MM/YYYY
          aniversarioSalvar
            .split('-')
            .reverse()
            .join('/')
        : // Timestamp
          (aniversarioSalvar as Timestamp).toDate().toLocaleDateString('pt-BR'),
  }
}

export async function salvarCliente(
  dados: Partial<Cliente> & { id: string }
): Promise<void> {
  // usada apenas para atualizar um cliente existente
  const refDoc = doc(db, 'clientes', dados.id)
  const payload: any = { ...dados }
  if (payload.aniversario && typeof payload.aniversario === 'string') {
    // converte para padrão de armazenamento
    const [dd, mm, yyyy] = payload.aniversario.split('/')
    payload.aniversario = `${yyyy}-${mm}-${dd}`
  }
  delete payload.id
  await updateDoc(refDoc, payload)
}

export async function excluirCliente(id: string): Promise<void> {
  const refDoc = doc(db, 'clientes', id)
  await deleteDoc(refDoc)
}
