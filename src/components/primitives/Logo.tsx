interface Props {
  /** Rendered height in rem; the mark keeps its aspect ratio. */
  size?: number
  /** `light` switches to the indigo step that holds contrast on black. */
  tone?: 'accent' | 'light'
  className?: string
}

/**
 * The InThinks mark: a gear inside a bulb — the idea and the engineering that
 * makes it real, which is the company's whole proposition.
 *
 * Redrawn as vector so it stays crisp at any size, themes with the palette,
 * and costs no network request. Bulb and gear take the accent; the screw base
 * stays neutral so the mark reads correctly on white and on black alike.
 */
export default function Logo({ size = 1.75, tone = 'accent', className = '' }: Props) {
  const stroke = tone === 'light' ? 'var(--color-accent-light)' : 'var(--color-accent)'
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={{ height: `${size}rem`, width: 'auto' }}
      aria-hidden="true"
      focusable="false"
    >
      {/* Bulb envelope */}
      <path
        d="M32 5.5c-10.5 0-18.6 8-18.6 18.1 0 6 2.8 10.4 6.2 13.9 2 2.1 3.1 4 3.1 6.6v2.2h18.6v-2.2c0-2.6 1.1-4.5 3.1-6.6 3.4-3.5 6.2-7.9 6.2-13.9C50.6 13.5 42.5 5.5 32 5.5Z"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Gear — eight teeth, drawn as a ring of spokes plus a hub */}
      <g stroke={stroke} strokeWidth="3" fill="none">
        <circle cx="32" cy="23.5" r="6.6" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 - 90) * (Math.PI / 180)
          const inner = 8.4
          const outer = 11.6
          return (
            <line
              key={i}
              x1={32 + Math.cos(a) * inner}
              y1={23.5 + Math.sin(a) * inner}
              x2={32 + Math.cos(a) * outer}
              y2={23.5 + Math.sin(a) * outer}
              strokeLinecap="round"
            />
          )
        })}
      </g>

      {/* Filament legs down to the base */}
      <g stroke={stroke} strokeWidth="2.4" strokeLinecap="round">
        <line x1="26" y1="33" x2="26" y2="46.3" />
        <line x1="32" y1="33" x2="32" y2="46.3" />
        <line x1="38" y1="33" x2="38" y2="46.3" />
      </g>

      {/* Screw base */}
      <g fill="currentColor" opacity="0.72">
        <rect x="22.4" y="47.5" width="19.2" height="3.4" rx="1" />
        <rect x="22.4" y="52.4" width="19.2" height="3.4" rx="1" />
        <path d="M25.4 57.3h13.2l-2.5 4.1a2 2 0 0 1-1.7 1h-4.8a2 2 0 0 1-1.7-1l-2.5-4.1Z" />
      </g>
    </svg>
  )
}
