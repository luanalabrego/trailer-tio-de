// lib/firebase-estoque.ts
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { RegistroEstoque } from '@/types'

export interface EstoqueItem {
  id: string
  nome: string
  quantidade: number
  inseridoEm: Timestamp
  validade: Timestamp
  atualizadoEm: Timestamp
}

const estoqueRef = collection(db, 'estoque')
// coleção para armazenar cada ajuste/remocão de estoque
const historicoRef = collection(db, 'estoque_historico')

export async function listarEstoque(): Promise<EstoqueItem[]> {
  const snap = await getDocs(estoqueRef)
  return snap.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      nome: d.nome as string,
      quantidade: d.quantidade as number,
      inseridoEm: d.inseridoEm as Timestamp,
      validade: d.validade as Timestamp,
      atualizadoEm: d.atualizadoEm as Timestamp,
    }
  })
}

export async function criarOuAtualizarItemEstoque(
  nome: string,
  quantidade: number,
  inseridoEm: Date,
  validade: Date
): Promise<void> {
  const tsInserido = Timestamp.fromDate(inseridoEm)
  const tsValidade = Timestamp.fromDate(validade)
  const now = Timestamp.now()

  const q = query(
    estoqueRef,
    where('nome', '==', nome),
    where('validade', '==', tsValidade)
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    const docRef = doc(db, 'estoque', snap.docs[0].id)
    await updateDoc(docRef, {
      quantidade: increment(quantidade),
      atualizadoEm: now,
    })
  } else {
    await addDoc(estoqueRef, {
      nome,
      quantidade,
      inseridoEm: tsInserido,
      validade: tsValidade,
      atualizadoEm: now,
    })
  }
}

/**
 * Ajusta (ou remove) a quantidade de um lote:
 * - Se a nova quantidade for > 0, atualiza o doc.
 * - Se for <= 0, deleta o documento.
 */
export async function ajustarQuantidade(
  id: string,
  novaQtd: number
): Promise<void> {
  const ref = doc(db, 'estoque', id)
  if (novaQtd > 0) {
    await updateDoc(ref, {
      quantidade: novaQtd,
      atualizadoEm: Timestamp.now(),
    })
  } else {
    // remove do banco se quantidade zerar
    await deleteDoc(ref)
  }
}

/**
 * Registra cada ajuste/remocão no histórico de estoque,
 * incluindo motivo e timestamp de quando ocorreu.
 */
export async function registrarHistoricoEstoque(
  entry: Omit<RegistroEstoque, 'id'>
): Promise<void> {
  await addDoc(historicoRef, {
    ...entry,
    criadoEm: Timestamp.now(),
  })
}
