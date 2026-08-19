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
 * Traced from public/InThinks.png as vector, so it stays crisp at any size,
 * themes with the palette, and costs no network request — the PNG is RGB with
 * no alpha channel, so it can only ever be drawn on an opaque background.
 * Bulb and gear take the accent; the screw base stays neutral so the mark
 * reads correctly on white and on black alike.
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

      {/* Gear — eight teeth around a hub, punched out by the even-odd rule.
          A ring with real teeth rather than a hub with spokes: spokes read as
          a sun once the mark is down at favicon size. Same path as
          public/favicon.svg, so the tab and the page cannot drift apart. */}
      <path d="M30.36 14.62L30.69 11.97L33.31 11.97L33.64 14.62L37.19 16.09L39.30 14.45L41.15 16.30L39.51 18.41L40.98 21.96L43.63 22.29L43.63 24.91L40.98 25.24L39.51 28.79L41.15 30.90L39.30 32.75L37.19 31.11L33.64 32.58L33.31 35.23L30.69 35.23L30.36 32.58L26.81 31.11L24.70 32.75L22.85 30.90L24.49 28.79L23.02 25.24L20.37 24.91L20.37 22.29L23.02 21.96L24.49 18.41L22.85 16.30L24.70 14.45L26.81 16.09ZM28.14 23.60a3.86 3.86 0 1 0 7.72 0a3.86 3.86 0 1 0 -7.72 0Z" fill={stroke} fillRule="evenodd" />

      {/* Filament legs down to the base */}
      <g stroke={stroke} strokeWidth="2.4" strokeLinecap="round">
        <line x1="26" y1="35" x2="26" y2="46.3" />
        <line x1="32" y1="36" x2="32" y2="46.3" />
        <line x1="38" y1="35" x2="38" y2="46.3" />
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
