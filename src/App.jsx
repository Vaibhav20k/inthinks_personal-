import Cta from './components/Cta'
import Faq from './components/Faq'
import Features from './components/Features'
import Footer from './components/Footer'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Nav from './components/Nav'
import Pricing from './components/Pricing'
import Testimonial from './components/Testimonial'

export default function App() {
  return (
    <div className="min-h-screen bg-ink-950 font-sans antialiased selection:bg-brand-500/30">
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonial />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
