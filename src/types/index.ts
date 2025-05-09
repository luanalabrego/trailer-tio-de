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

// Aqui renomeamos a propriedade `data` para `criadoEm`
export interface Venda {
  id: string
  clienteId: string
  itens: PedidoItem[]
  formaPagamento: string
  total: number
  pago: boolean
  criadoEm: Timestamp
  orderNumber?: number
}

export interface Agendamento {
  id: string
  nome: string
  whatsapp: string
  dataHora: Timestamp | string | Date
  formaPagamento: string
  itens: PedidoItem[]
  total: number
  status: 'pendente' | 'confirmado' | 'cancelado' | 'finalizado'
  pago?: boolean
  localEntrega?: string
  confirmado?: boolean
  dataCriacao?: Timestamp
  observacao?: string
  aniversario?: string
  canceladoEm?: Timestamp
  finalizadoEm?: Timestamp
}

export type NovoAgendamento = Omit<Agendamento, 'id' | 'status'>

export interface Categoria {
  id: string
  nome: string
}

// registra cada ajuste de estoque (remoções aparecerão com ajuste negativo)
export interface RegistroEstoque {
  id: string
  produtoId: string
  nome: string
  ajuste: number       // negativo para remoções
  motivo: string       // motivo informado na remoção
  criadoEm: Timestamp  // data/hora da remoção
}

export interface Custo {
  id: string
  descricao: string
  valor: number
  data: Timestamp
}
