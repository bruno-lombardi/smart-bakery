const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  orders: 'M8 4h8l1 2h2.5v14.5h-13V6H7zM9 11h6M9 15h4',
  tag: 'M3 12.5V4h8.5L21 13.5 13.5 21zM7.5 8.5h.01',
  wallet: 'M4 7.5h14.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18zM4 7.5 15.5 4v3.5M16 13.5h.01',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12l2-1.2-1.6-2.8-2.3.6a7 7 0 0 0-1.4-.8L15 5.4h-3.2l-.7 2.4a7 7 0 0 0-1.4.8l-2.3-.6L5.8 11l2 1.2a7 7 0 0 0 0 1.6l-2 1.2 1.6 2.8 2.3-.6c.4.3.9.6 1.4.8l.7 2.4H15l.7-2.4c.5-.2 1-.5 1.4-.8l2.3.6 1.6-2.8-2-1.2c.1-.5.1-1.1 0-1.6z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v6M13.5 11v6',
  whats: 'M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8zM9 9.5c.2 2.2 2.3 4.3 4.5 4.5l1.3-1.2-1.8-.9-.8.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.8-.9-1.8z',
  download: 'M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14',
  upload: 'M12 16V5M7.5 9 12 4.5 16.5 9M5 20h14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  pin: 'M12 21s6-5.6 6-10.5a6 6 0 1 0-12 0C6 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  calc: 'M6 3.5h12v17H6zM9 7.5h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12h.01',
  arrowUp: 'M12 19V6M6.5 11 12 5.5 17.5 11',
  arrowDown: 'M12 5v13M6.5 13 12 18.5 17.5 13',
}

export function Icon({ name, size }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}
