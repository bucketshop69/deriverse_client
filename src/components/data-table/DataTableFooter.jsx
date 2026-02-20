export default function DataTableFooter({
  visibleStart,
  visibleEnd,
  activeRowsLength,
  activeRowsLabel,
  activeStatusFilter,
  activeScopedCount,
  dashboardPeriodLabel,
  pageSize,
  onPageSizeChange,
  currentPage,
  pageCount,
  onPageChange,
  paginationItems,
}) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-panel-border bg-neutral-dark/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-secondary-text">
      <div className="flex items-center gap-4">
        <a
          aria-label="Deriverse on X"
          className="inline-flex items-center text-secondary-text transition-colors hover:text-white"
          href="https://x.com/deriverse_io"
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2H21.5l-7.11 8.126L22.75 22h-6.54l-5.12-6.692L5.23 22H1.97l7.606-8.696L1.5 2h6.706l4.628 6.104L18.244 2Zm-1.142 18h1.804L7.23 3.894H5.294L17.102 20Z" />
          </svg>
        </a>
        <a
          className="text-[9px] text-secondary-text transition-colors hover:text-white"
          href="https://deriverse.gitbook.io/deriverse-v1"
          rel="noopener noreferrer"
          target="_blank"
        >
          Docs
        </a>
        <span>
          Showing {visibleStart}-{visibleEnd} of {activeRowsLength} {activeRowsLabel}
        </span>
        {activeStatusFilter !== 'ALL' && (
          <span className="text-[9px] text-secondary-text/80">
            ({activeStatusFilter.toLowerCase()} from {activeScopedCount} scoped)
          </span>
        )}
        <span className="text-[9px] text-secondary-text/80">Range: {dashboardPeriodLabel}</span>
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-success" />
          <span className="text-[9px]">Live Synced</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-secondary-text" htmlFor="rows-per-page">
          Rows
          <select
            className="h-7 border border-panel-border bg-background-dark px-2 text-[10px] font-bold uppercase text-white outline-none"
            id="rows-per-page"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          type="button"
        >
          Start
        </button>
        <button
          className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          type="button"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          {paginationItems.map((item) =>
            typeof item === 'string' ? (
              <span className="text-secondary-text/70" key={item}>
                ...
              </span>
            ) : (
              <button
                className={item === currentPage ? 'border-b border-white text-white' : 'cursor-pointer hover:text-white'}
                key={`page-${item}`}
                onClick={() => onPageChange(item)}
                type="button"
              >
                {String(item).padStart(2, '0')}
              </button>
            ),
          )}
        </div>
        <button
          className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          type="button"
        >
          Next
        </button>
        <button
          className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(pageCount)}
          type="button"
        >
          End
        </button>
      </div>
    </div>
  )
}
