import { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Technologies from './pages/Technologies'
import Problems from './pages/Problems'
import ProblemDetail from './pages/ProblemDetail'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import TechnologyDetail from './pages/TechnologyDetail'
import ForIndustry from './pages/ForIndustry'
import ForInnovators from './pages/ForInnovators'
import HowItWorks from './pages/HowItWorks'
import TechnologyTransfer from './pages/TechnologyTransfer'
import About from './pages/About'
import ConfidentialityPage from './pages/Confidentiality'
import Contact from './pages/Contact'
import SubmitChallenge from './pages/SubmitChallenge'
import SubmitInnovation from './pages/SubmitInnovation'
import NotFound from './pages/NotFound'

// Lazy so the public site never ships the admin bundle to a visitor.
const AdminApp = lazy(() => import('./admin/AdminApp'))

/**
 * Real paths in production. A hash router is available for builds served from
 * a sub-path where the host cannot rewrite unknown routes to index.html —
 * static previews and file:// bundles. Cloudflare handles that rewrite via
 * `not_found_handling`, so the deployed site always gets clean URLs.
 */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/technologies" element={<Technologies />} />
          <Route path="/technologies/:slug" element={<TechnologyDetail />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:slug" element={<ProblemDetail />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:slug" element={<MatchDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/for-industry" element={<ForIndustry />} />
          <Route path="/for-innovators" element={<ForInnovators />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/technology-transfer" element={<TechnologyTransfer />} />
          <Route path="/about" element={<About />} />
          <Route path="/confidentiality" element={<ConfidentialityPage />} />
          <Route path="/submit-challenge" element={<SubmitChallenge />} />
          <Route path="/submit-innovation" element={<SubmitInnovation />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Outside the public layout: the admin surface has its own chrome. */}
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  )
}
