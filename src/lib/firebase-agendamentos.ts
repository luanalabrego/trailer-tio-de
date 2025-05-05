import { db } from '@/firebase/firebase'
import { addDoc, collection, Timestamp } from 'firebase/firestore'

const agendamentosRef = collection(db, 'agendamentos')

export async function salvarAgendamento(dados: any) {
  const agendamento = {
    ...dados,
    dataCriacao: Timestamp.now(),
    confirmado: false,
    status: 'pendente'
  }
  await addDoc(agendamentosRef, agendamento)
}
