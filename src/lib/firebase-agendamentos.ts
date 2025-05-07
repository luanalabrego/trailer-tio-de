// src/lib/firebase-agendamentos.ts
import { db } from '@/firebase/firebase'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { NovoAgendamento } from '@/types'

const agendamentosRef = collection(db, 'agendamentos')

export async function salvarAgendamento(dados: NovoAgendamento) {
  // Usa typeof para distinguir string de Date
  const dataHoraDate: Date =
    typeof dados.dataHora === 'string'
      ? new Date(dados.dataHora)
      : dados.dataHora

  if (isNaN(dataHoraDate.getTime())) {
    throw new Error(`Data de agendamento inválida: ${dados.dataHora}`)
  }

  const tsDataHora = Timestamp.fromDate(dataHoraDate)

  const agendamento = {
    nome:         dados.nome,
    whatsapp:     dados.whatsapp,
    formaPagamento: dados.formaPagamento,
    localEntrega: dados.localEntrega ?? null,
    observacao:   dados.observacao ?? '',
    itens:        dados.itens,
    total:        dados.total,
    dataCriacao:  Timestamp.now(),
    dataHora:     tsDataHora,
    confirmado:   false,
    pago:         false,
    status:       'pendente' as const,
  }

  await addDoc(agendamentosRef, agendamento)
}
