const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const formatBRL = (n: number) => brl.format(Number.isFinite(n) ? n : 0)

/** "R$ 1.234" sem centavos, para números grandes de painel */
export const formatBRLShort = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  )

/** Aceita "12,50", "12.50", "1.234,56", "R$ 7" */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '')
  if (!cleaned) return 0
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized = cleaned
  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '')
  } else if (lastComma > -1) {
    normalized = cleaned.replace(',', '.')
  }
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export const formatNumber = (n: number, max = 2) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max }).format(n)

export const formatPct = (n: number) => `${formatNumber(n, 1)}%`
