import { Timestamp } from 'firebase/firestore'

export interface Produto {
  id: string
  nome: string
  preco: number
  // continua sendo string para aceitar algo como "50 ml"
  unidade: string
  categoria: string
  // marca se esse produto deve ser controlado no estoque
  controlaEstoque?: boolean
  // se controlaEstoque for true, registra quantidade
  estoque?: number
  // novo flag para itens sem controle de estoque
  disponivel: boolean
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
  // passaremos daqui para frente apenas o produtoId
  produtoId: string
  nome: string       // ainda mantemos o nome para histórico legível
  ajuste: number     // negativo para remoções
  motivo: string     // motivo informado na remoção
  criadoEm: Timestamp// data/hora da remoção
}

export interface Custo {
  id: string
  descricao: string
  valor: number
  data: Timestamp
}
