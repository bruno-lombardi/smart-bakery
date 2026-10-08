import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '../db/db'
import { loadStarterCatalog } from '../db/seed'
import { useIngredientMap, useIngredients, useProducts, useSettings } from '../db/hooks'
import type { Ingredient, Product } from '../db/types'
import { EmptyState } from '../components/Brand'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { IngredientForm } from '../components/IngredientForm'
import { ProductForm } from '../components/ProductForm'
import { ProductIcon } from '../components/ProductIcon'
import { formatBRL, formatPct } from '../lib/money'
import { productEconomics, type Health } from '../lib/goals'
import { ingredientCostPerBase } from '../lib/pricing'
import { baseUnitOf } from '../lib/units'

type Tab = 'produtos' | 'insumos'

export default function Products() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('aba') === 'insumos' ? 'insumos' : 'produtos')
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
      {tab === 'produtos' ? <ProductsTab setSearchTab={setTab} /> : <IngredientsTab />}
    </div>
  )
}

function ProductsTab({ setSearchTab }: { setSearchTab: (t: Tab) => void }) {
  const products = useProducts()
  const ingMap = useIngredientMap()
  const settings = useSettings()
  const { toast, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Product | 'new' | null>(params.get('novo') ? 'new' : null)

  if (!products) return null

  const closeForm = () => {
    setEditing(null)
    if (params.get('novo')) setParams({}, { replace: true })
  }

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
                <button className="btn sm" onClick={async () => { await loadStarterCatalog(); toast('Cardápio carregado! Agora é só ajustar 🍞') }}>Carregar meu cardápio inicial</button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {products.some((p) => p.estimated) && (
            <div className="notice info" style={{ marginBottom: 12 }}>
              <span className="em">🧮</span>
              <div className="grow">
                <b>Deixei seu cardápio quase pronto, com custos estimados.</b>
                <div className="small">Confira primeiro o preço dos <b>insumos</b> (o que você realmente paga) e depois revise cada produto. Quando estiver certo, toque em “Está certo”.</div>
                <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setSearchTab('insumos')}>Conferir meus insumos</button>
              </div>
            </div>
          )}
          {(() => {
            const weak = products.filter((p) => productEconomics(p, ingMap, settings).health !== 'saudavel').length
            return weak > 0 ? (
              <div className="notice" style={{ marginBottom: 12 }}>
                <span className="em">💡</span>
                <div><b>{weak} {weak === 1 ? 'produto está' : 'produtos estão'} com lucro abaixo do ideal.</b>
                  <div className="small">Veja a sugestão de preço em cada um e toque em “Usar” para corrigir.</div></div>
              </div>
            ) : (
              <div className="notice info" style={{ marginBottom: 12 }}>
                <span className="em">💎</span>
                <div><b>Todos os seus preços estão com lucro saudável!</b><div className="small">Continue revisando quando o preço dos ingredientes mudar.</div></div>
              </div>
            )
          })()}
          <div className="list">
            {products.map((p) => {
              const e = productEconomics(p, ingMap, settings)
              const pill: Record<Health, string> = { saudavel: 'good', apertado: 'ok', critico: 'bad' }
              const label: Record<Health, string> = { saudavel: 'Lucro saudável', apertado: 'Lucro apertado', critico: e.profitPerUnit <= 0 ? 'Prejuízo' : 'Lucro baixo' }
              const canFix = e.health !== 'saudavel' && e.suggested != null && e.suggested > e.price + 0.004
              return (
                <div className="item col" key={p.id} style={{ cursor: 'default' }}>
                  <div className="row" style={{ width: '100%', alignItems: 'center', gap: 12 }}>
                    <div className="emoji"><ProductIcon icon={p.emoji} /></div>
                    <div className="grow">
                      <div className="title">{p.name}</div>
                      <div className="small muted">Custo {formatBRL(e.unitCost)} · rende {p.yield}</div>
                      {p.note && <div className="tiny muted">{p.note}</div>}
                    </div>
                    <div className="right">
                      <div className="amount">{formatBRL(e.price)}</div>
                      <div className="tiny muted">sobra {formatBRL(e.profitPerUnit)}</div>
                    </div>
                  </div>
                  <div className="row spread wrap">
                    <div className="row wrap" style={{ gap: 6 }}>
                      <span className={`margin-pill ${pill[e.health]}`}>{label[e.health]} · {formatPct(e.realMarginPct)}</span>
                      {p.estimated && <span className="badge parcial">Estimativa</span>}
                    </div>
                    <div className="row" style={{ gap: 2 }}>
                      {p.estimated && (
                        <button className="btn sm green" onClick={async () => { await db.products.update(p.id!, { estimated: false }); toast(`${p.name} conferido ✓`) }}>✓ Está certo</button>
                      )}
                      <button className="btn ghost sm" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}><Icon name="edit" /> Editar</button>
                      <button className="btn ghost icon-btn" aria-label={`Excluir ${p.name}`} onClick={() => remove(p)}><Icon name="trash" /></button>
                    </div>
                  </div>
                  {canFix && (
                    <div className="suggest">
                      <span>💡 Para um lucro saudável, cobre <b>{formatBRL(e.suggested!)}</b> <span className="muted">(preço mínimo: {formatBRL(e.minPrice)})</span></span>
                      <button className="btn sm primary" onClick={async () => { await db.products.update(p.id!, { price: e.suggested! }); toast(`Preço do ${p.name} ajustado para ${formatBRL(e.suggested!)} ✓`) }}>Usar</button>
                    </div>
                  )}
                  {e.profitPerHour != null && e.profitPerUnit > 0 && (
                    <div className="tiny muted">⏱️ Rende {formatBRL(e.profitPerHour)} de lucro por hora de trabalho</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
      {editing && <ProductForm initial={editing === 'new' ? undefined : editing} onClose={closeForm} />}
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
      {ingredients.some((i) => i.estimated) && (
        <div className="notice" style={{ marginBottom: 12 }}>
          <span className="em">🛒</span>
          <div><b>Estes preços são estimativas de mercado.</b>
            <div className="small">Toque em ✓ se o preço está parecido com o que você paga, ou em editar para colocar o valor certo. Quanto mais real, mais certinho o preço dos seus pães.</div></div>
        </div>
      )}
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
                  <div className="small muted">{i.packageQty} {i.unit} por {formatBRL(i.packagePrice)} {i.estimated && <span className="badge parcial">Preço estimado</span>}</div>
                </div>
                <div className="right small muted">
                  {base === 'un' ? `${formatBRL(per)}/un` : `${formatBRL(per * 1000)}/${base === 'g' ? 'kg' : 'litro'}`}
                </div>
                <div className="row" style={{ gap: 2 }}>
                  {i.estimated && (
                    <button className="btn sm green" aria-label={`${i.name}: preço está certo`} onClick={async () => { await db.ingredients.update(i.id!, { estimated: false }); toast(`${i.name} conferido ✓`) }}>✓</button>
                  )}
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
