import { formatFee } from '../../data/mockDashboardData'

export default function TransfersTable({ rows, transferStatusFilter, onTransferStatusFilterChange }) {
  return (
    <table className="w-full min-w-[980px] text-left text-xs">
      <thead>
        <tr className="bg-neutral-dark/30 text-[10px] font-semibold uppercase text-secondary-text">
          <th className="border-b border-r border-panel-border px-4 py-2">Date / Time</th>
          <th className="border-b border-r border-panel-border px-4 py-2">Transfer ID</th>
          <th className="border-b border-r border-panel-border px-4 py-2">Type</th>
          <th className="border-b border-r border-panel-border px-4 py-2">Asset</th>
          <th className="border-b border-r border-panel-border px-4 py-2 text-right">Amount</th>
          <th className="border-b border-panel-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span>Status</span>
              <select
                className="h-6 border border-panel-border bg-transparent px-1.5 text-[9px] font-bold uppercase text-white outline-none"
                id="transfer-status-filter"
                onChange={(event) => onTransferStatusFilterChange(event.target.value)}
                value={transferStatusFilter}
              >
                <option className="bg-background-dark text-white" value="ALL">All</option>
                <option className="bg-background-dark text-white" value="COMPLETED">Completed</option>
                <option className="bg-background-dark text-white" value="PENDING">Pending</option>
                <option className="bg-background-dark text-white" value="FAILED">Failed</option>
              </select>
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-dark">
        {rows.map((transfer) => (
          <tr className="group transition-colors hover:bg-neutral-dark/10" key={transfer.id}>
            <td className="mono px-4 py-2 text-secondary-text">{transfer.dateTimeLabel}</td>
            <td className="mono px-4 py-2 text-white">{transfer.transferId}</td>
            <td className="px-4 py-2">
              <span
                className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold ${
                  transfer.type === 'DEPOSIT'
                    ? 'border border-success/20 bg-success/10 text-success'
                    : 'border border-danger/20 bg-danger/10 text-danger'
                }`}
              >
                {transfer.type}
              </span>
            </td>
            <td className="mono px-4 py-2 text-white">{transfer.asset}</td>
            <td className={`mono px-4 py-2 text-right font-bold ${transfer.type === 'DEPOSIT' ? 'text-success' : 'text-danger'}`}>
              {transfer.type === 'DEPOSIT' ? '+' : '-'}
              {formatFee(transfer.amount)}
            </td>
            <td className="px-4 py-2">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold ${
                  transfer.status === 'COMPLETED'
                    ? 'border border-success/20 bg-success/10 text-success'
                    : transfer.status === 'PENDING'
                      ? 'border border-primary/40 bg-primary/10 text-primary'
                      : 'border border-danger/20 bg-danger/10 text-danger'
                }`}
              >
                <span className="size-1 rounded-full bg-current" />
                {transfer.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
