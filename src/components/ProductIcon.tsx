/** Ícones próprios, no traço da marca, para o que não existe como emoji. */
export const CUSTOM: Record<string, { label: string; svg: React.ReactNode }> = {
  'svg:rosca': {
    label: 'Rosca',
    svg: (
      <>
        <path
          d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zm0 5.4a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z"
          fillRule="evenodd"
          fill="#f2bf74"
          stroke="#b8352a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <g fill="#fffaf0">
          <ellipse cx="6.6" cy="9" rx="1.2" ry=".6" transform="rotate(-30 6.6 9)" />
          <ellipse cx="9.6" cy="5.6" rx="1.2" ry=".6" transform="rotate(20 9.6 5.6)" />
          <ellipse cx="15.2" cy="5.8" rx="1.2" ry=".6" transform="rotate(-20 15.2 5.8)" />
          <ellipse cx="18" cy="10" rx="1.2" ry=".6" transform="rotate(35 18 10)" />
          <ellipse cx="17" cy="16" rx="1.2" ry=".6" transform="rotate(-25 17 16)" />
          <ellipse cx="12.4" cy="18.6" rx="1.2" ry=".6" />
          <ellipse cx="7.2" cy="16.4" rx="1.2" ry=".6" transform="rotate(30 7.2 16.4)" />
        </g>
      </>
    ),
  },
  'svg:sem-gluten': {
    label: 'Sem glúten',
    svg: (
      <>
        <path d="M12 21V8" stroke="#44684a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <g fill="#e9a82b" stroke="#c4741a" strokeWidth=".8">
          <ellipse cx="9.3" cy="9.6" rx="1.2" ry="2.3" transform="rotate(-35 9.3 9.6)" />
          <ellipse cx="14.7" cy="9.6" rx="1.2" ry="2.3" transform="rotate(35 14.7 9.6)" />
          <ellipse cx="9.3" cy="13.4" rx="1.2" ry="2.3" transform="rotate(-35 9.3 13.4)" />
          <ellipse cx="14.7" cy="13.4" rx="1.2" ry="2.3" transform="rotate(35 14.7 13.4)" />
          <ellipse cx="12" cy="5.6" rx="1.2" ry="2.3" />
        </g>
        <circle cx="12" cy="12" r="10" fill="none" stroke="#b8352a" strokeWidth="1.8" />
        <path d="M5 5l14 14" stroke="#b8352a" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  'svg:bolo': {
    label: 'Bolo gelado',
    svg: (
      <>
        <path d="M3.5 12.5h17V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" fill="#f6dcc0" stroke="#b8352a" strokeWidth="1.5" strokeLinejoin="round" />
        <path
          d="M3.5 12.5V10a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2.5c-1 0-1 1.6-2.2 1.6s-1.2-1.6-2.3-1.6-1.2 2.2-2.4 2.2-1.2-2.2-2.3-2.2-1.2 1.6-2.4 1.6-1.2-1.6-2.3-1.6-1.2 1.6-2.4 1.6-1.2-1.6-2.2-1.6z"
          fill="#fffaf0"
          stroke="#b8352a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <g fill="#b8352a" stroke="none">
          <circle cx="8" cy="6.2" r="1.7" />
          <circle cx="12" cy="5.6" r="1.7" />
          <circle cx="16" cy="6.2" r="1.7" />
        </g>
        <path d="M7 18h10" stroke="#b8352a" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
      </>
    ),
  },
}

export function ProductIcon({ icon }: { icon: string }) {
  const c = CUSTOM[icon]
  if (!c) return <span aria-hidden="true">{icon}</span>
  return (
    <svg className="picon" viewBox="0 0 24 24" width="1em" height="1em" role="img" aria-label={c.label}>
      {c.svg}
    </svg>
  )
}
