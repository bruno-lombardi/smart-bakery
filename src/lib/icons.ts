/** Ícones próprios da marca usam o prefixo "svg:"; em texto corrido caem para um emoji parecido. */
const TEXT_FALLBACK: Record<string, string> = {
  'svg:rosca': '🍩',
  'svg:sem-gluten': '🌾',
  'svg:bolo': '🍰',
}

export const isCustomIcon = (icon: string) => icon in TEXT_FALLBACK

export function iconText(icon: string): string {
  return TEXT_FALLBACK[icon] ?? icon
}
