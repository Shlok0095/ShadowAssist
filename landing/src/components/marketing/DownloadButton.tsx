import { Link } from 'react-router-dom'
import { WindowsIcon } from '@/components/marketing/LightButton'
import { SITE } from '@/config/site'

/** Site-wide download CTA — routes to the download center (all platforms). */
export function DownloadButton({ className = '' }: { className?: string }) {
  return (
    <Link to={SITE.downloadPageUrl} className={`lm-download-btn ${className}`.trim()}>
      <WindowsIcon />
      <span>Download</span>
    </Link>
  )
}
