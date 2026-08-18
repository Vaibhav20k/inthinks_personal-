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

/** Homepage section order is fixed by the brief; each section owns its number. */
export default function Home() {
  return (
    <>
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
