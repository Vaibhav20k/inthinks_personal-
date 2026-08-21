import PageHero from '../components/layout/PageHero'
import PageMeta from '../components/layout/PageMeta'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import { office, officeLines, site } from '../data/site'

/** A titled block of prose, so every clause on the page is built the same way. */
function Clause({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <section className="py-10" style={{ borderTop: '1px solid var(--rule)' }}>
      <div className="doc-columns">
        <SectionLabel index={index}>{title}</SectionLabel>
        <div className="body-type measure-prose grid gap-5" style={{ color: 'var(--color-muted)' }}>
          {children}
        </div>
      </div>
    </section>
  )
}

/**
 * Terms of use.
 *
 * Short on purpose. This is a site that publishes anonymised technical records
 * and accepts submissions through three forms; the terms cover what those
 * records are, what they are not, and what the site does not promise. Anything
 * longer would be a template rather than a description.
 */
export default function Terms() {
  return (
    <>
      <PageMeta
        title="Terms of Use"
        description="The terms on which InThinks publishes its technology and challenge registers, and the limits of what those records represent."
      />
      <PageHero
        eyebrow="Legal"
        title="Terms of use."
        lede="What the records on this site are, what they are not, and what using it does and does not create between us."
      >
        <Notice>Pending legal review — accurate to the platform, not yet reviewed by counsel</Notice>
      </PageHero>

      <div className="container-grid pb-28">
        <Clause index="01" title="What this site is">
          <p>
            A public register of early-stage technologies InThinks is developing, a
            register of industrial challenges brought to it, and the relationships
            between the two that have survived a technical review.
          </p>
          <p>
            Records are anonymised by design. A technology profile does not identify the
            innovator or their institution; a challenge profile does not identify the
            company or its site.
          </p>
        </Clause>

        <Clause index="02" title="What a record is not">
          <p>
            A published profile is a technical description, not an offer. It does not
            constitute an offer to license, sell, assign or transfer anything, and it
            does not represent that InThinks holds rights beyond those stated on the
            record itself.
          </p>
          <p>
            TRL figures, transfer statuses and match classifications are InThinks&rsquo;
            own assessments at a point in time. They are judgements, not certifications,
            and they change.
          </p>
          <p>
            Records labelled <strong style={{ color: 'var(--color-ink)' }}>illustrative</strong> are
            examples written to demonstrate the platform. They describe no real
            technology, no real company and no real submission, and nothing about them
            should be relied on as a statement about anything InThinks holds.
          </p>
        </Clause>

        <Clause index="03" title="Accuracy">
          <p>
            InThinks writes these records from what it knows and keeps them current as
            far as it reasonably can. It does not warrant that any record is complete,
            accurate or up to date, and it does not accept liability for decisions taken
            on the basis of one. Anything material should be confirmed with InThinks
            directly before it is acted on.
          </p>
        </Clause>

        <Clause index="04" title="Using the site">
          <p>
            You may read, link to and quote from the public registers. You may not
            attempt to reach non-public data, interfere with the service, or use
            automated means to extract the registers in bulk.
          </p>
          <p>
            The text, structure, reference system and design of this site belong to
            InThinks. The technologies described in it belong to whoever owns them, which
            in most cases is not InThinks.
          </p>
        </Clause>

        <Clause index="05" title="What using the site does not create">
          <p>
            Reading this site, submitting through it, or corresponding with InThinks
            creates no partnership, agency, joint venture, employment or fiduciary
            relationship, and no obligation on either side to proceed with anything.
          </p>
          <p>
            Any actual arrangement — an evaluation, a development programme, a licence,
            a transfer — exists only when it is written down and signed by both parties.
          </p>
        </Clause>

        <Clause index="06" title="Changes, and contact">
          <p>
            These terms may change; the version on this page at the time you read it is
            the one that applies. {site.name}, {officeLines(office).join(', ')}. Questions
            to{' '}
            <a href={`mailto:${site.email}`} className="border-b border-current pb-0.5" style={{ color: 'var(--color-accent)' }}>
              {site.email}
            </a>.
          </p>
        </Clause>

        <Reveal>
          <p className="label mt-10" style={{ color: 'var(--color-faint)' }}>
            THIS PAGE HAS NOT BEEN REVIEWED BY A LAWYER. IT DESCRIBES INTENT AND SHOULD
            BE REVIEWED AGAINST THE RELEVANT JURISDICTION BEFORE LAUNCH.
          </p>
        </Reveal>
      </div>
    </>
  )
}
