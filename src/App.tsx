import DomainIndex from './components/DomainIndex'
import EditorialStatement from './components/EditorialStatement'
import ExperimentCanvas from './components/ExperimentCanvas'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import InnovationJourney from './components/InnovationJourney'
import InsightsIndex from './components/InsightsIndex'
import OperatingModel from './components/OperatingModel'
import PartnerCTA from './components/PartnerCTA'
import Principles from './components/Principles'
import SelectedInnovations from './components/SelectedInnovations'
import TechnologyTransfer from './components/TechnologyTransfer'

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>

      <Header />

      <main id="main">
        <Hero />
        <EditorialStatement />
        <InnovationJourney />
        <SelectedInnovations />
        <DomainIndex />
        <OperatingModel />
        <TechnologyTransfer />
        <Principles />
        <ExperimentCanvas />
        <InsightsIndex />
        <PartnerCTA />
      </main>

      <Footer />
    </>
  )
}
