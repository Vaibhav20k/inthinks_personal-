import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'

/** Section 02 — the positioning statement. Type and air do all the work. */
export default function EditorialStatement() {
  const lines = [
    'We explore ideas',
    'before they become',
    'obvious.',
  ]

  return (
    <section id="statement" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="02">Positioning</SectionLabel>

        <div>
          <h2 className="statement-type">
            {lines.map((line, i) => (
              // Masked line reveal: each line rises out of its own clip.
              <span key={line} className="block overflow-hidden">
                <Reveal as="span" delay={i * 90} className="block">
                  {line}
                </Reveal>
              </span>
            ))}
          </h2>

          <div className="mt-14 grid gap-8 lg:grid-cols-12">
            <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
              <p className="body-type text-graphite">
                At InThinks, we investigate emerging problems, technologies and
                possibilities. Promising ideas move through research,
                experimentation, prototyping and product development until they
                become technologies organisations can license, acquire,
                co-develop or scale.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
