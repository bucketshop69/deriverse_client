export default function CustomRangeModal({
  isOpen,
  draftStartInput,
  draftEndInput,
  onDraftStartChange,
  onDraftEndChange,
  onApply,
  onClose,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[66] flex items-center justify-center bg-black/65 px-4">
      <div className="w-full max-w-[460px] border border-panel-border bg-background-dark p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Custom Range</p>
            <p className="text-sm font-bold text-white">Select start and end date</p>
          </div>
          <button
            className="h-8 w-8 border border-panel-border bg-neutral-dark/40 text-lg leading-none text-secondary-text hover:text-white"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-secondary-text">Start Date</span>
            <input
              className="h-9 w-full border border-panel-border bg-background-dark px-2 text-xs font-bold text-white outline-none"
              onChange={(event) => onDraftStartChange(event.target.value)}
              type="date"
              value={draftStartInput}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-secondary-text">End Date</span>
            <input
              className="h-9 w-full border border-panel-border bg-background-dark px-2 text-xs font-bold text-white outline-none"
              onChange={(event) => onDraftEndChange(event.target.value)}
              type="date"
              value={draftEndInput}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="h-9 border border-panel-border bg-background-dark px-3 text-[10px] font-bold uppercase tracking-wider text-secondary-text hover:text-white"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 border border-primary/50 bg-primary/10 px-3 text-[10px] font-bold uppercase tracking-wider text-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!draftStartInput || !draftEndInput}
            onClick={onApply}
            type="button"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  )
}
