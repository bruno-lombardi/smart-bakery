import { useId } from 'react'

const BASE = import.meta.env.BASE_URL

export function BrandLockup() {
  return (
    <div className="brand-lockup">
      <img src={`${BASE}brand/pao.png`} alt="" />
      <div className="name">Ana Paula</div>
      <div className="tag">PÃES &amp; AFETO</div>
    </div>
  )
}

/** Pãozinho macio, com vapor saindo. Usado em telas vazias e no painel. */
export function BunArt({ steam = true, className }: { steam?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Pãozinho macio">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6cc8a" />
          <stop offset="1" stopColor="#e39c4b" />
        </linearGradient>
      </defs>
      {steam && (
        <g className="steam" transform="translate(0,6)">
          <path d="M78 52c-8-8 8-14 0-24" />
          <path d="M100 48c-8-8 8-14 0-24" />
          <path d="M122 52c-8-8 8-14 0-24" />
        </g>
      )}
      <ellipse cx="100" cy="132" rx="70" ry="7" fill="#6b2420" opacity=".1" />
      <path
        d="M24 108c-4-32 26-56 76-56s80 24 76 56c-2 14-20 20-76 20s-74-6-76-20z"
        fill={`url(#g${id})`}
        stroke="#b8352a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M62 66c-8 12-8 26-4 38M100 60c-4 14-4 30 0 46M138 66c8 12 8 26 4 38" fill="none" stroke="#b8352a" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 90c-6-8 4-14 8-8 4-6 14 0 8 8l-8 9z" fill="#fff6e6" stroke="#b8352a" strokeWidth="3" strokeLinejoin="round" transform="translate(0,-6)" />
    </svg>
  )
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty">
      <BunArt />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
