/** Ambient layers: perspective grid, aurora mesh, scan line, orbital ring. */
export function FuturisticBackground() {
  return (
    <div className="futura-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="futura-bg__mesh" />
      <div className="futura-bg__grid" />
      <div className="futura-bg__orb futura-bg__orb--a" />
      <div className="futura-bg__orb futura-bg__orb--b" />
      <div className="futura-bg__orb futura-bg__orb--c" />
      <div className="futura-bg__scan" />
      <div className="futura-bg__ring" />
    </div>
  )
}
