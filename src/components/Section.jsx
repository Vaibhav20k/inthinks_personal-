export default function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`px-5 py-20 sm:px-8 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }) {
  const alignment = align === 'center' ? 'mx-auto text-center' : 'text-left'
  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-ink-300 sm:text-lg">{subtitle}</p>
      )}
    </div>
  )
}
