import PageHero from '../components/layout/PageHero'
import PageMeta from '../components/layout/PageMeta'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import Button from '../components/primitives/Button'
import { site } from '../data/site'

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
 * Submission terms.
 *
 * The page a person is entitled to read before they hand over an unpublished
 * invention or an unsolved industrial problem. Its job is to be clear about
 * what submitting does *not* do, because that is the thing people most often
 * assume — and the assumption that a submission creates a claim, in either
 * direction, is the expensive one.
 */
export default function SubmissionTerms() {
  return (
    <>
      <PageMeta
        title="Submission Terms"
        description="What submitting an innovation or an industrial challenge to InThinks does and does not create, how confidentiality is handled, and what happens to what you send."
      />
      <PageHero
        eyebrow="Legal"
        title="Submission terms."
        lede="What happens to what you send, what submitting does not create, and how confidentiality is actually handled here."
      >
        <Notice>Pending legal review — accurate to the platform, not yet reviewed by counsel</Notice>
      </PageHero>

      <div className="container-grid pb-28">
        <Clause index="01" title="Submitting transfers nothing">
          <p>
            Submitting an innovation does not transfer ownership and does not create an
            acquisition, licence, option, assignment or development agreement. Submitting
            a challenge does not engage InThinks to solve it.
          </p>
          <p>
            Any such arrangement requires separate written documentation signed by both
            parties. Nothing on this site, and nothing in correspondence about a
            submission, is that documentation.
          </p>
        </Clause>

        <Clause index="02" title="What InThinks may do with a submission">
          <p>
            Read it, assess it, compare it against the other side of the platform, and
            reply to you. That is the whole purpose, and it is the limit.
          </p>
          <p>
            InThinks does not sell submissions, does not pass them to third parties as
            leads, and does not use them to develop something itself without an
            agreement with you.
          </p>
        </Clause>

        <Clause index="03" title="Confidentiality, stated honestly">
          <p>
            Your identity and the detail of what you submit are not published by
            default. Anything that becomes public is written by InThinks, about the
            technology or the problem, and is anonymised — the identifying fields live
            in a separate part of the database that the public site has no route to.
          </p>
          <p>
            That is a design commitment enforced in the system, and it is not the same
            thing as a non-disclosure agreement. If your disclosure needs an NDA, say so
            before you send anything: mark the submission as requiring one, or write
            first and ask.
          </p>
          <p>
            Do not send anything whose disclosure would be damaging without an agreement
            already in place. A public register and an unfiled invention are a bad
            combination, and no promise on a web page changes that.
          </p>
        </Clause>

        <Clause index="04" title="Before you submit an unfiled invention">
          <p>
            Public disclosure can affect patentability in most jurisdictions. InThinks
            does not publish submissions, but it also cannot advise you on your filing
            position. If the technology is unfiled and you intend to file, take advice
            before you disclose it to anyone — including us.
          </p>
        </Clause>

        <Clause index="05" title="What you are confirming">
          <p>
            That you are entitled to make the submission: that it is yours, or that you
            have the authority of whoever it belongs to. That you are not sending
            anything under an obligation of confidence to somebody else. And that what
            you have written is accurate as far as you know it.
          </p>
          <p>
            An assessment is only as good as what it is given, and a submission that
            overstates its evidence wastes both sides&rsquo; time before it fails.
          </p>
        </Clause>

        <Clause index="06" title="Withdrawal">
          <p>
            You can withdraw a submission. Write to{' '}
            <a href={`mailto:${site.email}`} className="border-b border-current pb-0.5" style={{ color: 'var(--color-accent)' }}>
              {site.email}
            </a>{' '}
            with the reference issued when you submitted. Where a profile has already
            been published from it, say whether you want that removed as well.
          </p>
        </Clause>

        <div className="pt-10" style={{ borderTop: '1px solid var(--rule)' }}>
          <div className="flex flex-wrap gap-3">
            <Button to="/submit-innovation">Submit an Innovation</Button>
            <Button to="/submit-challenge" variant="outline">Submit a Challenge</Button>
          </div>
        </div>

        <Reveal>
          <p className="label mt-10" style={{ color: 'var(--color-faint)' }}>
            THIS PAGE HAS NOT BEEN REVIEWED BY A LAWYER. IT DESCRIBES HOW THE PLATFORM
            BEHAVES AND SHOULD BE REVIEWED BEFORE LAUNCH.
          </p>
        </Reveal>
      </div>
    </>
  )
}
