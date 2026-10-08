export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'un'

export interface Ingredient {
  id?: number
  name: string
  /** Unidade em que o insumo é comprado */
  unit: Unit
  /** Quanto vem na embalagem (na unidade acima) */
  packageQty: number
  /** Quanto custou a embalagem (R$) */
  packagePrice: number
}

export interface RecipeLine {
  ingredientId: number
  qty: number
  unit: Unit
}

export interface Product {
  id?: number
  name: string
  emoji: string
  category: string
  /** Quantas unidades saem de uma fornada/receita */
  yield: number
  recipe: RecipeLine[]
  /** Embalagem por unidade vendida (R$) */
  packagingPerUnit: number
  /** Gás/energia e outros custos por fornada (R$) */
  extraPerBatch: number
  /** Minutos de trabalho por fornada */
  laborMinutes: number
  /** Margem de lucro desejada (% do preço de venda) */
  marginPct: number
  /** Preço de venda definido (R$). Se vazio, usa o sugerido */
  price: number | null
  active: boolean
}

export type OrderStatus = 'novo' | 'producao' | 'pronto' | 'entregue' | 'cancelado'
export type DeliveryType = 'retirada' | 'entrega'

export interface OrderItem {
  productId: number | null
  name: string
  qty: number
  unitPrice: number
}

export interface Order {
  id?: number
  customerName: string
  phone: string
  items: OrderItem[]
  /** YYYY-MM-DD */
  date: string
  /** HH:MM (opcional) */
  time: string
  delivery: DeliveryType
  address: string
  deliveryFee: number
  discount: number
  status: OrderStatus
  notes: string
  createdAt: number
}

export type TxType = 'entrada' | 'saida'

export interface Transaction {
  id?: number
  type: TxType
  /** YYYY-MM-DD */
  date: string
  description: string
  category: string
  amount: number
  method: string
  /** Quando é um pagamento de encomenda */
  orderId: number | null
  createdAt: number
}

export interface Settings {
  id: 'main'
  businessName: string
  ownerName: string
  hourlyRate: number
  defaultMarginPct: number
  /** Despesas gerais rateadas no preço (% do preço) */
  overheadPct: number
  monthlyGoal: number
  roundTo: number
  lastBackupAt: number | null
  onboarded: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  businessName: 'Ana Paula · Pães & Afeto',
  ownerName: 'Ana Paula',
  hourlyRate: 15,
  defaultMarginPct: 40,
  overheadPct: 8,
  monthlyGoal: 0,
  roundTo: 0.5,
  lastBackupAt: null,
  onboarded: false,
}
