import { useEffect, useState, type ReactNode } from 'react'
import { formatNumber, parseMoney } from '../lib/money'

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

function fmtInput(n: number | null, decimals: number) {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: decimals, useGrouping: false })
}

interface NumProps {
  value: number | null
  onChange: (n: number | null) => void
  id?: string
  decimals?: number
  prefix?: string
  suffix?: string
  placeholder?: string
  ariaLabel?: string
}

/** Campo de número com vírgula, sem setas, que não "briga" com a digitação. */
export function NumberInput({ value, onChange, id, decimals = 2, prefix, suffix, placeholder, ariaLabel }: NumProps) {
  const [text, setText] = useState(fmtInput(value, decimals))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(fmtInput(value, decimals))
  }, [value, decimals, focused])

  const input = (
    <input
      id={id}
      className="input"
      inputMode="decimal"
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder={placeholder ?? '0'}
      value={text}
      onFocus={(e) => {
        setFocused(true)
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        setText(fmtInput(value, decimals))
      }}
      onChange={(e) => {
        const t = e.target.value
        setText(t)
        onChange(t.trim() === '' ? null : parseMoney(t))
      }}
    />
  )
  if (!prefix && !suffix) return input
  return (
    <div className={`input-affix${suffix ? ' suffix' : ''}`}>
      <span className="affix">{prefix ?? suffix}</span>
      {input}
    </div>
  )
}

export function MoneyInput(props: Omit<NumProps, 'prefix' | 'suffix'>) {
  return <NumberInput {...props} prefix="R$" />
}

export function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Diminuir" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input
        aria-label="Quantidade"
        inputMode="numeric"
        value={formatNumber(value, 0)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isFinite(n) ? Math.max(min, n) : min)
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" aria-label="Aumentar" onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}
