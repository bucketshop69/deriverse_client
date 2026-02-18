import { useMemo, useState } from 'react'
import {
  createDashboardMockData,
  formatAth,
  formatFee,
  formatPrice,
  formatSignedPnl,
  formatTradeSize,
} from './data/mockDashboardData'

const CHART_WIDTH = 1000
const CHART_HEIGHT = 180
const EQUITY_TOP = 10
const EQUITY_BOTTOM = 130
const DRAWDOWN_TOP = 120
const DRAWDOWN_BOTTOM = 170

function mapValueToRange(value, min, max, rangeMin, rangeMax) {
  if (max === min) {
    return (rangeMin + rangeMax) / 2
  }

  const ratio = (value - min) / (max - min)
  return rangeMax - ratio * (rangeMax - rangeMin)
}

function buildEquityPath(points) {
  const equities = points.map((point) => point.equity)
  const min = Math.min(...equities)
  const max = Math.max(...equities)

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * CHART_WIDTH
      const y = mapValueToRange(point.equity, min, max, EQUITY_TOP, EQUITY_BOTTOM)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function buildDrawdownAreaPath(points) {
  const drawdowns = points.map((point) => point.drawdown)
  const maxDrawdown = Math.max(...drawdowns, 1)

  const pathParts = [`M0,${DRAWDOWN_BOTTOM.toFixed(2)}`]

  points.forEach((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * CHART_WIDTH
    const y = mapValueToRange(point.drawdown, 0, maxDrawdown, DRAWDOWN_BOTTOM, DRAWDOWN_TOP)
    pathParts.push(`L${x.toFixed(2)},${y.toFixed(2)}`)
  })

  pathParts.push(`L${CHART_WIDTH.toFixed(2)},${DRAWDOWN_BOTTOM.toFixed(2)} Z`)
  return pathParts.join(' ')
}

function getHeatCellOpacity(value, maxValue) {
  if (maxValue <= 0) {
    return 0.08
  }

  return Math.max(0.1, Math.min(0.9, 0.15 + (value / maxValue) * 0.75))
}

function buildPaginationItems(pageCount, currentPage) {
  if (pageCount <= 6) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const pages = new Set([1, 2, pageCount - 1, pageCount, currentPage - 1, currentPage, currentPage + 1])
  const orderedPages = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b)

  const items = []

  for (let index = 0; index < orderedPages.length; index += 1) {
    const page = orderedPages[index]
    const previous = orderedPages[index - 1]

    if (index > 0 && page - previous > 1) {
      items.push(`ellipsis-${previous}-${page}`)
    }

    items.push(page)
  }

  return items
}

function ChevronDownIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

function CalendarIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function FilterIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function DeriverseLogo({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        clipRule="evenodd"
        d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

function App() {
  const dashboard = useMemo(
    () => createDashboardMockData({ year: 2023, monthIndex: 9, totalTrades: 142, seed: 20231114 }),
    [],
  )
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const equityPath = buildEquityPath(dashboard.chart.points)
  const drawdownPath = buildDrawdownAreaPath(dashboard.chart.points)
  const [startLabel, midLabel, endLabel] = dashboard.chart.xLabels

  const statsRows = [
    {
      label: 'Net PnL',
      value: dashboard.stats.netPnl,
      valueClass: dashboard.stats.netPnlValue >= 0 ? 'text-success' : 'text-danger',
    },
    { label: 'Win Rate', value: dashboard.stats.winRate, valueClass: 'text-white' },
    { label: 'Volume', value: dashboard.stats.volume, valueClass: 'text-white' },
    { label: 'Fees', value: dashboard.stats.fees, valueClass: 'text-danger' },
    { label: 'L/S Ratio', value: dashboard.stats.longShortRatio, valueClass: 'text-white' },
    { label: 'Total Trades', value: dashboard.stats.totalTrades, valueClass: 'text-white' },
    { label: 'Avg Duration', value: dashboard.stats.averageDuration, valueClass: 'text-white' },
  ]

  const filteredTrades = useMemo(() => {
    if (statusFilter === 'ALL') {
      return dashboard.table.trades
    }

    return dashboard.table.trades.filter((trade) => trade.status === statusFilter)
  }, [dashboard.table.trades, statusFilter])
  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredTrades.slice(start, end)
  }, [currentPage, filteredTrades, pageSize])
  const paginationItems = buildPaginationItems(pageCount, currentPage)
  const sessionTradeMax = Math.max(...dashboard.analytics.sessions.map((session) => session.trades), 1)
  const visibleStart = filteredTrades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const visibleEnd = filteredTrades.length === 0 ? 0 : visibleStart + paginatedTrades.length - 1

  return (
    <div className="min-h-screen bg-background-dark text-white antialiased">
      <div className="flex min-h-screen w-full flex-col lg:mx-auto lg:max-w-[83.333333%]">
        <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-neutral-dark bg-background-dark px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DeriverseLogo className="size-5 text-primary" />
              <h1 className="text-base font-bold tracking-tight">DERIVERSE</h1>
            </div>
            <button
              className="group flex cursor-default items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 transition-colors hover:bg-primary/20"
              type="button"
            >
              <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-primary">{dashboard.modeLabel}</span>
              <ChevronDownIcon className="size-3 text-primary transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex h-8 cursor-default items-center gap-2 border border-neutral-dark bg-neutral-dark/50 px-3 text-xs font-medium text-white hover:bg-neutral-dark"
              type="button"
            >
              <CalendarIcon className="size-4" />
              <span>{dashboard.periodLabel}</span>
              <ChevronDownIcon className="size-4" />
            </button>

            <button
              className="flex h-8 cursor-default items-center gap-2 border border-neutral-dark bg-neutral-dark/50 px-3 text-xs font-medium text-white hover:bg-neutral-dark"
              type="button"
            >
              <FilterIcon className="size-4" />
              <span>{dashboard.symbolFilterLabel}</span>
              <ChevronDownIcon className="size-4" />
            </button>

            <div className="ml-2 flex size-8 items-center justify-center overflow-hidden rounded-full border border-neutral-dark bg-neutral-dark">
              <img
                alt="User avatar"
                className="size-full object-cover"
                src="https://api.dicebear.com/9.x/thumbs/svg?seed=deriverse"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-px border-b border-neutral-dark bg-neutral-dark">
          <div className="col-span-4 flex flex-col divide-y divide-neutral-dark bg-background-dark">
            {statsRows.map((row) => (
              <div className="flex items-center justify-between px-4 py-2.5" key={row.label}>
                <span className="text-[10px] font-bold uppercase text-secondary-text">{row.label}</span>
                <span className={`mono text-sm font-bold leading-none ${row.valueClass}`}>{row.value}</span>
              </div>
            ))}

            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase text-secondary-text">Max Win/Loss</span>
              <span className="mono text-sm font-bold leading-none text-white">
                <span className="text-success">{dashboard.stats.maxWin}</span>
                <span className="px-1 text-secondary-text">/</span>
                <span className="text-danger">{dashboard.stats.maxLoss}</span>
              </span>
            </div>
          </div>

          <div className="col-span-8 flex flex-col border-l border-neutral-dark bg-background-dark p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">Equity Curve &amp; Drawdown</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 bg-primary" />
                    <span className="text-[10px] text-secondary-text">Cumulative PnL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 border border-danger bg-danger/40" />
                    <span className="text-[10px] text-secondary-text">Drawdown Overlay</span>
                  </div>
                </div>
              </div>
              <p className="mono text-xs font-medium text-success">ATH: {formatAth(dashboard.chart.ath)}</p>
            </div>

            <div className="relative mb-4 h-[180px] w-full">
              <svg className="h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
                <path d={drawdownPath} fill="rgba(255, 59, 48, 0.05)" />
                <path d={equityPath} fill="none" stroke="#0ddbf2" strokeWidth="1.5" />
                <line stroke="#1A1A1A" strokeDasharray="4" strokeWidth="1" x1="0" x2={CHART_WIDTH} y1="40" y2="40" />
                <line stroke="#1A1A1A" strokeDasharray="4" strokeWidth="1" x1="0" x2={CHART_WIDTH} y1="90" y2="90" />
                <line stroke="#1A1A1A" strokeDasharray="4" strokeWidth="1" x1="0" x2={CHART_WIDTH} y1="130" y2="130" />
              </svg>

              <div className="absolute bottom-0 left-0 flex w-full justify-between px-1">
                <span className="mono text-[9px] uppercase text-secondary-text">{startLabel}</span>
                <span className="mono text-[9px] uppercase text-secondary-text">{midLabel}</span>
                <span className="mono text-[9px] uppercase text-secondary-text">{endLabel}</span>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-4 border-t border-neutral-dark pt-3">
              <div className="overflow-hidden border border-neutral-dark bg-neutral-dark">
                <div className="flex gap-px bg-neutral-dark">
                  <button className="h-7 bg-primary px-3 text-[10px] font-bold uppercase text-background-dark" type="button">
                    Daily
                  </button>
                  <button
                    className="h-7 bg-background-dark px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white"
                    type="button"
                  >
                    Session
                  </button>
                  <button
                    className="h-7 bg-background-dark px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white"
                    type="button"
                  >
                    HOD
                  </button>
                </div>
              </div>

              <div className="flex h-7 items-center gap-2 border border-neutral-dark bg-background-dark px-3">
                <span className="text-[9px] font-bold uppercase text-secondary-text">Fees:</span>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-secondary-text">Maker</span>
                    <span className="mono text-[10px] font-medium text-success">{formatFee(dashboard.feeBreakdown.maker)}</span>
                  </div>
                  <div className="h-3 w-px bg-neutral-dark" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-secondary-text">Taker</span>
                    <span className="mono text-[10px] font-medium text-danger">{formatFee(dashboard.feeBreakdown.taker)}</span>
                  </div>
                </div>
              </div>

              <div className="flex h-7 max-w-[220px] flex-1 items-center gap-3 border border-neutral-dark bg-background-dark px-3">
                <span className="whitespace-nowrap text-[9px] font-bold uppercase text-secondary-text">Order Types:</span>
                <div className="flex h-full flex-1 flex-col justify-center">
                  <div className="mb-0.5 flex items-center justify-between text-[8px] leading-tight">
                    <span className="text-secondary-text">Mkt/Lim</span>
                    <span className="mono text-white">
                      {Math.round(dashboard.orderTypeBreakdown.market)}% / {Math.round(dashboard.orderTypeBreakdown.limit)}%
                    </span>
                  </div>
                  <div className="flex h-1 w-full bg-neutral-dark">
                    <div className="h-full bg-primary/70" style={{ width: `${dashboard.orderTypeBreakdown.market.toFixed(2)}%` }} />
                    <div className="h-full bg-secondary-text/30" style={{ width: `${dashboard.orderTypeBreakdown.limit.toFixed(2)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="border-b border-neutral-dark bg-background-dark px-4 py-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4 border border-neutral-dark bg-neutral-dark/20 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Best Day Analysis</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="mono text-lg font-bold text-white">{dashboard.analytics.bestDay.label}</p>
                <p className={`mono text-sm font-bold ${dashboard.analytics.bestDay.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatSignedPnl(dashboard.analytics.bestDay.pnl)}
                </p>
              </div>
              <p className="mt-1 text-[10px] uppercase text-secondary-text">{dashboard.analytics.bestDay.trades} trades in selected range</p>
            </div>

            <div className="col-span-4 border border-neutral-dark bg-neutral-dark/20 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Win/Loss Streak Counters</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] uppercase text-secondary-text">Current</p>
                  <p className="mono text-sm font-bold text-white">
                    W{dashboard.analytics.streaks.currentWin} / L{dashboard.analytics.streaks.currentLoss}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-secondary-text">Max</p>
                  <p className="mono text-sm font-bold text-white">
                    W{dashboard.analytics.streaks.maxWin} / L{dashboard.analytics.streaks.maxLoss}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-4 border border-neutral-dark bg-neutral-dark/20 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Session Analysis</p>
              <div className="mt-2 space-y-2">
                {dashboard.analytics.sessions.map((session) => (
                  <div key={session.name}>
                    <div className="flex items-center justify-between text-[10px] text-secondary-text">
                      <span>{session.name}</span>
                      <span className="mono">{session.trades} trades</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-neutral-dark">
                      <div className="h-full bg-primary/70" style={{ width: `${(session.trades / sessionTradeMax) * 100}%` }} />
                    </div>
                    <p className={`mono mt-1 text-[10px] ${session.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatSignedPnl(session.pnl)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 border border-neutral-dark bg-neutral-dark/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Trade Frequency Heatmap</p>
              <p className="mono text-[10px] text-secondary-text">UTC slots</p>
            </div>

            <div className="grid grid-cols-[48px_repeat(6,minmax(0,1fr))] gap-1 text-[9px]">
              <span className="text-secondary-text" />
              {dashboard.analytics.heatmap.slotLabels.map((slot) => (
                <span className="text-center text-secondary-text" key={slot}>
                  {slot}
                </span>
              ))}

              {dashboard.analytics.heatmap.dayLabels.map((dayLabel, dayIndex) => (
                <div className="contents" key={dayLabel}>
                  <span className="flex items-center text-secondary-text">
                    {dayLabel}
                  </span>
                  {dashboard.analytics.heatmap.values[dayIndex].map((value, slotIndex) => (
                    <span
                      className="h-5 border border-neutral-dark"
                      key={`${dayLabel}-${slotIndex}`}
                      style={{ backgroundColor: `rgba(13, 219, 242, ${getHeatCellOpacity(value, dashboard.analytics.heatmap.maxValue)})` }}
                      title={`${dayLabel} ${dashboard.analytics.heatmap.slotLabels[slotIndex]}: ${value} trades`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex-1 overflow-hidden p-0">
          <div className="flex h-full flex-col bg-background-dark">
            <div className="flex items-center justify-between border-b border-neutral-dark px-4 py-2">
              <div className="flex items-center gap-2">
                <button
                  className="h-7 border border-neutral-dark px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white"
                  type="button"
                >
                  Position Sizing Calculator
                </button>
                <button
                  className="h-7 border border-neutral-dark px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white"
                  type="button"
                >
                  Export CSV
                </button>
                <button
                  className="h-7 border border-neutral-dark px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white"
                  type="button"
                >
                  Export PDF
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-secondary-text" htmlFor="status-filter">
                  Status
                  <select
                    className="h-7 border border-neutral-dark bg-background-dark px-2 text-[10px] font-bold uppercase text-white outline-none"
                    id="status-filter"
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      setPage(1)
                    }}
                    value={statusFilter}
                  >
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ALL">All</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-secondary-text" htmlFor="rows-per-page">
                  Rows
                  <select
                    className="h-7 border border-neutral-dark bg-background-dark px-2 text-[10px] font-bold uppercase text-white outline-none"
                    id="rows-per-page"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value))
                      setPage(1)
                    }}
                    value={pageSize}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>

                <span className="text-[10px] font-bold uppercase text-secondary-text">Ask AI</span>
                <a
                  className="h-7 border border-neutral-dark px-3 text-[10px] font-bold uppercase leading-7 text-secondary-text transition-colors hover:text-white"
                  href={dashboard.tools.chatgptUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  ChatGPT
                </a>
                <a
                  className="h-7 border border-neutral-dark px-3 text-[10px] font-bold uppercase leading-7 text-secondary-text transition-colors hover:text-white"
                  href={dashboard.tools.claudeUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Claude
                </a>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-xs">
                <thead>
                  <tr className="bg-neutral-dark/30 text-[10px] font-semibold uppercase text-secondary-text">
                    <th className="border-b border-r border-neutral-dark px-4 py-2">Date / Time</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2">Symbol</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2">Status</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2">Side</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2">Type</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2 text-right">Size</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2 text-right">Entry</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2 text-right">Exit</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2 text-right">PnL</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2 text-right">Fee</th>
                    <th className="border-b border-r border-neutral-dark px-4 py-2 text-center">Notes</th>
                    <th className="border-b border-neutral-dark px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-dark">
                  {paginatedTrades.map((trade) => (
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
                      <td className="mono px-4 py-2 text-right text-white">
                        {formatTradeSize(trade.size, trade.baseAsset, trade.sizeDigits)}
                      </td>
                      <td className="mono px-4 py-2 text-right text-white">{formatPrice(trade.entry)}</td>
                      <td className="mono px-4 py-2 text-right text-white">{formatPrice(trade.exit)}</td>
                      <td
                        className={`mono px-4 py-2 text-right font-bold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatSignedPnl(trade.pnl)}
                      </td>
                      <td className="mono px-4 py-2 text-right text-secondary-text">{formatFee(trade.fee)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className={`h-6 border px-3 text-[10px] font-bold uppercase transition-colors ${
                            trade.status === 'OPEN'
                              ? 'border-primary/40 text-primary hover:border-primary'
                              : 'border-neutral-dark text-secondary-text hover:border-secondary-text/50 hover:text-white'
                          }`}
                          type="button"
                        >
                          {trade.status === 'OPEN' ? 'Open Note' : trade.annotation ? 'View Note' : 'Add Note'}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className="h-6 border border-neutral-dark px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:border-secondary-text/50 hover:text-white"
                          type="button"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-neutral-dark bg-neutral-dark/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-secondary-text">
              <div className="flex items-center gap-4">
                <span>
                  Showing {visibleStart}-{visibleEnd} of {filteredTrades.length} Trades
                </span>
                {statusFilter !== 'ALL' && (
                  <span className="text-[9px] text-secondary-text/80">
                    ({statusFilter.toLowerCase()} from {dashboard.table.totalTrades} total)
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-success" />
                  <span className="text-[9px]">Live Synced</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === 1}
                  onClick={() => setPage(1)}
                  type="button"
                >
                  Start
                </button>
                <button
                  className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                        onClick={() => setPage(item)}
                        type="button"
                      >
                        {String(item).padStart(2, '0')}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  type="button"
                >
                  Next
                </button>
                <button
                  className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(pageCount)}
                  type="button"
                >
                  End
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
