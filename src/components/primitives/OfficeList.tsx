import { offices, officeLines, officeMapUrl } from '../../data/site'

/**
 * The offices, wherever they appear.
 *
 * One component rather than the same markup written out in the footer, on
 * About and on Contact — there are two addresses now and there could be three,
 * and three hand-written copies of a list is three places to forget.
 *
 * Every address is a real `<address>` element. It is the one tag that means
 * "this is how you reach the subject of this page", and it is what a screen
 * reader and a crawler look for.
 *
 * `invert` is for the graphite footer, where the palette tokens do not apply
 * and text sits on a fixed dark ground.
 */
export default function OfficeList({
  invert = false,
  size = 'normal',
}: {
  invert?: boolean
  /** `normal` for a page, `compact` for a sidebar or the footer. */
  size?: 'normal' | 'compact'
}) {
  const body = size === 'compact' ? 'text-[0.9375rem]' : 'text-[1.0625rem]'
  const ink = invert ? 'rgba(255,255,255,0.72)' : undefined
  const quiet = invert ? 'rgba(255,255,255,0.55)' : 'var(--color-muted)'

  return (
    <ul>
      {offices.map((o, i) => (
        <li
          key={o.postalCode}
          className={i > 0 ? 'mt-5 pt-5' : undefined}
          // A rule between them, not around them: two addresses run together
          // read as one four-line address.
          style={i > 0 ? { borderTop: `1px solid ${invert ? 'var(--rule-invert)' : 'var(--rule)'}` } : undefined}
        >
          <address className={`not-italic font-medium leading-relaxed ${body}`} style={{ color: ink }}>
            {officeLines(o).map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </address>
          <a
            href={officeMapUrl(o)}
            target="_blank"
            rel="noopener noreferrer"
            className="tap group mt-1 inline-flex min-h-11 items-center gap-2 text-[0.875rem] transition-colors duration-300"
            style={{ color: quiet }}
          >
            <span className="border-b border-transparent pb-0.5 transition-colors duration-300 group-hover:border-current">
              View on map
            </span>
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
              style={{ color: invert ? 'var(--color-accent-light)' : 'var(--color-accent)' }}
            >
              ↗
            </span>
            {/* Named, because "View on map" twice on one page tells a screen
                reader nothing about which map it opens. */}
            <span className="sr-only">— {o.street} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
