import Hero from '../components/home/Hero'
import PageMeta from '../components/layout/PageMeta'
import AudienceGateway from '../components/home/AudienceGateway'
import IntelligenceSnapshot from '../components/home/IntelligenceSnapshot'
import Engine from '../components/home/Engine'
import TrlJourney from '../components/home/TrlJourney'
import SelectedTechnologies from '../components/home/SelectedTechnologies'
import ProblemExplorer from '../components/tech/ProblemExplorer'
import ValueAddition from '../components/home/ValueAddition'
import IndustryChallengeModel from '../components/home/IndustryChallengeModel'
import InstitutionEcosystem from '../components/home/InstitutionEcosystem'
import TransferModel from '../components/home/TransferModel'
import ConfidentialityStrip from '../components/home/ConfidentialityStrip'
import FinalCta from '../components/home/FinalCta'
import ScrollCoordinate from '../components/home/ScrollCoordinate'

/**
 * Homepage section order is fixed by the brief; each section owns its number.
 *
 * `thread` is the phase of the argument the section belongs to. The four
 * phases are what the page thread renames itself through on the way down —
 * the same connection, described by what it has become.
 */
const COORDINATES = [
  { id: 'top', label: 'Signal', thread: 'Match signal' },
  { id: 'gateways', label: 'Entry points', thread: 'Match signal' },
  { id: 'intelligence', label: 'Intelligence layer', thread: 'Match signal' },
  { id: 'engine', label: 'The engine', thread: 'Technology path' },
  { id: 'pipeline', label: 'Technology development', thread: 'Technology path' },
  { id: 'technologies', label: 'Portfolio', thread: 'Technology path' },
  { id: 'explore', label: 'Problem explorer', thread: 'Technology path' },
  { id: 'value', label: 'Value addition', thread: 'Development progress' },
  { id: 'challenge-model', label: 'Challenge model', thread: 'Development progress' },
  { id: 'sourcing', label: 'Innovation sourcing', thread: 'Development progress' },
  { id: 'transfer', label: 'Technology transfer', thread: 'Commercial pathway' },
  { id: 'confidentiality', label: 'Confidentiality', thread: 'Commercial pathway' },
  { id: 'partner', label: 'Which side', thread: 'Commercial pathway' },
]

export default function Home() {
  return (
    <>
      <PageMeta title="InThinks — Early innovation. Industry ready." description="InThinks identifies promising early-stage technologies, develops selected innovations through focused R&D, and prepares qualified solutions for industrial adoption." />
      <ScrollCoordinate sections={COORDINATES} />
      <Hero />
      <AudienceGateway />
      <IntelligenceSnapshot />
      <Engine />
      <TrlJourney />
      <SelectedTechnologies />
      <ProblemExplorer />
      <ValueAddition />
      <IndustryChallengeModel />
      <InstitutionEcosystem />
      <TransferModel />
      <ConfidentialityStrip />
      <FinalCta />
    </>
  )
}
