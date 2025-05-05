// src/lib/firebase-categorias.ts

import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { Categoria } from '@/types'

// referência à coleção de categorias usando o SDK completo
const colecao = collection(db, 'categorias')

/**
 * Busca todas as categorias (REST ou stream, sem misturar Lite/completo)
 */
export async function listarCategorias(): Promise<Categoria[]> {
  try {
    // getDocs do SDK completo também funciona perfeitamente
    const snapshot = await getDocs(colecao)
    return snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
      id: docSnap.id,
      nome: docSnap.data().nome as string,
    }))
  } catch (err) {
    console.error('❌ categorias.erro listarCategorias', err)
    return []
  }
}

/**
 * Salvar uma categoria:
 * - Se vier com dados.id, faz update
 * - Senão, cria novo documento
 */
export async function salvarCategoria(dados: Partial<Categoria>): Promise<void> {
  try {
    if (dados.id) {
      const ref = doc(db, 'categorias', dados.id)
      await updateDoc(ref, { nome: dados.nome })
    } else {
      await addDoc(colecao, { nome: dados.nome })
    }
  } catch (err) {
    console.error('❌ categorias.erro salvarCategoria', err)
    throw err
  }
}

/**
 * Excluir categoria pelo ID
 */
export async function excluirCategoria(id: string): Promise<void> {
  try {
    const ref = doc(db, 'categorias', id)
    await deleteDoc(ref)
  } catch (err) {
    console.error('❌ categorias.erro excluirCategoria', err)
    throw err
  }
}
