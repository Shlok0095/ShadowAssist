import { brandLogo } from '../brandAssets'

export function HomeScreen({
  onStart,
  onOpenSettings,
  profileReady,
  hasApiKey,
}: {
  onStart: () => void
  onOpenSettings: () => void
  profileReady: boolean
  hasApiKey: boolean
}) {
  return (
    <div className="mobile-home">
      <header className="mobile-home-header">
        <div className="flex items-center">
          <img src={brandLogo} alt="" className="mobile-interview-logo" />
        </div>
        <button type="button" className="mobile-interview-icon-btn" aria-label="Settings" onClick={onOpenSettings}>
          ⚙
        </button>
      </header>

      <div className="mobile-info-card">
        <p className="mobile-info-card-title">Use a different device for your interview call</p>
        <ul className="mobile-info-card-list">
          <li>Android only allows one app to use the mic at a time.</li>
          <li>Don&apos;t use headphones — the app uses the device mic, not system audio.</li>
        </ul>
      </div>

      <div className="mobile-home-center">
        <h2 className="mobile-home-ready">Ready when you are</h2>
        <button
          type="button"
          className="mobile-start-btn"
          onClick={onStart}
          disabled={!profileReady || !hasApiKey}
        >
          <span className="mobile-start-icon">▶</span>
          Start Interview
        </button>
        {!profileReady ? (
          <p className="mobile-home-hint">Add your resume in Settings → Personal Info first.</p>
        ) : null}
        {!hasApiKey ? (
          <p className="mobile-home-hint">Add your API key in Settings → AI Provider.</p>
        ) : null}
      </div>
    </div>
  )
}
