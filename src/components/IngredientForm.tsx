import { useState } from 'react'
import { db } from '../db/db'
import type { Ingredient, Unit } from '../db/types'
import { formatBRL } from '../lib/money'
import { ingredientCostPerBase } from '../lib/pricing'
import { BUY_UNITS, UNIT_LABEL, baseUnitOf } from '../lib/units'
import { Field, MoneyInput, NumberInput } from './Fields'
import { Modal } from './Modal'
import { useFeedback } from './Feedback'

export function IngredientForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Ingredient
  onClose: () => void
  onSaved?: (id: number) => void
}) {
  const { toast } = useFeedback()
  const [name, setName] = useState(initial?.name ?? '')
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'kg')
  const [qty, setQty] = useState<number | null>(initial?.packageQty ?? null)
  const [price, setPrice] = useState<number | null>(initial?.packagePrice ?? null)

  const valid = name.trim() !== '' && (qty ?? 0) > 0 && (price ?? 0) >= 0 && price != null
  const preview: Ingredient = { name, unit, packageQty: qty ?? 0, packagePrice: price ?? 0 }
  const perBase = ingredientCostPerBase(preview)
  const base = baseUnitOf(unit)
  const perUnitLabel = base === 'un' ? 'cada unidade' : `cada ${base === 'g' ? '100 g' : '100 ml'}`
  const perUnitValue = base === 'un' ? perBase : perBase * 100

  async function save() {
    const data: Ingredient = { ...preview, name: name.trim() }
    let id: number
    if (initial?.id != null) {
      id = initial.id
      await db.ingredients.put({ ...data, id })
    } else {
      id = (await db.ingredients.add(data)) as number
    }
    toast('Insumo salvo ✓')
    onSaved?.(id)
    onClose()
  }

  return (
    <Modal
      small
      title={initial ? 'Editar insumo' : 'Novo insumo'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!valid} onClick={save}>Salvar</button>
        </>
      }
    >
      <Field label="Nome do insumo" htmlFor="ing-name">
        <input id="ing-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Farinha de trigo" autoFocus />
      </Field>
      <div className="grid2">
        <Field label="Vem na embalagem" htmlFor="ing-qty" hint="Quanto vem quando você compra">
          <NumberInput id="ing-qty" value={qty} onChange={setQty} decimals={3} />
        </Field>
        <Field label="Unidade" htmlFor="ing-unit">
          <select id="ing-unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {BUY_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Quanto você pagou nessa embalagem?" htmlFor="ing-price">
        <MoneyInput id="ing-price" value={price} onChange={setPrice} />
      </Field>
      {valid && (
        <div className="notice info">
          <span className="em">🧮</span>
          <span>Isso dá <b>{formatBRL(perUnitValue)}</b> {perUnitLabel}.</span>
        </div>
      )}
    </Modal>
  )
}
