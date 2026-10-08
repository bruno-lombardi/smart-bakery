import { useEffect, useRef, useState } from 'react'
import { db, requestPersistentStorage, saveSettings } from '../db/db'
import { downloadBackup, restoreBackup, wipeAll } from '../db/backup'
import { loadExamples } from '../db/seed'
import { useSettings } from '../db/hooks'
import { Field, MoneyInput, NumberInput } from '../components/Fields'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}

export default function SettingsPage() {
  const s = useSettings()
  const { toast, confirm } = useFeedback()
  const fileRef = useRef<HTMLInputElement>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<string>('')
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [owner, setOwner] = useState(s.ownerName)
  const [business, setBusiness] = useState(s.businessName)
  const [hourly, setHourly] = useState<number | null>(s.hourlyRate)
  const [margin, setMargin] = useState<number | null>(s.defaultMarginPct)
  const [overhead, setOverhead] = useState<number | null>(s.overheadPct)
  const [goal, setGoal] = useState<number | null>(s.monthlyGoal || null)
  const [round, setRound] = useState(String(s.roundTo))
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    db.settings.get('main').then((saved) => {
      if (saved) {
        setOwner(saved.ownerName); setBusiness(saved.businessName); setHourly(saved.hourlyRate)
        setMargin(saved.defaultMarginPct); setOverhead(saved.overheadPct); setGoal(saved.monthlyGoal || null); setRound(String(saved.roundTo))
      }
      setLoaded(true)
    })
    navigator.storage?.persisted?.().then(setPersisted)
    navigator.storage?.estimate?.().then((e) => e.usage != null && setUsage(`${(e.usage / 1024).toFixed(0)} KB usados`))
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallEvent) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function saveAll() {
    await saveSettings({
      ownerName: owner.trim() || 'Ana Paula',
      businessName: business.trim() || 'Ana Paula · Pães & Afeto',
      hourlyRate: hourly ?? 0,
      defaultMarginPct: margin ?? 0,
      overheadPct: overhead ?? 0,
      monthlyGoal: goal ?? 0,
      roundTo: Number(round),
    })
    toast('Ajustes salvos ✓')
  }

  async function onRestore(file: File) {
    if (!(await confirm({ title: 'Restaurar backup?', text: 'Isso substitui TODOS os dados atuais pelos do arquivo.', confirmLabel: 'Restaurar', danger: true }))) return
    try {
      await restoreBackup(file)
      toast('Backup restaurado! 🎉')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível restaurar.')
    }
  }

  async function onWipe() {
    if (!(await confirm({ title: 'Apagar tudo?', text: 'Todos os produtos, encomendas e lançamentos serão apagados deste aparelho. Isso não pode ser desfeito. Já fez o backup?', confirmLabel: 'Apagar tudo', danger: true }))) return
    await wipeAll()
    toast('Tudo limpo. Recomeçando! 🌱')
  }

  const lastBackup = s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : 'nunca'

  return (
    <div className="stack">
      <div className="page-head"><div><h1>Ajustes</h1><p>Deixe o painel do jeitinho da sua padaria.</p></div></div>

      <section className="card stack">
        <h2>Sua padaria</h2>
        <div className="grid2">
          <Field label="Seu nome" htmlFor="s-owner"><input id="s-owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} /></Field>
          <Field label="Nome da padaria" htmlFor="s-biz"><input id="s-biz" className="input" value={business} onChange={(e) => setBusiness(e.target.value)} /></Field>
        </div>
        <div className="divider" />
        <h3>Como calcular os preços</h3>
        <div className="grid2">
          <Field label="Quanto vale sua hora de trabalho" htmlFor="s-hour" hint="Entra no custo de cada fornada"><MoneyInput id="s-hour" value={hourly} onChange={setHourly} /></Field>
          <Field label="Lucro padrão dos produtos" htmlFor="s-margin" hint="% do preço de venda"><NumberInput id="s-margin" value={margin} onChange={setMargin} decimals={1} suffix="%" /></Field>
          <Field label="Despesas gerais" htmlFor="s-over" hint="Luz, internet, manutenção… em % do preço"><NumberInput id="s-over" value={overhead} onChange={setOverhead} decimals={1} suffix="%" /></Field>
          <Field label="Arredondar preço sugerido" htmlFor="s-round">
            <select id="s-round" className="select" value={round} onChange={(e) => setRound(e.target.value)}>
              <option value="0">Não arredondar</option><option value="0.1">Para cima, de 10 em 10 centavos</option><option value="0.5">Para cima, de 50 em 50 centavos</option><option value="1">Para cima, em reais inteiros</option>
            </select>
          </Field>
        </div>
        <Field label="Meta de faturamento do mês (opcional)" htmlFor="s-goal"><MoneyInput id="s-goal" value={goal} onChange={setGoal} /></Field>
        <button className="btn primary" disabled={!loaded} onClick={saveAll} style={{ alignSelf: 'flex-start' }}><Icon name="check" /> Salvar ajustes</button>
      </section>

      <section className="card stack">
        <h2>Cópia de segurança 💾</h2>
        <p className="muted">Seus dados ficam guardados <b>só neste aparelho</b>. Se trocar de celular ou limpar o navegador, eles somem. Por isso, baixe uma cópia de vez em quando e guarde no WhatsApp, e-mail ou Google Drive.</p>
        <p className="small bold">Último backup: {lastBackup}</p>
        <div className="row wrap">
          <button className="btn primary" onClick={async () => { await downloadBackup(); toast('Backup baixado! Guarde em um lugar seguro 💛') }}><Icon name="download" /> Baixar backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Restaurar de um arquivo</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onRestore(f); e.target.value = '' }} />
        </div>
      </section>

      <section className="card stack">
        <h2>Usar como aplicativo 📲</h2>
        {installEvent ? (
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => void installEvent.prompt()}>Instalar o painel neste aparelho</button>
        ) : (
          <div className="stack small" style={{ gap: 8 }}>
            <p><b>Android (Chrome):</b> toque nos 3 pontinhos ⋮ → “Instalar aplicativo” ou “Adicionar à tela inicial”.</p>
            <p><b>iPhone (Safari):</b> toque em Compartilhar ⬆️ → “Adicionar à Tela de Início”.</p>
            <p><b>Computador (Chrome/Edge):</b> clique no ícone de instalar na barra de endereço.</p>
          </div>
        )}
        <p className="small muted">Depois de instalado, abre como um app e funciona sem internet.</p>
        <div className="row wrap small">
          <span className={`badge ${persisted ? 'pago' : 'parcial'}`}>{persisted ? 'Armazenamento protegido' : 'Armazenamento normal'}</span>
          {usage && <span className="muted">{usage}</span>}
          {persisted === false && <button className="btn sm" onClick={async () => setPersisted(await requestPersistentStorage())}>Proteger meus dados</button>}
        </div>
      </section>

      <section className="card stack">
        <h2>Outras opções</h2>
        <div className="row wrap">
          <button className="btn" onClick={async () => { if (await db.products.count()) { toast('Você já tem produtos cadastrados.'); return } await loadExamples(); toast('Exemplos carregados 🍞') }}>Carregar exemplos</button>
          <button className="btn danger" onClick={onWipe}><Icon name="trash" /> Apagar todos os dados</button>
        </div>
      </section>

      <p className="center muted small" style={{ textAlign: 'center' }}>Ana Paula · Pães &amp; Afeto — <i>Carinho que dá gosto.</i> 🥖</p>
    </div>
  )
}
