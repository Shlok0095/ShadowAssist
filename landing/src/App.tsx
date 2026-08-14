import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { DocsLayout } from '@/components/DocsLayout'
import { DocsHome } from '@/pages/DocsHome'
import { DocsGettingStarted } from '@/pages/DocsGettingStarted'
import { DocsShipping } from '@/pages/DocsShipping'
import { Home } from '@/pages/Home'
import { DownloadsPage } from '@/pages/DownloadsPage'
import { MarketingBuiltForLive } from '@/pages/MarketingBuiltForLive'
import { MarketingHowItWorks } from '@/pages/MarketingHowItWorks'
import { DocGuidePage } from '@/pages/DocGuidePage'
import { LegalPage } from '@/pages/LegalPage'
import MobileInterviewApp from '@/mobile/MobileInterviewApp'
import terms from '../../legal/terms.txt?raw'
import privacy from '../../legal/privacy.txt?raw'

export default function App() {
  return (
    <Routes>
      <Route path="app" element={<MobileInterviewApp />} />
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="download" element={<DownloadsPage />} />
        <Route path="how-it-works" element={<MarketingHowItWorks />} />
        <Route path="built-for-live-work" element={<MarketingBuiltForLive />} />
        <Route path="docs" element={<DocsLayout />}>
          <Route index element={<DocsHome />} />
          <Route path="getting-started" element={<DocsGettingStarted />} />
          <Route path="how-it-works" element={<Navigate to="/docs/overview" replace />} />
          <Route path="shipping" element={<DocsShipping />} />
          <Route path=":slug" element={<DocGuidePage />} />
        </Route>
        <Route
          path="legal/terms"
          element={<LegalPage title="Terms of service" crumb="Terms" body={terms} />}
        />
        <Route
          path="legal/privacy"
          element={<LegalPage title="Privacy policy" crumb="Privacy" body={privacy} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
