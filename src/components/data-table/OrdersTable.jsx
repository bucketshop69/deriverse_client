import { formatPrice, formatTradeSize } from '../../data/mockDashboardData'

export default function OrdersTable({
  rows,
  symbolFilter,
  onSymbolFilterChange,
  selectableSymbols,
  orderStatusFilter,
  onOrderStatusFilterChange,
}) {
  return (
    <table className="w-full min-w-[1120px] text-left text-xs">
      <thead>
        <tr className="bg-neutral-dark/30 text-[10px] font-semibold uppercase text-secondary-text">
          <th className="border-b border-r border-panel-border px-4 py-2">Date / Time</th>
          <th className="border-b border-r border-panel-border px-4 py-2">Order ID</th>
          <th className="border-b border-r border-panel-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span>Symbol</span>
              <select
                className="h-6 border border-panel-border bg-transparent px-1.5 text-[9px] font-bold uppercase text-white outline-none"
                id="symbol-filter-orders"
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
          <th className="border-b border-r border-panel-border px-4 py-2">Side</th>
          <th className="border-b border-r border-panel-border px-4 py-2">Type</th>
          <th className="border-b border-r border-panel-border px-4 py-2">TIF</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Size</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Filled</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Price</th>
          <th className="border-b border-panel-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span>Status</span>
              <select
                className="h-6 border border-panel-border bg-transparent px-1.5 text-[9px] font-bold uppercase text-white outline-none"
                id="order-status-filter"
                onChange={(event) => onOrderStatusFilterChange(event.target.value)}
                value={orderStatusFilter}
              >
                <option className="bg-background-dark text-white" value="ALL">All</option>
                <option className="bg-background-dark text-white" value="OPEN">Open</option>
                <option className="bg-background-dark text-white" value="FILLED">Filled</option>
                <option className="bg-background-dark text-white" value="CANCELED">Canceled</option>
              </select>
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-dark">
        {rows.map((order) => (
          <tr className="group transition-colors hover:bg-neutral-dark/10" key={order.id}>
            <td className="mono px-4 py-2 text-secondary-text">{order.dateTimeLabel}</td>
            <td className="mono px-4 py-2 text-white">{order.orderId}</td>
            <td className="px-4 py-2 font-bold uppercase tracking-tight text-white">{order.symbol}</td>
            <td className="px-4 py-2">
              <span
                className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold ${
                  order.side === 'LONG'
                    ? 'border border-success/20 bg-success/10 text-success'
                    : 'border border-danger/20 bg-danger/10 text-danger'
                }`}
              >
                {order.side}
              </span>
            </td>
            <td className="px-4 py-2 text-[10px] font-medium uppercase text-secondary-text">{order.type}</td>
            <td className="mono px-4 py-2 text-white">{order.timeInForce}</td>
            <td className="mono px-4 py-2 text-right text-white">{formatTradeSize(order.size, order.baseAsset, order.sizeDigits)}</td>
            <td className="mono px-4 py-2 text-right text-white">{formatTradeSize(order.filledSize, order.baseAsset, order.sizeDigits)}</td>
            <td className="mono px-4 py-2 text-right text-white">{formatPrice(order.price)}</td>
            <td className="px-4 py-2">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold ${
                  order.status === 'OPEN'
                    ? 'border border-primary/40 bg-primary/10 text-primary'
                    : order.status === 'FILLED'
                      ? 'border border-success/20 bg-success/10 text-success'
                      : 'border border-danger/20 bg-danger/10 text-danger'
                }`}
              >
                <span className="size-1 rounded-full bg-current" />
                {order.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
