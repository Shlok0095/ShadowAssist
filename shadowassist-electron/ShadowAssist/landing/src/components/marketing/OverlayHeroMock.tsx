/** Static overlay UI mock (Cluely-style peek) — decorative until hero video is uploaded. */
export function OverlayHeroMock() {
  return (
    <div className="va-overlay-mock mx-auto w-full max-w-2xl select-none" aria-hidden>
      <div className="va-overlay-mock__chrome">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-white/10" />
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
              Hide ▾
            </span>
          </div>
          <span className="h-5 w-5 rounded border border-white/15 bg-white/[0.04]" />
        </div>
        <div className="px-4 pb-3 pt-1">
          <div className="mb-3 flex justify-end">
            <span className="rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white">What should I say?</span>
          </div>
          <p className="text-left text-[13px] leading-relaxed text-zinc-200">
            “A discounted cash flow model values a company by projecting future free cash flows and discounting them to
            present value using the weighted average cost of capital.”
          </p>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3 text-[10px] text-zinc-500">
            <span>✦ Assist</span>
            <span>What should I say?</span>
            <span>Follow-up</span>
            <span>Recap</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2">
            <span className="flex-1 text-[11px] text-zinc-500">Ask about your screen or conversation…</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">▶</span>
          </div>
        </div>
      </div>
    </div>
  )
}
