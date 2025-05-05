// src/lib/firebase-agendamentos.ts

import { db } from '@/firebase/firebase'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { NovoAgendamento } from '@/types'

const agendamentosRef = collection(db, 'agendamentos')

export async function salvarAgendamento(dados: NovoAgendamento) {
  // 1. Converte datas passadas como string ou Date para um Date válido
  let dataHoraDate: Date
  if (dados.dataHora instanceof Date) {
    dataHoraDate = dados.dataHora
  } else {
    dataHoraDate = new Date(dados.dataHora)
  }
  if (isNaN(dataHoraDate.getTime())) {
    throw new Error(`Data de agendamento inválida: ${dados.dataHora}`)
  }

  // 2. Cria o Timestamp a partir do Date
  const tsDataHora = Timestamp.fromDate(dataHoraDate)

  // 3. Monta o objeto completo a ser salvo
  const agendamento = {
    nome: dados.nome,
    whatsapp: dados.whatsapp,
    formaPagamento: dados.formaPagamento,
    // campo opcional: entrega ou retirada
    // se existir localEntrega, grava; caso contrário, null
    localEntrega: dados.localEntrega ?? null,
    observacao: dados.observacao ?? '',
    itens: dados.itens,
    total: dados.total,
    dataCriacao: Timestamp.now(),
    dataHora: tsDataHora,
    confirmado: false,
    pago: false,
    status: 'pendente' as const,
  }

  // 4. Grava no Firestore
  await addDoc(agendamentosRef, agendamento)
}
