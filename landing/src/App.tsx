import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { DocsHome } from '@/pages/DocsHome'
import { Home } from '@/pages/Home'
import { HowItWorks } from '@/pages/HowItWorks'
import { LegalPage } from '@/pages/LegalPage'
import terms from '../../legal/terms.txt?raw'
import privacy from '../../legal/privacy.txt?raw'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="docs" element={<DocsHome />} />
        <Route path="docs/how-it-works" element={<HowItWorks />} />
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
