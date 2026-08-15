export function BackButton({
  onClick,
  label = 'Back',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button type="button" className="mobile-back-btn" aria-label={label} onClick={onClick}>
      <span className="mobile-back-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 6L9 12l6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
