import { db, storage } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Produto } from '@/types'

const colecao = collection(db, 'produtos')

export async function listarProdutos(): Promise<Produto[]> {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as Produto[]
}

export async function salvarProduto(
  dados: Partial<Produto>,
  imagem?: File
): Promise<void> {
  if (!dados.nome || !dados.categoria || !dados.unidade) {
    throw new Error('Campos obrigatórios ausentes')
  }

  let urlImagem = dados.imagemUrl ?? ''

  if (imagem) {
    const nomeArquivo = `${Date.now()}-${imagem.name}`
    const caminho = ref(storage, `produtos/${nomeArquivo}`)
    await uploadBytes(caminho, imagem)
    urlImagem = await getDownloadURL(caminho)
  }

  const produto: Omit<Produto, 'id'> = {
    nome: dados.nome,
    categoria: dados.categoria,
    preco: parseFloat(String(dados.preco ?? '0')),
    unidade: dados.unidade,
    imagemUrl: urlImagem,
    estoque: dados.estoque ?? 0,
  }

  if (dados.id) {
    const refDoc = doc(db, 'produtos', dados.id)
    await updateDoc(refDoc, produto)
  } else {
    await addDoc(colecao, produto)
  }
}

export async function excluirProduto(id: string): Promise<void> {
  const refDoc = doc(db, 'produtos', id)
  await deleteDoc(refDoc)
}
