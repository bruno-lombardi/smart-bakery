import type { MonthPoint } from '../lib/stats'
import { formatBRLShort } from '../lib/money'

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const W = 520
  const H = 220
  const pad = { l: 8, r: 8, t: 22, b: 28 }
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.expenses]))
  const bw = (W - pad.l - pad.r) / data.length
  const barW = Math.min(26, bw / 2 - 4)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max)
  const base = H - pad.b

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Faturamento e despesas dos últimos meses">
      <line x1={pad.l} x2={W - pad.r} y1={base} y2={base} stroke="#e7cfa8" strokeWidth="2" strokeLinecap="round" />
      {data.map((d, i) => {
        const cx = pad.l + bw * i + bw / 2
        return (
          <g key={d.key}>
            <rect x={cx - barW - 2} y={y(d.revenue)} width={barW} height={Math.max(0, base - y(d.revenue))} rx="6" fill="#b8352a" />
            <rect x={cx + 2} y={y(d.expenses)} width={barW} height={Math.max(0, base - y(d.expenses))} rx="6" fill="#e9a82b" />
            {d.revenue > 0 && (
              <text x={cx - barW / 2 - 2} y={y(d.revenue) - 6} textAnchor="middle" style={{ fill: '#8f261d' }}>
                {formatBRLShort(d.revenue).replace('R$ ', '')}
              </text>
            )}
            <text x={cx} y={H - 8} textAnchor="middle" style={{ textTransform: 'capitalize' }}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function HBars({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="stack" style={{ gap: 12 }}>
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span className="bold">{r.label}</span>
          <span className="muted bold">{r.display}</span>
          <div className="bar"><div style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}
