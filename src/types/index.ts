// src/types/index.ts
import { Timestamp } from 'firebase/firestore'

export interface Produto {
  id: string
  nome: string
  preco: number
  unidade: string
  categoria: string
  estoque?: number
  imagemUrl?: string
  criadoEm?: Timestamp | Date
  atualizadoEm?: Timestamp | Date
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  aniversario?: string
  observacoes?: string
  totalGasto?: number
}

export interface PedidoItem {
  id: string
  nome: string
  preco: number
  qtd: number
}

export interface Venda {
  id: string
  clienteId: string
  itens: PedidoItem[]
  formaPagamento: string
  total: number
  pago: boolean
  data: Timestamp
}

export interface Agendamento {
  id: string
  nome: string
  whatsapp: string
  dataHora: string
  formaPagamento: string
  itens: PedidoItem[]
  total: number
  status: 'pendente' | 'confirmado' | 'cancelado' | 'finalizado'
  pago?: boolean               // adiciona propriedade `pago`
  localEntrega?: string        // adiciona propriedade `localEntrega`
  confirmado?: boolean
  dataCriacao?: Timestamp
  observacao?: string
  aniversario?: string
}

export type NovoAgendamento = Omit<Agendamento, 'id' | 'status'>

export interface Categoria {
  id: string
  nome: string
}

export interface Custo {
  id: string
  descricao: string
  valor: number
  data: Timestamp
}
