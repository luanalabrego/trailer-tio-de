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
  Timestamp,
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
        controlaEstoque: Boolean(data.controlaEstoque),
        estoque: data.estoque as number | undefined,
        disponivel: (data.disponivel as boolean) ?? true,
        imagemUrl: (data.imagemUrl as string) || '',
        criadoEm: data.criadoEm as Timestamp | undefined,
        atualizadoEm: data.atualizadoEm as Timestamp | undefined,
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
 *  - Omite o campo `estoque` quando estiver undefined, evitando erro do Firestore
 */
export async function salvarProduto(
  p: Partial<Produto>,
  imagemFile?: File
): Promise<void> {
  try {
    // 1) Upload de imagem, se houver
    let imagemUrl = p.imagemUrl || ''
    if (imagemFile) {
      const fileRef = ref(storage, `produtos/${Date.now()}_${imagemFile.name}`)
      await uploadBytes(fileRef, imagemFile)
      imagemUrl = await getDownloadURL(fileRef)
    }

    // 2) Monta payload base, sempre incluindo flags obrigatórios
    const dadosBase: any = {
      nome: p.nome,
      categoria: p.categoria,
      preco: p.preco,
      unidade: p.unidade,
      controlaEstoque: p.controlaEstoque ?? false,
      disponivel: p.disponivel ?? true,
      imagemUrl,
      atualizadoEm: Timestamp.now(),
    }

    // 3) Só adiciona 'estoque' se for number (evita undefined)
    if (p.controlaEstoque && typeof p.estoque === 'number') {
      dadosBase.estoque = p.estoque
    }

    // 4) Executa update ou create
    if (p.id) {
      const refDoc = doc(db, 'produtos', p.id)
      await updateDoc(refDoc, dadosBase)
    } else {
      await addDoc(colecao, {
        ...dadosBase,
        criadoEm: Timestamp.now(),
      })
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
