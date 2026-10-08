import { db } from '../db/db'

/**
 * Avisa quando qualquer dado muda (para agendar um backup logo depois).
 * É só uma dica de agenda: o envio em si compara o hash, então avisos a mais não geram envios a mais.
 */
export function watchChanges(onChange: () => void): () => void {
  const fire = () => {
    onChange()
  }
  const subs: (() => void)[] = []
  for (const table of db.tables) {
    table.hook('creating', fire)
    table.hook('updating', fire)
    table.hook('deleting', fire)
    subs.push(() => {
      table.hook('creating').unsubscribe(fire)
      table.hook('updating').unsubscribe(fire)
      table.hook('deleting').unsubscribe(fire)
    })
  }
  return () => subs.forEach((u) => u())
}
