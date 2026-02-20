export default function NoteEditorModal({ isOpen, trade, noteValue, onNoteChange, onSave, onClose, maxLength = 500 }) {
  if (!isOpen || !trade) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/65 px-4">
      <div className="w-full max-w-[560px] border border-panel-border bg-background-dark p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Position Note</p>
            <p className="mono text-sm font-bold text-white">{trade.symbol}</p>
          </div>
          <button
            className="h-8 w-8 border border-panel-border bg-neutral-dark/40 text-lg leading-none text-secondary-text hover:text-white"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-secondary-text" htmlFor="position-note-editor">
            Notes
          </label>
          <textarea
            className="thin-scrollbar h-32 w-full resize-none border border-panel-border bg-background-dark px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-text/70"
            id="position-note-editor"
            maxLength={maxLength}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Add context for this position..."
            value={noteValue}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-secondary-text">
            <span>Leave empty to remove note</span>
            <span className="mono">
              {noteValue.length}/{maxLength}
            </span>
          </div>
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
            className="h-9 border border-primary/50 bg-primary/10 px-3 text-[10px] font-bold uppercase tracking-wider text-primary hover:border-primary"
            onClick={onSave}
            type="button"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  )
}
