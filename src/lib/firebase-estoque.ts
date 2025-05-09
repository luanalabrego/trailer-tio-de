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
  produtoId: string
  quantidade: number
  inseridoEm: Timestamp
  validade: Timestamp
  atualizadoEm: Timestamp
}

const estoqueRef = collection(db, 'estoque')
// coleção para armazenar cada ajuste/remoção de estoque
const historicoRef = collection(db, 'estoque_historico')

/**
 * Retorna todos os lotes em estoque, com referência ao produtoId.
 */
export async function listarEstoque(): Promise<EstoqueItem[]> {
  const snap = await getDocs(estoqueRef)
  return snap.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      produtoId: d.produtoId as string,
      quantidade: d.quantidade as number,
      inseridoEm: d.inseridoEm as Timestamp,
      validade: d.validade as Timestamp,
      atualizadoEm: d.atualizadoEm as Timestamp,
    }
  })
}

/**
 * Cria um novo lote ou atualiza a quantidade de um lote existente
 * (mesmo produtoId + mesma validade).
 */
export async function criarOuAtualizarItemEstoque(
  produtoId: string,
  quantidade: number,
  inseridoEm: Date,
  validade: Date
): Promise<void> {
  const tsInserido = Timestamp.fromDate(inseridoEm)
  const tsValidade = Timestamp.fromDate(validade)
  const now = Timestamp.now()

  // busca lote já existente para este produto e validade
  const q = query(
    estoqueRef,
    where('produtoId', '==', produtoId),
    where('validade', '==', tsValidade)
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    // atualiza quantidade
    const docRef = doc(db, 'estoque', snap.docs[0].id)
    await updateDoc(docRef, {
      quantidade: increment(quantidade),
      atualizadoEm: now,
    })
  } else {
    // cria novo lote
    await addDoc(estoqueRef, {
      produtoId,
      quantidade,
      inseridoEm: tsInserido,
      validade: tsValidade,
      atualizadoEm: now,
    })
  }
}

/**
 * Ajusta (ou remove) a quantidade de um lote específico.
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
    // remove do banco se zerar
    await deleteDoc(ref)
  }
}

/**
 * Registra cada ajuste/remoção no histórico de estoque,
 * incluindo produtoId, nome legível, motivo e timestamp.
 */
export async function registrarHistoricoEstoque(
  entry: Omit<RegistroEstoque, 'id'>
): Promise<void> {
  await addDoc(historicoRef, {
    produtoId: entry.produtoId,
    nome: entry.nome,       // mantém o nome para histórico legível
    ajuste: entry.ajuste,
    motivo: entry.motivo,
    criadoEm: Timestamp.now(),
  })
}
