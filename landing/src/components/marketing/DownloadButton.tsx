import { WindowsIcon } from '@/components/marketing/LightButton'
import { SITE } from '@/config/site'

/** Single site-wide download CTA — use only in the header / mobile drawer. */
export function DownloadButton({ className = '' }: { className?: string }) {
  return (
    <a href={SITE.downloadSetupExeUrl} className={`lm-download-btn ${className}`.trim()}>
      <WindowsIcon />
      <span>Download</span>
    </a>
  )
}
