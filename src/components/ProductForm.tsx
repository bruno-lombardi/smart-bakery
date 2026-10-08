import { useMemo, useState } from 'react'
import { db } from '../db/db'
import { useIngredientMap, useIngredients, useSettings } from '../db/hooks'
import type { Product, RecipeLine, Unit } from '../db/types'
import { PRODUCT_CATEGORIES, PRODUCT_EMOJIS } from '../lib/categories'
import { formatBRL, formatNumber, formatPct } from '../lib/money'
import { priceOptions } from '../lib/goals'
import { computeCost, computeProfit, lineCost, suggestedPrice } from '../lib/pricing'
import { UNIT_LABEL, compatibleUnits } from '../lib/units'
import { Field, MoneyInput, NumberInput } from './Fields'
import { useFeedback } from './Feedback'
import { Icon } from './Icon'
import { IngredientForm } from './IngredientForm'
import { Modal } from './Modal'

export function ProductForm({ initial, onClose }: { initial?: Product; onClose: () => void }) {
  const { toast } = useFeedback()
  const settings = useSettings()
  const ingredients = useIngredients() ?? []
  const ingMap = useIngredientMap()

  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🍞')
  const [category, setCategory] = useState(initial?.category ?? PRODUCT_CATEGORIES[0])
  const [yieldQty, setYieldQty] = useState<number | null>(initial?.yield ?? null)
  const [recipe, setRecipe] = useState<RecipeLine[]>(initial?.recipe ?? [])
  const [packaging, setPackaging] = useState<number | null>(initial?.packagingPerUnit ?? 0)
  const [extra, setExtra] = useState<number | null>(initial?.extraPerBatch ?? 0)
  const [minutes, setMinutes] = useState<number | null>(initial?.laborMinutes ?? 0)
  const [margin, setMargin] = useState<number | null>(initial?.marginPct ?? settings.defaultMarginPct)
  const [price, setPrice] = useState<number | null>(initial?.price ?? null)
  const [newIngFor, setNewIngFor] = useState<number | 'add' | null>(null)

  const draft = useMemo<Product>(
    () => ({
      name, emoji, category, yield: yieldQty ?? 0, recipe,
      packagingPerUnit: packaging ?? 0, extraPerBatch: extra ?? 0, laborMinutes: minutes ?? 0,
      marginPct: margin ?? 0, price, active: initial?.active ?? true,
    }),
    [name, emoji, category, yieldQty, recipe, packaging, extra, minutes, margin, price, initial?.active],
  )

  const cost = computeCost(draft, ingMap, settings.hourlyRate)
  const suggested = suggestedPrice(cost.unitCost, margin ?? 0, settings.overheadPct, settings.roundTo)
  const finalPrice = price != null && price > 0 ? price : suggested ?? 0
  const profit = computeProfit(finalPrice, cost.unitCost, settings.overheadPct, yieldQty ?? 1)
  const target = margin ?? 0
  const pill = profit.realMarginPct >= target - 1 ? 'good' : profit.realMarginPct >= 15 ? 'ok' : 'bad'

  const options = useMemo(() => priceOptions(cost.unitCost, settings), [cost.unitCost, settings])
  const minPrice = cost.unitCost > 0 ? Math.ceil((cost.unitCost / (1 - Math.min(0.9, settings.overheadPct / 100))) * 100) / 100 : 0
  const perMonthForGoal =
    settings.monthlyProfitGoal > 0 && profit.profitPerUnit > 0 ? Math.ceil(settings.monthlyProfitGoal / profit.profitPerUnit) : null

  const valid = name.trim() !== '' && (yieldQty ?? 0) >= 1
  const updateLine = (i: number, patch: Partial<RecipeLine>) =>
    setRecipe((r) => r.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  function addLine(ingredientId?: number) {
    const ing = ingredientId != null ? ingMap.get(ingredientId) : ingredients[0]
    if (!ing) {
      setNewIngFor('add')
      return
    }
    const unit: Unit = compatibleUnits(ing.unit)[0]
    setRecipe((r) => [...r, { ingredientId: ing.id!, qty: 0, unit }])
  }

  function pickIngredient(i: number, id: number) {
    const ing = ingMap.get(id)!
    updateLine(i, { ingredientId: id, unit: compatibleUnits(ing.unit)[0] })
  }

  async function save() {
    const data: Product = {
      ...draft,
      name: name.trim(),
      yield: Math.max(1, Math.round(yieldQty ?? 1)),
      recipe: recipe.filter((l) => l.qty > 0),
    }
    if (initial?.id != null) await db.products.put({ ...data, id: initial.id })
    else await db.products.add(data)
    toast('Produto salvo ✓')
    onClose()
  }

  return (
    <>
      <Modal
        wide
        title={initial ? 'Editar produto' : 'Novo produto'}
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn primary" disabled={!valid} onClick={save}>Salvar produto</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="Nome do pãozinho" htmlFor="p-name">
            <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pão de leite" autoFocus={!initial} />
          </Field>
          <Field label="Categoria" htmlFor="p-cat">
            <select id="p-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {[...new Set([...PRODUCT_CATEGORIES, category])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="field">
          <span className="label">Um desenhinho para reconhecer</span>
          <div className="chips" role="radiogroup" aria-label="Emoji">
            {PRODUCT_EMOJIS.map((e) => (
              <button key={e} type="button" className={`chip${emoji === e ? ' on' : ''}`} onClick={() => setEmoji(e)} style={{ fontSize: '1.4rem', padding: '0 12px' }}>{e}</button>
            ))}
          </div>
        </div>

        <h3>1. Receita</h3>
        <Field label="Quantos pãezinhos saem de uma fornada?" htmlFor="p-yield" hint="Conte as unidades que você vende (ex.: 20 pães)">
          <NumberInput id="p-yield" value={yieldQty} onChange={setYieldQty} decimals={0} />
        </Field>

        <div className="stack" style={{ gap: 10 }}>
          <span className="label">Ingredientes da receita</span>
          {recipe.length === 0 && <p className="hint">Adicione cada ingrediente e a quantidade usada em uma fornada.</p>}
          {recipe.map((l, i) => {
            const ing = ingMap.get(l.ingredientId)
            return (
              <div className="recipe-line" key={i}>
                <div className="rl-top">
                  <select className="select" aria-label="Ingrediente" value={l.ingredientId} onChange={(e) => {
                    if (e.target.value === 'new') setNewIngFor(i)
                    else pickIngredient(i, Number(e.target.value))
                  }}>
                    {ingredients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    <option value="new">＋ Cadastrar novo insumo…</option>
                  </select>
                  <button className="btn ghost icon-btn" aria-label="Remover ingrediente" onClick={() => setRecipe((r) => r.filter((_, idx) => idx !== i))}>
                    <Icon name="trash" />
                  </button>
                </div>
                <div className="rl-bottom">
                  <div className="grow">
                    <NumberInput ariaLabel="Quantidade" value={l.qty || null} onChange={(n) => updateLine(i, { qty: n ?? 0 })} decimals={3} />
                  </div>
                  <select className="select" style={{ width: 120 }} aria-label="Unidade" value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value as Unit })}>
                    {(ing ? compatibleUnits(ing.unit) : [l.unit]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                  </select>
                  <b style={{ minWidth: 76, textAlign: 'right' }}>{formatBRL(lineCost(l, ing))}</b>
                </div>
              </div>
            )
          })}
          <button className="btn" onClick={() => addLine()}><Icon name="plus" /> Adicionar ingrediente</button>
        </div>

        <h3>2. Outros custos</h3>
        <div className="grid3">
          <Field label="Embalagem por pão" htmlFor="p-pack" hint="Saquinho, etiqueta…">
            <MoneyInput id="p-pack" value={packaging} onChange={setPackaging} />
          </Field>
          <Field label="Gás e energia por fornada" htmlFor="p-extra">
            <MoneyInput id="p-extra" value={extra} onChange={setExtra} />
          </Field>
          <Field label="Tempo de trabalho (min)" htmlFor="p-min" hint={`Valor da hora: ${formatBRL(settings.hourlyRate)}`}>
            <NumberInput id="p-min" value={minutes} onChange={setMinutes} decimals={0} suffix="min" />
          </Field>
        </div>

        <h3>3. Quanto cobrar</h3>
        <div className="grid2">
          <Field label="Lucro que você quer" htmlFor="p-margin" hint="% do preço de venda que sobra para você">
            <NumberInput id="p-margin" value={margin} onChange={setMargin} decimals={1} suffix="%" />
          </Field>
          <Field label="Preço de venda (cada)" htmlFor="p-price" hint={suggested ? 'Deixe em branco para usar o sugerido' : undefined}>
            <MoneyInput id="p-price" value={price} onChange={setPrice} placeholder={suggested ? suggested.toFixed(2).replace('.', ',') : '0,00'} />
          </Field>
        </div>

        {options.length > 0 && (
          <div className="field">
            <span className="label">Escolha um preço pronto</span>
            <div className="price-options" role="radiogroup" aria-label="Opções de preço">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={finalPrice === o.price}
                  className={`opt${finalPrice === o.price ? ' on' : ''}`}
                  onClick={() => { setPrice(o.price); setMargin(o.marginPct) }}
                >
                  <small>{o.label}</small>
                  <b>{formatBRL(o.price)}</b>
                  <small>sobra {formatBRL(o.profitPerUnit)}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="price-box" aria-live="polite">
          <div className="row spread wrap">
            <div>
              <div className="eyebrow">Preço sugerido</div>
              <div className="big">{suggested ? formatBRL(suggested) : '—'}</div>
              <div className="hint">por pãozinho</div>
            </div>
            {suggested != null && price !== suggested && (
              <button className="btn primary sm" onClick={() => setPrice(suggested)}>Usar este preço</button>
            )}
          </div>
          <div className="cost-table">
            <div><span>Ingredientes</span><span>{formatBRL(cost.ingredientsBatch)}</span></div>
            <div><span>Embalagem</span><span>{formatBRL(cost.packagingBatch)}</span></div>
            <div><span>Gás e energia</span><span>{formatBRL(cost.extraBatch)}</span></div>
            <div><span>Seu trabalho</span><span>{formatBRL(cost.laborBatch)}</span></div>
            <div className="total"><span>Custo da fornada</span><span>{formatBRL(cost.batchCost)}</span></div>
            <div className="total"><span>Custo de cada pão</span><span>{formatBRL(cost.unitCost)}</span></div>
          </div>
          {finalPrice > 0 && (
            <div className="row spread wrap">
              <span>Vendendo a <b>{formatBRL(finalPrice)}</b>, sobra <b>{formatBRL(profit.profitPerUnit)}</b> por pão
                ({formatBRL(profit.profitPerBatch)} na fornada)</span>
              <span className={`margin-pill ${pill}`}>Lucro real {formatPct(profit.realMarginPct)}</span>
            </div>
          )}
          {minPrice > 0 && (
            <p className="small">🛑 Preço mínimo para não ter prejuízo: <b>{formatBRL(minPrice)}</b>{finalPrice > 0 && finalPrice < minPrice ? <b style={{ color: 'var(--red)' }}> — seu preço está abaixo!</b> : null}</p>
          )}
          {perMonthForGoal != null && (
            <p className="small">🎯 Vendendo só este pão, você precisa de ~<b>{formatNumber(perMonthForGoal, 0)} por mês</b> (uns {formatNumber(Math.ceil(perMonthForGoal / 30), 0)} por dia) para bater sua meta de lucro.</p>
          )}
          <p className="hint">Já considerando {formatPct(settings.overheadPct)} do preço para despesas gerais (luz, internet, manutenção). Dá para mudar em Ajustes.</p>
        </div>
      </Modal>

      {newIngFor != null && (
        <IngredientForm
          onClose={() => setNewIngFor(null)}
          onSaved={async (id) => {
            const ing = await db.ingredients.get(id)
            if (!ing) return
            const unit = compatibleUnits(ing.unit)[0]
            if (newIngFor === 'add') setRecipe((r) => [...r, { ingredientId: id, qty: 0, unit }])
            else updateLine(newIngFor, { ingredientId: id, unit })
          }}
        />
      )}
    </>
  )
}
