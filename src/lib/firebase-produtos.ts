import { db, storage } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const colecao = collection(db, 'produtos')

export async function listarProdutos() {
  const snapshot = await getDocs(colecao)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[]
}

export async function salvarProduto(dados: any, imagem?: File) {
  let urlImagem = dados.imagemUrl || ''

  if (imagem) {
    const nomeArquivo = `${Date.now()}-${imagem.name}`
    const caminho = ref(storage, `produtos/${nomeArquivo}`)
    await uploadBytes(caminho, imagem)
    urlImagem = await getDownloadURL(caminho)
  }

  const produto = {
    nome: dados.nome,
    categoria: dados.categoria,
    preco: parseFloat(dados.preco),
    unidade: dados.unidade,
    imagemUrl: urlImagem,
    atualizadoEm: new Date(),
  }

  if (dados.id) {
    const refDoc = doc(db, 'produtos', dados.id)
    await updateDoc(refDoc, produto)
  } else {
    await addDoc(colecao, produto)
  }
}

export async function excluirProduto(id: string) {
  const refDoc = doc(db, 'produtos', id)
  await deleteDoc(refDoc)
}
