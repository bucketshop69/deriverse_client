export default function DataTableToolbar({
  tableView,
  onTableViewChange,
  chatgptPrefillUrl,
  claudePrefillUrl,
  activeRowsLength,
  onExportCsv,
  onExportPdf,
}) {
  return (
    <div className="flex items-center justify-between border-b border-panel-border px-4 py-2">
      <div className="flex items-center gap-2">
        {[
          { id: 'POSITIONS', label: 'Positions' },
          { id: 'ORDERS', label: 'Orders' },
          { id: 'TRANSFERS', label: 'Deposits/Withdrawals' },
        ].map((option) => (
          <button
            className={`h-7 border px-3 text-[10px] font-bold uppercase transition-colors ${
              tableView === option.id
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-panel-border text-secondary-text hover:text-white'
            }`}
            key={option.id}
            onClick={() => onTableViewChange(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase text-secondary-text">Ask AI</span>
        <a
          className="h-7 border border-panel-border px-3 text-[10px] font-bold uppercase leading-7 text-secondary-text transition-colors hover:text-white"
          href={chatgptPrefillUrl}
          rel="noreferrer"
          target="_blank"
        >
          ChatGPT
        </a>
        <a
          className="h-7 border border-panel-border px-3 text-[10px] font-bold uppercase leading-7 text-secondary-text transition-colors hover:text-white"
          href={claudePrefillUrl}
          rel="noreferrer"
          target="_blank"
        >
          Claude
        </a>

        <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-secondary-text" htmlFor="export-menu">
          Export
          <select
            className="h-7 border border-panel-border bg-background-dark px-2 text-[10px] font-bold uppercase text-white outline-none disabled:cursor-not-allowed disabled:opacity-40"
            defaultValue=""
            disabled={activeRowsLength === 0}
            id="export-menu"
            onChange={(event) => {
              if (event.target.value === 'CSV') {
                onExportCsv()
              }

              if (event.target.value === 'PDF') {
                onExportPdf()
              }

              event.target.value = ''
            }}
          >
            <option disabled value="">
              Choose
            </option>
            <option value="CSV">CSV</option>
            <option value="PDF">PDF</option>
          </select>
        </label>
      </div>
    </div>
  )
}
