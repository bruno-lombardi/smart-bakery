import type { Unit } from '../db/types'

/** Fator para converter para a unidade-base (g, ml ou un). */
export const UNIT_FACTOR: Record<Unit, number> = { kg: 1000, g: 1, l: 1000, ml: 1, un: 1 }

export const UNIT_LABEL: Record<Unit, string> = {
  kg: 'kg',
  g: 'g',
  l: 'litro(s)',
  ml: 'ml',
  un: 'unidade(s)',
}

export const BUY_UNITS: Unit[] = ['kg', 'g', 'l', 'ml', 'un']

/** Unidades que podem ser usadas na receita para um insumo comprado em `unit`. */
export function compatibleUnits(unit: Unit): Unit[] {
  if (unit === 'kg' || unit === 'g') return ['g', 'kg']
  if (unit === 'l' || unit === 'ml') return ['ml', 'l']
  return ['un']
}

export const baseUnitOf = (unit: Unit): 'g' | 'ml' | 'un' =>
  unit === 'kg' || unit === 'g' ? 'g' : unit === 'l' || unit === 'ml' ? 'ml' : 'un'
