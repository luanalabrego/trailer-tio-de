// src/lib/firebase-produtos.ts

import { db, storage } from '@/firebase/firebase'
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Produto } from '@/types'

// referência à coleção de produtos
const colecao = collection(db, 'produtos')

/**
 * Lista todos os produtos (Firestore completo)
 */
export async function listarProdutos(): Promise<Produto[]> {
  try {
    const snap = await getDocs(colecao)
    return snap.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        nome: data.nome as string,
        categoria: data.categoria as string,
        preco: data.preco as number,
        unidade: data.unidade as string,
        imagemUrl: (data.imagemUrl as string) || '',
      }
    })
  } catch (err) {
    console.error('❌ produtos.erro listarProdutos', err)
    return []
  }
}

/**
 * Salva um produto:
 *  - Se receber imagemFile, faz upload e obtém URL
 *  - Se vier com p.id, faz update; caso contrário, faz addDoc
 */
export async function salvarProduto(
  p: Partial<Produto>,
  imagemFile?: File
): Promise<void> {
  try {
    // 1) Se tiver arquivo, faz upload e busca URL
    let imagemUrl = p.imagemUrl || ''
    if (imagemFile) {
      const fileRef = ref(storage, `produtos/${Date.now()}_${imagemFile.name}`)
      await uploadBytes(fileRef, imagemFile)
      imagemUrl = await getDownloadURL(fileRef)
    }

    // 2) Prepara o payload
    const dados = {
      nome: p.nome,
      categoria: p.categoria,
      preco: p.preco,
      unidade: p.unidade,
      imagemUrl,
    }

    // 3) Update ou create
    if (p.id) {
      const refDoc = doc(db, 'produtos', p.id)
      await updateDoc(refDoc, dados)
    } else {
      await addDoc(colecao, dados)
    }
  } catch (err) {
    console.error('❌ produtos.erro salvarProduto', err)
    throw err
  }
}

/**
 * Exclui um produto pelo ID
 */
export async function excluirProduto(id: string): Promise<void> {
  try {
    const refDoc = doc(db, 'produtos', id)
    await deleteDoc(refDoc)
  } catch (err) {
    console.error('❌ produtos.erro excluirProduto', err)
    throw err
  }
}
