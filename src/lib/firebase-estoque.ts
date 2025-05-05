import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore'

export interface EstoqueItem {
  id: string
  nome: string
  quantidade: number
  inseridoEm: Timestamp
  validade: Timestamp
  atualizadoEm: Timestamp
}

const estoqueRef = collection(db, 'estoque')

/**
 * Lista todos os itens de estoque
 */
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

/**
 * Cria ou, se existir, incrementa um item no estoque:
 * se já houver um documento com mesmo nome + validade,
 * apenas soma a quantidade; do contrário cria novo.
 */
export async function criarOuAtualizarItemEstoque(
  nome: string,
  quantidade: number,
  inseridoEm: Date,
  validade: Date
): Promise<void> {
  const tsInserido = Timestamp.fromDate(inseridoEm)
  const tsValidade = Timestamp.fromDate(validade)
  const now = Timestamp.now()

  // procura por doc com mesmo nome e mesma validade
  const q = query(
    estoqueRef,
    where('nome', '==', nome),
    where('validade', '==', tsValidade)
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    // se existe, incrementa quantidade e atualiza timestamp
    const docRef = doc(db, 'estoque', snap.docs[0].id)
    await updateDoc(docRef, {
      quantidade: increment(quantidade),
      atualizadoEm: now,
    })
  } else {
    // senão, cria novo documento
    await addDoc(estoqueRef, {
      nome,
      quantidade,
      inseridoEm: tsInserido,
      validade: tsValidade,
      atualizadoEm: now,
    })
  }
}
