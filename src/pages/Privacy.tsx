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
 * What the platform collects, and why.
 *
 * Written against what the code actually does rather than from a template: the
 * forms it names are the forms that exist, the fields it lists are the columns
 * that are stored, and the retention it describes is the retention the admin
 * surface can actually perform. A policy that describes a different system is
 * worse than none, because it is a promise nobody is keeping.
 *
 * It deliberately does not claim compliance with any particular regime. That
 * is a determination for a lawyer against a jurisdiction, not something a
 * website can assert about itself.
 */
export default function Privacy() {
  return (
    <>
      <PageMeta
        title="Privacy"
        description="What InThinks collects when you submit a challenge, an innovation or a message, why it is held, who can see it, and how to have it removed."
      />
      <PageHero
        eyebrow="Legal"
        title="Privacy."
        lede="What this platform collects, why it holds it, who inside InThinks can see it, and how to have it removed. Written against what the system actually does."
      >
        <Notice>Pending legal review — accurate to the platform, not yet reviewed by counsel</Notice>
      </PageHero>

      <div className="container-grid pb-28">
        <Clause index="01" title="What is collected">
          <p>
            Three forms on this site collect personal information, and nothing else on
            it does.
          </p>
          <p>
            <strong style={{ color: 'var(--color-ink)' }}>Submit a Challenge</strong> collects
            your company, your name, your role, an email address, optionally a phone
            number, a location and a website, and the technical description of the
            problem you are bringing.
          </p>
          <p>
            <strong style={{ color: 'var(--color-ink)' }}>Submit an Innovation</strong> collects
            your name, an email address, optionally an institution and its type, the
            technical description of the technology, and any files you attach.
          </p>
          <p>
            <strong style={{ color: 'var(--color-ink)' }}>Contact</strong> collects your
            name, an email address, optionally an organisation, a topic and your message.
          </p>
          <p>
            The site sets no advertising or analytics cookies and runs no third-party
            tracking script. It stores two things in your browser, both local to it and
            neither sent anywhere: your appearance preference, and any form draft you
            have not yet submitted.
          </p>
        </Clause>

        <Clause index="02" title="Why it is held">
          <p>
            To answer you, and to assess what you sent. A challenge is read to decide
            whether InThinks holds or can develop a technology relevant to it; an
            innovation is read to decide whether InThinks can take it further. Neither
            can be done without the technical content, and neither can be answered
            without a way to reach you.
          </p>
          <p>
            Submissions are also compared against each other by an automated matching
            step. That comparison runs over the technical content only — never over
            your name, your email or your institution, which the matching code does not
            read at all.
          </p>
        </Clause>

        <Clause index="03" title="What is published, and what is not">
          <p>
            A technology that InThinks develops may appear publicly. What appears is a
            profile written by InThinks about the technology — not your submission. Your
            name, your institution and your contact details are held in a separate part
            of the database that the public site has no route to, and a draft that
            mentions any of them is refused at the moment of publication rather than
            published and corrected.
          </p>
          <p>
            An industrial challenge may likewise appear as an anonymised technical
            profile. Your company, your site, your operating data and your commercial
            impact are not part of that profile and cannot be reached from it.
          </p>
          <p>
            Nothing is published without a person at InThinks deciding to publish it.
          </p>
        </Clause>

        <Clause index="04" title="Who can see it">
          <p>
            Access inside InThinks is by role, and the roles are enforced by the server
            rather than by what a screen chooses to show.
          </p>
          <p>
            A reviewer assessing a technology cannot retrieve the innovator's identity
            or any commercial terms — those fields are absent from what the server sends
            them, not hidden by the page. Commercial roles can see identity and terms
            and cannot record a technical review. Every read and every change is
            recorded in an audit log with who did it and when.
          </p>
        </Clause>

        <Clause index="05" title="How long it is kept">
          <p>
            Submissions are kept while they are under assessment and afterwards as a
            record of what was assessed and decided. There is no automatic deletion: a
            record is removed when someone asks for it to be removed, or when InThinks
            decides it is no longer needed.
          </p>
          <p>
            Files attached to an innovation are held in object storage and are reachable
            only through short-lived signed links issued to a signed-in reviewer.
          </p>
        </Clause>

        <Clause index="06" title="Where it is held">
          <p>
            On Cloudflare's platform. The database and the file storage are Cloudflare
            services, and requests are served from the edge location nearest to you.
            InThinks does not operate its own servers.
          </p>
          <p>
            The matching step sends the technical content of a challenge and of
            candidate technologies to Anthropic's API for analysis. It does not send
            names, email addresses, institutions or companies.
          </p>
        </Clause>

        <Clause index="07" title="Asking for a copy, a correction or a deletion">
          <p>
            Write to{' '}
            <a href={`mailto:${site.email}`} className="border-b border-current pb-0.5" style={{ color: 'var(--color-accent)' }}>
              {site.email}
            </a>{' '}
            with the reference number issued when you submitted, and say what you want
            done. A reference makes the record findable; without one it may not be.
          </p>
          <p>
            InThinks will confirm what it holds and act on the request. Where a record
            has already been published as an anonymised profile, deletion of the
            underlying submission does not by itself remove the profile — ask for both
            if that is what you want.
          </p>
        </Clause>

        <Clause index="08" title="Contact">
          <p>
            {site.name}, {officeLines(office).join(', ')}. Questions about this page go
            to{' '}
            <a href={`mailto:${site.email}`} className="border-b border-current pb-0.5" style={{ color: 'var(--color-accent)' }}>
              {site.email}
            </a>.
          </p>
        </Clause>

        <Reveal>
          <p className="label mt-10" style={{ color: 'var(--color-faint)' }}>
            THIS PAGE DESCRIBES THE SYSTEM AS BUILT. IT HAS NOT BEEN REVIEWED BY A
            LAWYER AND MAKES NO CLAIM OF COMPLIANCE WITH ANY PARTICULAR REGIME.
          </p>
        </Reveal>
      </div>
    </>
  )
}
