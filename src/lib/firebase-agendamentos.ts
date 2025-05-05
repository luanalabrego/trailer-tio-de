import { db } from '@/firebase/firebase'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { Agendamento } from '@/types'

const agendamentosRef = collection(db, 'agendamentos')

export async function salvarAgendamento(dados: Agendamento) {
  const agendamento = {
    ...dados,
    dataCriacao: Timestamp.now(),
    confirmado: false,
    status: 'pendente',
  }

  await addDoc(agendamentosRef, agendamento)
}
