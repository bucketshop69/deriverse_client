import { formatFee, formatPrice, formatSignedPnl, formatTradeSize } from '../../data/mockDashboardData'

export default function PositionsTable({
  rows,
  annotationMap,
  onEditNote,
  symbolFilter,
  onSymbolFilterChange,
  selectableSymbols,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <table className="w-full min-w-[1280px] text-left text-xs">
      <thead>
        <tr className="bg-neutral-dark/30 text-[10px] font-semibold uppercase text-secondary-text">
          <th className="border-b border-r border-panel-border px-4 py-2">Date / Time</th>
          <th className="border-b border-r border-panel-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span>Symbol</span>
              <select
                className="h-6 border border-panel-border bg-transparent px-1.5 text-[9px] font-bold uppercase text-white outline-none"
                id="symbol-filter-positions"
                onChange={(event) => onSymbolFilterChange(event.target.value)}
                value={symbolFilter}
              >
                {selectableSymbols.map((symbol) => (
                  <option className="bg-background-dark text-white" key={symbol} value={symbol}>
                    {symbol === 'ALL' ? 'All' : symbol}
                  </option>
                ))}
              </select>
            </div>
          </th>
          <th className="border-b border-r border-panel-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span>Status</span>
              <select
                className="h-6 border border-panel-border bg-transparent px-1.5 text-[9px] font-bold uppercase text-white outline-none"
                id="status-filter"
                onChange={(event) => onStatusFilterChange(event.target.value)}
                value={statusFilter}
              >
                <option className="bg-background-dark text-white" value="ALL">All</option>
                <option className="bg-background-dark text-white" value="OPEN">Open</option>
                <option className="bg-background-dark text-white" value="CLOSED">Closed</option>
              </select>
            </div>
          </th>
          <th className="border-b border-r border-panel-border px-4 py-2">Side</th>
          <th className="border-b border-r border-panel-border px-4 py-2">Type</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Size</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Entry</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Exit</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">PnL</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Fee</th>
          <th className="border-b border-panel-border px-4 py-2 text-center">Notes</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-dark">
        {rows.map((trade) => {
          const noteText = annotationMap[trade.id] ?? trade.annotation ?? ''
          return (
            <tr className="group transition-colors hover:bg-neutral-dark/10" key={trade.id}>
              <td className="mono px-4 py-2 text-secondary-text">{trade.dateTimeLabel}</td>
              <td className="px-4 py-2 font-bold uppercase tracking-tight text-white">{trade.symbol}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold ${
                    trade.status === 'OPEN'
                      ? 'border border-primary/40 bg-primary/10 text-primary'
                      : 'border border-secondary-text/30 bg-neutral-dark/40 text-secondary-text'
                  }`}
                >
                  <span className="size-1 rounded-full bg-current" />
                  {trade.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold ${
                    trade.side === 'LONG'
                      ? 'border border-success/20 bg-success/10 text-success'
                      : 'border border-danger/20 bg-danger/10 text-danger'
                  }`}
                >
                  {trade.side}
                </span>
              </td>
              <td className="px-4 py-2 text-[10px] font-medium uppercase text-secondary-text">{trade.type}</td>
              <td className="mono px-4 py-2 text-right text-white">{formatTradeSize(trade.size, trade.baseAsset, trade.sizeDigits)}</td>
              <td className="mono px-4 py-2 text-right text-white">{formatPrice(trade.entry)}</td>
              <td className="mono px-4 py-2 text-right text-white">{formatPrice(trade.exit)}</td>
              <td className={`mono px-4 py-2 text-right font-bold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatSignedPnl(trade.pnl)}
              </td>
              <td className="mono px-4 py-2 text-right text-secondary-text">{formatFee(trade.fee)}</td>
              <td className="px-4 py-2 text-center">
                <button
                  className={`h-6 border px-3 text-[10px] font-bold uppercase transition-colors ${
                    trade.status === 'OPEN'
                      ? 'border-primary/40 text-primary hover:border-primary'
                      : 'border-panel-border text-secondary-text hover:border-secondary-text/50 hover:text-white'
                  }`}
                  onClick={() => onEditNote(trade)}
                  title={noteText || 'No note yet'}
                  type="button"
                >
                  {noteText ? 'Edit Note' : 'Add Note'}
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
