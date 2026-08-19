import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'
import { officeLines, officeMapUrl, site } from '../data/site'

const haveLack = [
  {
    title: 'Students and researchers may have',
    points: ['Ideas', 'Proof of concept', 'Scientific insight', 'Novel prototypes'],
  },
  {
    title: 'But may lack',
    points: [
      'Industrial validation',
      'Engineering resources',
      'Application access',
      'Commercial networks',
      'Manufacturing capability',
      'Technology-transfer expertise',
    ],
  },
  {
    title: 'Industry has',
    points: ['Real problems', 'Commercial infrastructure', 'Scale', 'Deployment capability'],
  },
  {
    title: 'But may not know',
    points: ['Where the next relevant innovation is emerging'],
  },
]

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="A bridge between emerging invention and industrial adoption."
        lede="Many promising technologies never reach industry, because the distance between an early innovation and a commercially deployable solution is larger than either side can cross alone."
      />

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="01">The Thesis</SectionLabel>
          <div>
            <div className="grid gap-px sm:grid-cols-2" style={{ background: 'var(--rule)' }}>
              {haveLack.map((block, i) => (
                <Reveal key={block.title} delay={i * 70}>
                  <div className="h-full p-6" style={{ background: 'var(--color-paper)' }}>
                    <h2 className="label" style={{ color: i % 2 === 0 ? 'var(--color-accent)' : 'var(--color-faint)' }}>
                      {block.title.toUpperCase()}
                    </h2>
                    <ul className="mt-5 space-y-2.5">
                      {block.points.map((p) => (
                        <li key={p} className="text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <p className="statement-type mt-14 max-w-[16ch]">
                InThinks connects and develops the two sides.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="body-type measure-prose mt-8" style={{ color: 'var(--color-muted)' }}>
                We operate independently rather than inside any single institution or
                corporate roadmap, because the technologies worth pursuing rarely arrive
                on either one&rsquo;s schedule. We select a small number, secure the rights to
                develop them properly, and carry the technical risk that stands between a
                result in a lab and something an industrial operator can actually deploy.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 sunk">
        <div className="container-grid">
          <div className="doc-columns">
            <SectionLabel index="02">Selectivity</SectionLabel>
            <div>
              <Reveal as="h2" className="section-type max-w-[20ch]">
                A development portfolio, not a marketplace.
              </Reveal>
              <Reveal delay={80}>
                <p className="body-type measure-prose mt-8" style={{ color: 'var(--color-muted)' }}>
                  InThinks is not a listing site and not an accelerator. Technologies enter
                  a portfolio we invest our own technical effort into, which means we can
                  only take on what we can genuinely advance. Most submissions will not be
                  selected — that is what makes selection mean anything.
                </p>
              </Reveal>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button to="/submit-innovation">Submit an Innovation</Button>
                <Button to="/submit-challenge" variant="outline">Submit a Challenge</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Where and how to reach a real company.
          About is where someone goes to find out who these people are, and
          "where are they" is half of that question — a page that answers the
          first half and not the second reads as a company that would rather
          not say. Two facts, given the same weight, on the site's own grid. */}
      <section id="contact" className="py-20 sm:py-28">
        <div className="container-grid">
          <div className="doc-columns">
            <SectionLabel index="03">Contact</SectionLabel>
            <div>
              <Reveal as="h2" className="section-type max-w-[20ch]">
                Where to find us.
              </Reveal>

              <dl className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-8">
                <Reveal className="min-w-0">
                  <dt className="label" style={{ color: 'var(--color-faint)' }}>ENQUIRIES</dt>
                  <dd className="mt-4 pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
                    <a
                      href={`mailto:${site.email}`}
                      className="tap group inline-flex min-h-11 items-center text-[1.0625rem] font-medium"
                    >
                      <span className="border-b border-transparent pb-0.5 transition-colors duration-250 group-hover:border-current">
                        {site.email}
                      </span>
                    </a>
                    <p className="body-type mt-3 max-w-[34ch]" style={{ color: 'var(--color-muted)' }}>
                      Submissions go through the forms rather than by email — they ask for
                      what an assessment actually needs.
                    </p>
                  </dd>
                </Reveal>

                <Reveal delay={90} className="min-w-0">
                  <dt className="label" style={{ color: 'var(--color-faint)' }}>OFFICE</dt>
                  <dd className="mt-4 pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
                    <address className="not-italic text-[1.0625rem] font-medium leading-relaxed">
                      {officeLines.map((line) => (
                        <span key={line} className="block">{line}</span>
                      ))}
                    </address>
                    <a
                      href={officeMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tap group mt-2 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium"
                    >
                      <span className="border-b border-transparent pb-0.5 transition-colors duration-250 group-hover:border-current">
                        View on map
                      </span>
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        ↗
                      </span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </dd>
                </Reveal>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
