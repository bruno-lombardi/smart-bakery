import { useState } from 'react'
import { db } from '../db/db'
import { loadExamples } from '../db/seed'
import { useIngredientMap, useIngredients, useProducts, useSettings } from '../db/hooks'
import type { Ingredient, Product } from '../db/types'
import { EmptyState } from '../components/Brand'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { IngredientForm } from '../components/IngredientForm'
import { ProductForm } from '../components/ProductForm'
import { formatBRL, formatPct } from '../lib/money'
import { computeCost, computeProfit, ingredientCostPerBase, sellingPrice } from '../lib/pricing'
import { baseUnitOf } from '../lib/units'

type Tab = 'produtos' | 'insumos'

export default function Products() {
  const [tab, setTab] = useState<Tab>('produtos')
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Preços</h1>
          <p>Descubra quanto custa cada pãozinho e quanto cobrar.</p>
        </div>
      </div>
      <div className="seg" style={{ marginBottom: 16, maxWidth: 420 }} role="tablist">
        <button role="tab" aria-selected={tab === 'produtos'} className={tab === 'produtos' ? 'on' : ''} onClick={() => setTab('produtos')}>🥖 Produtos</button>
        <button role="tab" aria-selected={tab === 'insumos'} className={tab === 'insumos' ? 'on' : ''} onClick={() => setTab('insumos')}>🌾 Insumos</button>
      </div>
      {tab === 'produtos' ? <ProductsTab /> : <IngredientsTab />}
    </div>
  )
}

function ProductsTab() {
  const products = useProducts()
  const ingMap = useIngredientMap()
  const settings = useSettings()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  if (!products) return null

  async function remove(p: Product) {
    if (!(await confirm({ title: 'Excluir produto?', text: `“${p.name}” será removido. Encomendas antigas continuam como estão.`, confirmLabel: 'Excluir', danger: true }))) return
    await db.products.delete(p.id!)
    toast('Produto excluído')
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" /> Novo produto</button>
      </div>
      {products.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Vamos precificar seu primeiro pãozinho?"
            text="Cadastre os ingredientes e a receita, e o painel calcula o custo e o preço ideal."
            action={
              <div className="stack" style={{ alignItems: 'center' }}>
                <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" /> Cadastrar produto</button>
                <button className="btn sm" onClick={async () => { await loadExamples(); toast('Exemplos carregados! Pode editar à vontade 🍞') }}>Ver com exemplos prontos</button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="list">
          {products.map((p) => {
            const cost = computeCost(p, ingMap, settings.hourlyRate)
            const price = sellingPrice(p, ingMap, settings)
            const profit = computeProfit(price, cost.unitCost, settings.overheadPct, p.yield)
            const pill = profit.realMarginPct >= p.marginPct - 1 ? 'good' : profit.realMarginPct >= 15 ? 'ok' : 'bad'
            return (
              <div className="item" key={p.id} style={{ cursor: 'default' }}>
                <div className="emoji">{p.emoji}</div>
                <div className="grow">
                  <div className="title">{p.name}</div>
                  <div className="small muted">Custo {formatBRL(cost.unitCost)} · rende {p.yield}</div>
                  <span className={`margin-pill ${pill}`} style={{ marginTop: 4 }}>Lucro {formatPct(profit.realMarginPct)} · {formatBRL(profit.profitPerUnit)}/un</span>
                </div>
                <div className="right">
                  <div className="amount">{formatBRL(price)}</div>
                  <div className="tiny muted">cada</div>
                </div>
                <div className="row" style={{ gap: 2 }}>
                  <button className="btn ghost icon-btn" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}><Icon name="edit" /></button>
                  <button className="btn ghost icon-btn" aria-label={`Excluir ${p.name}`} onClick={() => remove(p)}><Icon name="trash" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <ProductForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function IngredientsTab() {
  const ingredients = useIngredients()
  const products = useProducts()
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)

  if (!ingredients) return null

  async function remove(i: Ingredient) {
    const used = (products ?? []).filter((p) => p.recipe.some((l) => l.ingredientId === i.id))
    if (used.length) {
      toast(`“${i.name}” está em: ${used.map((p) => p.name).join(', ')}. Tire da receita antes de excluir.`)
      return
    }
    if (!(await confirm({ title: 'Excluir insumo?', text: `“${i.name}” será removido da lista.`, confirmLabel: 'Excluir', danger: true }))) return
    await db.ingredients.delete(i.id!)
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" /> Novo insumo</button>
      </div>
      {ingredients.length === 0 ? (
        <div className="card"><EmptyState title="Nenhum insumo ainda" text="Farinha, fermento, manteiga… cadastre o que você compra e quanto paga." /></div>
      ) : (
        <div className="list">
          {ingredients.map((i) => {
            const base = baseUnitOf(i.unit)
            const per = ingredientCostPerBase(i)
            return (
              <div className="item" key={i.id} style={{ cursor: 'default' }}>
                <div className="emoji">🌾</div>
                <div className="grow">
                  <div className="title">{i.name}</div>
                  <div className="small muted">{i.packageQty} {i.unit} por {formatBRL(i.packagePrice)}</div>
                </div>
                <div className="right small muted">
                  {base === 'un' ? `${formatBRL(per)}/un` : `${formatBRL(per * 1000)}/${base === 'g' ? 'kg' : 'litro'}`}
                </div>
                <div className="row" style={{ gap: 2 }}>
                  <button className="btn ghost icon-btn" aria-label={`Editar ${i.name}`} onClick={() => setEditing(i)}><Icon name="edit" /></button>
                  <button className="btn ghost icon-btn" aria-label={`Excluir ${i.name}`} onClick={() => remove(i)}><Icon name="trash" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <IngredientForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
