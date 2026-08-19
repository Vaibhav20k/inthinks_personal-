import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'

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
    </>
  )
}
