import Hero from '../components/home/Hero'
import AudienceGateway from '../components/home/AudienceGateway'
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

/** Homepage section order is fixed by the brief; each section owns its number. */
const COORDINATES = [
  { id: 'top', label: 'Signal' },
  { id: 'gateways', label: 'Entry points' },
  { id: 'engine', label: 'The engine' },
  { id: 'pipeline', label: 'Technology development' },
  { id: 'technologies', label: 'Portfolio' },
  { id: 'explore', label: 'Problem explorer' },
  { id: 'value', label: 'Value addition' },
  { id: 'challenge-model', label: 'Challenge model' },
  { id: 'sourcing', label: 'Innovation sourcing' },
  { id: 'transfer', label: 'Technology transfer' },
  { id: 'confidentiality', label: 'Confidentiality' },
  { id: 'partner', label: 'Which side' },
]

export default function Home() {
  return (
    <>
      <ScrollCoordinate sections={COORDINATES} />
      <Hero />
      <AudienceGateway />
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
