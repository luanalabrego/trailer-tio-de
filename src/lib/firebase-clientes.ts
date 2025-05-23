// src/lib/firebase-clientes.ts

import { db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  CollectionReference,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { Cliente } from '@/types'

// tipo bruto dos dados como estão no Firestore
type ClienteRaw = {
  nome: string
  telefone: string
  aniversario?: string | Timestamp
  observacoes?: string
  totalGasto?: number
}

// referenciamos a coleção como ClienteRaw para que aniversario possa ser Timestamp ou string
const colecao = collection(
  db,
  'clientes'
) as CollectionReference<ClienteRaw>

export async function listarClientes(): Promise<Cliente[]> {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map(
    (docSnap: QueryDocumentSnapshot<ClienteRaw>) => {
      const data = docSnap.data()

      // formata aniversário para DD/MM/YYYY
      let aniversarioBr = ''
      if (data.aniversario) {
        if (data.aniversario instanceof Timestamp) {
          aniversarioBr = data.aniversario
            .toDate()
            .toLocaleDateString('pt-BR')
        } else {
          // string "YYYY-MM-DD"
          const [yyyy, mm, dd] = data.aniversario.split('-')
          aniversarioBr = `${dd}/${mm}/${yyyy}`
        }
      }

      return {
        id: docSnap.id,
        nome: data.nome,
        telefone: data.telefone,
        aniversario: aniversarioBr,
        observacoes: data.observacoes ?? '',
        totalGasto: Number(data.totalGasto ?? 0),
      }
    }
  )
}

export async function cadastrarCliente(
  dados: Omit<Cliente, 'id'>
): Promise<Cliente> {
  // prepara aniversário para salvar: aceita 'DD/MM/YYYY' ou 'YYYY-MM-DD'
  let aniversarioSalvar: string | Timestamp = dados.aniversario ?? ''
  if (typeof aniversarioSalvar === 'string' && aniversarioSalvar.includes('/')) {
    const [dd, mm, yyyy] = aniversarioSalvar.split('/')
    aniversarioSalvar = `${yyyy}-${mm}-${dd}`
  }

  const clienteData: Omit<Cliente, 'id'> = {
    nome: dados.nome,
    telefone: dados.telefone,
    aniversario: aniversarioSalvar,
    observacoes: dados.observacoes ?? '',
    totalGasto: dados.totalGasto ?? 0,
  }

  const docRef = await addDoc(colecao, clienteData)

  // formata aniversário para retorno em DD/MM/YYYY
  const formattedAniversario =
    typeof aniversarioSalvar === 'string'
      ? aniversarioSalvar.split('-').reverse().join('/')
      : (aniversarioSalvar as Timestamp)
          .toDate()
          .toLocaleDateString('pt-BR')

  return {
    id: docRef.id,
    nome: clienteData.nome,
    telefone: clienteData.telefone,
    aniversario: formattedAniversario,
    observacoes: clienteData.observacoes,
    totalGasto: clienteData.totalGasto,
  }
}

export async function salvarCliente(
  dados: Partial<Cliente> & { id: string }
): Promise<void> {
  const refDoc = doc(db, 'clientes', dados.id)
  const payload: Partial<Omit<Cliente, 'id'>> = {}

  if (dados.nome !== undefined) payload.nome = dados.nome
  if (dados.telefone !== undefined) payload.telefone = dados.telefone
  if (dados.aniversario !== undefined) {
    let aniversarioSalvar = dados.aniversario
    if (aniversarioSalvar.includes('/')) {
      const [dd, mm, yyyy] = aniversarioSalvar.split('/')
      aniversarioSalvar = `${yyyy}-${mm}-${dd}`
    }
    payload.aniversario = aniversarioSalvar
  }
  if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes
  if (dados.totalGasto !== undefined) payload.totalGasto = dados.totalGasto

  await updateDoc(refDoc, payload)
}

export async function excluirCliente(id: string): Promise<void> {
  const refDoc = doc(db, 'clientes', id)
  await deleteDoc(refDoc)
}
