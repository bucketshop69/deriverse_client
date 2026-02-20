import { useEffect, useMemo, useState } from 'react'
import {
  createDashboardMockData,
  createDashboardSnapshot,
  filterTradesByScope,
  formatCompactValue,
  formatFee,
  formatPrice,
  formatSignedPnl,
  formatTradeSize,
} from './data/mockDashboardData'

const CHART_WIDTH = 1000
const CHART_HEIGHT = 220
const LINE_TOP = 10
const LINE_BOTTOM = 160
const AREA_TOP = 150
const AREA_BOTTOM = 210
const NOTES_STORAGE_KEY = 'deriverse.notes.v1'

function mapValueToRange(value, min, max, rangeMin, rangeMax) {
  if (max === min) {
    return (rangeMin + rangeMax) / 2
  }

  const ratio = (value - min) / (max - min)
  return rangeMax - ratio * (rangeMax - rangeMin)
}

function buildLinePath(points) {
  if (points.length === 0) {
    return ''
  }

  const values = points.map((point) => point.lineValue)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * CHART_WIDTH
      const y = mapValueToRange(point.lineValue, min, max, LINE_TOP, LINE_BOTTOM)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function buildAreaPath(points) {
  if (points.length === 0) {
    return ''
  }

  const values = points.map((point) => point.areaValue)
  const max = Math.max(...values, 0)

  if (max <= 0) {
    return `M0,${AREA_BOTTOM.toFixed(2)} L${CHART_WIDTH.toFixed(2)},${AREA_BOTTOM.toFixed(2)}`
  }

  const pathParts = [`M0,${AREA_BOTTOM.toFixed(2)}`]

  points.forEach((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * CHART_WIDTH
    const y = mapValueToRange(point.areaValue, 0, max, AREA_BOTTOM, AREA_TOP)
    pathParts.push(`L${x.toFixed(2)},${y.toFixed(2)}`)
  })

  pathParts.push(`L${CHART_WIDTH.toFixed(2)},${AREA_BOTTOM.toFixed(2)} Z`)
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

function formatDateInputValue(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function getRangeDays(rangePreset) {
  if (rangePreset === '1D') {
    return 1
  }

  if (rangePreset === '7D') {
    return 7
  }

  if (rangePreset === '30D') {
    return 30
  }

  return null
}

function escapeCsv(value) {
  const asString = String(value ?? '')
  if (!/[",\n]/.test(asString)) {
    return asString
  }

  return `"${asString.replace(/"/g, '""')}"`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ChevronDownIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
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
  const baseDashboard = useMemo(
    () => createDashboardMockData({ year: 2023, monthIndex: 9, totalTrades: 142, seed: 20231114 }),
    [],
  )

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [rangePreset, setRangePreset] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [chartView, setChartView] = useState('PERFORMANCE')
  const [chartHoverIndex, setChartHoverIndex] = useState(null)
  const [heatmapHover, setHeatmapHover] = useState(null)
  const [impactHover, setImpactHover] = useState(null)
  const [impactActiveOnly, setImpactActiveOnly] = useState(false)
  const [isSizerOpen, setIsSizerOpen] = useState(false)
  const [positionSizing, setPositionSizing] = useState({
    accountBalance: '35000',
    riskPercent: '1',
    entryPrice: '29800',
    stopPrice: '29100',
    leverage: '5',
  })
  const [annotationMap, setAnnotationMap] = useState(() => {
    if (typeof window === 'undefined') {
      return {}
    }

    try {
      const value = window.localStorage.getItem(NOTES_STORAGE_KEY)
      return value ? JSON.parse(value) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(annotationMap))
  }, [annotationMap])

  const rangeWindow = useMemo(() => {
    const days = getRangeDays(rangePreset)
    if (!days) {
      return {
        startDate: null,
        endDate: null,
        startInput: null,
        endInput: null,
      }
    }

    const latestMs = baseDashboard.table.trades.reduce(
      (latest, trade) => Math.max(latest, trade.exitAt.getTime()),
      0,
    )
    const endDate = new Date(latestMs)
    const startDate = new Date(endDate)
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1))

    return {
      startDate,
      endDate,
      startInput: formatDateInputValue(startDate),
      endInput: formatDateInputValue(endDate),
    }
  }, [baseDashboard.table.trades, rangePreset])

  const scopedTrades = useMemo(
    () =>
      filterTradesByScope({
        trades: baseDashboard.table.trades,
        startDate: rangeWindow.startDate,
        endDate: rangeWindow.endDate,
      }),
    [baseDashboard.table.trades, rangeWindow.endDate, rangeWindow.startDate],
  )

  const dashboard = useMemo(
    () =>
      createDashboardSnapshot({
        trades: scopedTrades,
        startingEquity: baseDashboard.startingEquity,
        startDateInput: rangeWindow.startInput,
        endDateInput: rangeWindow.endInput,
        chartView,
      }),
    [baseDashboard.startingEquity, chartView, rangeWindow.endInput, rangeWindow.startInput, scopedTrades],
  )

  const filteredTrades = useMemo(() => {
    if (statusFilter === 'ALL') {
      return scopedTrades
    }

    return scopedTrades.filter((trade) => trade.status === statusFilter)
  }, [scopedTrades, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredTrades.slice(start, end)
  }, [currentPage, filteredTrades, pageSize])
  const paginationItems = buildPaginationItems(pageCount, currentPage)
  const chartLinePath = buildLinePath(dashboard.chart.points)
  const chartAreaPath = buildAreaPath(dashboard.chart.points)
  const isHeatmapView = chartView === 'HEATMAP'
  const isImpactView = chartView === 'IMPACT'
  const lineValues = dashboard.chart.points.map((point) => point.lineValue)
  const lineMin = lineValues.length > 0 ? Math.min(...lineValues) : 0
  const lineMax = lineValues.length > 0 ? Math.max(...lineValues) : 0
  const hoveredChartPoint = !isHeatmapView && !isImpactView && chartHoverIndex !== null ? dashboard.chart.points[chartHoverIndex] : null
  const hoverXPercent = hoveredChartPoint
    ? (chartHoverIndex / Math.max(dashboard.chart.points.length - 1, 1)) * 100
    : 0
  const hoverYPercent = hoveredChartPoint
    ? (mapValueToRange(hoveredChartPoint.lineValue, lineMin, lineMax, LINE_TOP, LINE_BOTTOM) / CHART_HEIGHT) * 100
    : 0
  const [startLabel, midLabel, endLabel] = dashboard.chart.xLabels
  const visibleStart = filteredTrades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const visibleEnd = filteredTrades.length === 0 ? 0 : visibleStart + paginatedTrades.length - 1

  const sizingResult = useMemo(() => {
    const accountBalance = Number(positionSizing.accountBalance) || 0
    const riskPercent = Number(positionSizing.riskPercent) || 0
    const entryPrice = Number(positionSizing.entryPrice) || 0
    const stopPrice = Number(positionSizing.stopPrice) || 0
    const leverage = Number(positionSizing.leverage) || 0
    const stopDistance = Math.abs(entryPrice - stopPrice)
    const riskAmount = accountBalance * (riskPercent / 100)
    const units = stopDistance > 0 ? riskAmount / stopDistance : 0
    const notional = units * entryPrice
    const marginRequired = leverage > 0 ? notional / leverage : 0

    return {
      stopDistance,
      riskAmount,
      units,
      notional,
      marginRequired,
    }
  }, [positionSizing])

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

  const impactSourceTrades = useMemo(
    () => (impactActiveOnly ? scopedTrades.filter((trade) => trade.status === 'OPEN') : scopedTrades),
    [impactActiveOnly, scopedTrades],
  )

  const impactTiles = useMemo(() => {
    const rankedTrades = impactSourceTrades
      .slice()
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 24)
    const maxMagnitude = Math.max(...rankedTrades.map((trade) => Math.abs(trade.pnl)), 1)

    return rankedTrades.map((trade, index) => {
      const magnitude = Math.abs(trade.pnl)
      const ratio = magnitude / maxMagnitude
      let colSpan = 2
      let rowSpan = 2

      if (index < 2) {
        colSpan = 6
        rowSpan = 5
      } else if (ratio > 0.7) {
        colSpan = 4
        rowSpan = 4
      } else if (ratio > 0.45) {
        colSpan = 3
        rowSpan = 3
      } else if (ratio > 0.25) {
        colSpan = 2
        rowSpan = 3
      }

      const label = trade.symbol.split('/')[0].trim()
      const intensity = 0.22 + ratio * 0.58
      const backgroundColor = trade.pnl >= 0
        ? `rgba(0, 192, 135, ${Math.min(0.92, intensity)})`
        : `rgba(255, 59, 48, ${Math.min(0.9, intensity)})`

      return {
        id: trade.id,
        label,
        symbol: trade.symbol,
        side: trade.side,
        status: trade.status,
        pnl: trade.pnl,
        fee: trade.fee,
        sizeLabel: formatTradeSize(trade.size, trade.baseAsset, trade.sizeDigits),
        dateTimeLabel: trade.dateTimeLabel,
        colSpan,
        rowSpan,
        backgroundColor,
        ratio,
      }
    })
  }, [impactSourceTrades])

  function handleEditNote(trade) {
    const existing = annotationMap[trade.id] ?? trade.annotation ?? ''
    const nextValue = window.prompt(`Edit note for ${trade.symbol}`, existing)
    if (nextValue === null) {
      return
    }

    const trimmed = nextValue.trim()
    setAnnotationMap((current) => {
      const next = { ...current }

      if (trimmed.length === 0) {
        delete next[trade.id]
      } else {
        next[trade.id] = trimmed
      }

      return next
    })
  }

  function handleChartMouseMove(event) {
    if (isHeatmapView || isImpactView || dashboard.chart.points.length === 0) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0) {
      return
    }

    const ratio = (event.clientX - bounds.left) / bounds.width
    const clampedRatio = Math.min(1, Math.max(0, ratio))
    const index = Math.round(clampedRatio * Math.max(dashboard.chart.points.length - 1, 1))
    setChartHoverIndex(index)
  }

  function handleExportCsv() {
    const header = ['Date Time', 'Symbol', 'Status', 'Side', 'Type', 'Size', 'Entry', 'Exit', 'PnL', 'Fee', 'Annotation']
    const rows = filteredTrades.map((trade) => [
      trade.dateTimeLabel,
      trade.symbol,
      trade.status,
      trade.side,
      trade.type,
      `${trade.size} ${trade.baseAsset}`,
      trade.entry,
      trade.exit,
      trade.pnl,
      trade.fee,
      annotationMap[trade.id] ?? trade.annotation ?? '',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(','))
      .join('\n')

    const now = new Date()
    const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `deriverse-trades-${stamp}.csv`)
  }

  function handleExportPdf() {
    const reportWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!reportWindow) {
      return
    }

    const rows = filteredTrades
      .map((trade) => {
        const note = annotationMap[trade.id] ?? trade.annotation ?? '-'
        return `
          <tr>
            <td>${escapeHtml(trade.dateTimeLabel)}</td>
            <td>${escapeHtml(trade.symbol)}</td>
            <td>${escapeHtml(trade.status)}</td>
            <td>${escapeHtml(trade.side)}</td>
            <td>${escapeHtml(trade.type)}</td>
            <td>${escapeHtml(formatTradeSize(trade.size, trade.baseAsset, trade.sizeDigits))}</td>
            <td>${escapeHtml(formatPrice(trade.entry))}</td>
            <td>${escapeHtml(formatPrice(trade.exit))}</td>
            <td>${escapeHtml(formatSignedPnl(trade.pnl))}</td>
            <td>${escapeHtml(formatFee(trade.fee))}</td>
            <td>${escapeHtml(note)}</td>
          </tr>
        `
      })
      .join('')

    const documentHtml = `
      <html>
        <head>
          <title>Deriverse Trade Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px; }
            p { margin: 0 0 8px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Deriverse Analytics Export</h1>
          <p>Period: ${escapeHtml(dashboard.periodLabel)}</p>
          <p>Filters: ${escapeHtml(rangePreset)} | ${escapeHtml(statusFilter)} | ${escapeHtml(filteredTrades.length)} trades</p>
          <table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Symbol</th>
                <th>Status</th>
                <th>Side</th>
                <th>Type</th>
                <th>Size</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>PnL</th>
                <th>Fee</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `

    reportWindow.document.open()
    reportWindow.document.write(documentHtml)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
  }

  return (
    <div className="min-h-screen bg-background-dark text-white antialiased">
      <div className="flex min-h-screen w-full flex-col lg:mx-auto lg:max-w-[83.333333%]">
        <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-panel-border bg-background-dark px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DeriverseLogo className="size-5 text-primary" />
              <h1 className="text-base font-bold tracking-tight">DERIVERSE</h1>
            </div>
            <button
              className="group flex cursor-default items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 transition-colors hover:bg-primary/20"
              type="button"
            >
              <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-primary">{baseDashboard.modeLabel}</span>
              <ChevronDownIcon className="size-3 text-primary transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>

          <div className="flex items-center">
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-panel-border bg-neutral-dark">
              <img
                alt="User avatar"
                className="size-full object-cover"
                src="https://api.dicebear.com/9.x/thumbs/svg?seed=deriverse"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-px border-b border-panel-border bg-neutral-dark">
          <div className="col-span-4 flex flex-col divide-y divide-neutral-dark bg-background-dark">
            {statsRows.map((row) => (
              <div className="flex items-center justify-between px-4 py-2.5" key={row.label}>
                <span className="text-[10px] font-bold uppercase text-secondary-text">{row.label}</span>
                <span className={`mono text-sm font-bold leading-none ${row.valueClass}`}>{row.value}</span>
              </div>
            ))}

            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase text-secondary-text">Avg Win/Loss</span>
              <span className="mono text-sm font-bold leading-none text-white">
                <span className="text-success">{dashboard.stats.averageWin}</span>
                <span className="px-1 text-secondary-text">/</span>
                <span className="text-danger">-{dashboard.stats.averageLoss}</span>
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase text-secondary-text">Max Win/Loss</span>
              <span className="mono text-sm font-bold leading-none text-white">
                <span className="text-success">{dashboard.stats.maxWin}</span>
                <span className="px-1 text-secondary-text">/</span>
                <span className="text-danger">{dashboard.stats.maxLoss}</span>
              </span>
            </div>
          </div>

          <div className="col-span-8 flex flex-col border-l border-panel-border bg-background-dark p-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <p className={`mono text-xs font-medium ${dashboard.chart.headlineClass}`}>
                  {dashboard.chart.headlineLabel}: {dashboard.chart.headlineValue}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 bg-primary" />
                    <span className="text-[10px] text-secondary-text">{dashboard.chart.lineLegend}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 border border-danger bg-danger/40" />
                    <span className="text-[10px] text-secondary-text">{dashboard.chart.areaLegend}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="overflow-hidden border border-panel-border bg-neutral-dark">
                  <div className="flex gap-px bg-neutral-dark">
                    <button
                      className={`h-8 px-3 text-[10px] font-bold uppercase ${chartView === 'PERFORMANCE' ? 'bg-primary text-background-dark' : 'bg-background-dark text-secondary-text hover:text-white'
                        }`}
                      onClick={() => setChartView('PERFORMANCE')}
                      type="button"
                    >
                      PnL & Drawdown
                    </button>
                    <button
                      className={`h-8 px-3 text-[10px] font-bold uppercase ${chartView === 'HEATMAP' ? 'bg-primary text-background-dark' : 'bg-background-dark text-secondary-text hover:text-white'
                        }`}
                      onClick={() => setChartView('HEATMAP')}
                      type="button"
                    >
                      Heatmap
                    </button>
                    <button
                      className={`h-8 px-3 text-[10px] font-bold uppercase ${chartView === 'IMPACT' ? 'bg-primary text-background-dark' : 'bg-background-dark text-secondary-text hover:text-white'
                        }`}
                      onClick={() => setChartView('IMPACT')}
                      type="button"
                    >
                      Impact
                    </button>
                  </div>
                </div>

                <div className="flex h-8 items-center gap-2 border border-panel-border bg-neutral-dark/50 px-2 text-xs font-medium text-white">
                  <span className="text-[10px] font-bold uppercase text-secondary-text">Range</span>
                  <select
                    className="h-6 w-[72px] bg-transparent text-xs font-bold text-white outline-none"
                    onChange={(event) => {
                      setRangePreset(event.target.value)
                      setPage(1)
                    }}
                    value={rangePreset}
                  >
                    <option className="bg-background-dark" value="1D">1D</option>
                    <option className="bg-background-dark" value="7D">7D</option>
                    <option className="bg-background-dark" value="30D">30D</option>
                    <option className="bg-background-dark" value="ALL">ALL</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="relative mb-4 h-[280px] w-full">
              {isHeatmapView ? (
                <div className="flex h-full flex-col overflow-hidden border border-panel-border bg-background-dark/40">
                  <div className="flex items-center justify-between border-b border-panel-border px-2 py-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Trade Frequency Heatmap</p>
                    <p className="mono text-[10px] text-secondary-text">
                      {heatmapHover
                        ? `${heatmapHover.day} ${heatmapHover.slot}: ${heatmapHover.value} trades (${heatmapHover.intensity}%)`
                        : 'Hover a cell for details'}
                    </p>
                  </div>

                  <div className="flex-1 p-2">
                    <div className="grid grid-cols-[44px_repeat(6,minmax(0,1fr))] gap-px bg-panel-border p-px text-[9px]">
                      <span className="bg-background-dark" />
                      {dashboard.analytics.heatmap.slotLabels.map((slot) => (
                        <span className="bg-background-dark py-1 text-center text-secondary-text" key={slot}>
                          {slot}
                        </span>
                      ))}

                      {dashboard.analytics.heatmap.dayLabels.map((dayLabel, dayIndex) => (
                        <div className="contents" key={dayLabel}>
                          <span className="flex items-center bg-background-dark px-1 text-secondary-text">{dayLabel}</span>
                          {dashboard.analytics.heatmap.values[dayIndex].map((value, slotIndex) => (
                            <span
                              className="h-4 bg-background-dark"
                              key={`${dayLabel}-${slotIndex}`}
                              onMouseEnter={() =>
                                setHeatmapHover({
                                  day: dayLabel,
                                  slot: dashboard.analytics.heatmap.slotLabels[slotIndex],
                                  value,
                                  intensity: Math.round((value / Math.max(dashboard.analytics.heatmap.maxValue, 1)) * 100),
                                })
                              }
                              onMouseLeave={() => setHeatmapHover(null)}
                              style={{ backgroundColor: `rgba(156, 163, 175, ${getHeatCellOpacity(value, dashboard.analytics.heatmap.maxValue)})` }}
                              title={`${dayLabel} ${dashboard.analytics.heatmap.slotLabels[slotIndex]}: ${value} trades`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isImpactView ? (
                <div className="flex h-full flex-col overflow-hidden border border-panel-border bg-background-dark/40">
                  <div className="flex items-center justify-between border-b border-panel-border px-2 py-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Trade Impact Map</p>
                      <button
                        className={`h-5 border px-2 text-[9px] font-bold uppercase ${
                          impactActiveOnly
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'border-panel-border text-secondary-text hover:text-white'
                        }`}
                        onClick={() => setImpactActiveOnly((current) => !current)}
                        type="button"
                      >
                        {impactActiveOnly ? 'Active' : 'All'}
                      </button>
                    </div>
                    <p className="mono text-[10px] text-secondary-text">
                      {impactHover
                        ? `${impactHover.symbol} ${impactHover.side} ${impactHover.status}: ${formatSignedPnl(impactHover.pnl)}`
                        : impactActiveOnly
                          ? 'Showing active positions only'
                          : 'Showing all trades (active marked ●)'}
                    </p>
                  </div>

                  <div className="thin-scrollbar flex-1 overflow-y-auto p-2">
                    {impactTiles.length > 0 ? (
                      <div className="grid min-h-full auto-rows-[16px] grid-cols-12 gap-px bg-panel-border p-px">
                        {impactTiles.map((tile) => (
                          <button
                            className="flex min-h-0 flex-col justify-between overflow-hidden border-0 bg-background-dark px-1.5 py-1 text-left"
                            key={tile.id}
                            onMouseEnter={() => setImpactHover(tile)}
                            onMouseLeave={() => setImpactHover(null)}
                            style={{
                              backgroundColor: tile.backgroundColor,
                              gridColumn: `span ${tile.colSpan}`,
                              gridRow: `span ${tile.rowSpan}`,
                            }}
                            type="button"
                          >
                            <span className="truncate text-[11px] font-bold text-white">
                              {tile.status === 'OPEN' ? '● ' : ''}
                              {tile.label}
                            </span>
                            <span className="mono text-[10px] text-white/90">{formatSignedPnl(tile.pnl)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center border border-panel-border text-xs text-secondary-text">
                        No trades in current scope
                      </div>
                    )}
                  </div>
                </div>
              ) : dashboard.chart.points.length > 0 ? (
                <div className="h-full w-full" onMouseLeave={() => setChartHoverIndex(null)}>
                  <svg
                    className="h-full w-full"
                    onMouseMove={handleChartMouseMove}
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  >
                    <path d={chartAreaPath} fill="rgba(255, 59, 48, 0.07)" />
                    <path d={chartLinePath} fill="none" stroke="#9CA3AF" strokeWidth="1.5" />
                    <line stroke="#2A2A2A" strokeDasharray="4" strokeWidth="1.5" x1="0" x2={CHART_WIDTH} y1="55" y2="55" />
                    <line stroke="#2A2A2A" strokeDasharray="4" strokeWidth="1.5" x1="0" x2={CHART_WIDTH} y1="110" y2="110" />
                    <line stroke="#2A2A2A" strokeDasharray="4" strokeWidth="1.5" x1="0" x2={CHART_WIDTH} y1="160" y2="160" />
                  </svg>

                  {hoveredChartPoint && (
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute bottom-0 top-0 w-px bg-primary/40" style={{ left: `${hoverXPercent}%` }} />
                      <div
                        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background-dark"
                        style={{ left: `${hoverXPercent}%`, top: `${hoverYPercent}%` }}
                      />
                      <div
                        className="absolute min-w-[170px] border border-panel-border bg-background-dark/95 px-2 py-1 text-[10px]"
                        style={{ left: `min(${hoverXPercent + 2}%, 78%)`, top: '8px' }}
                      >
                        <p className="mono text-secondary-text">{hoveredChartPoint.label}</p>
                        <p className="mono text-primary">
                          {dashboard.chart.lineLegend}: {formatCompactValue(hoveredChartPoint.lineValue)}
                        </p>
                        <p className="mono text-danger">
                          {dashboard.chart.areaLegend}: {formatCompactValue(hoveredChartPoint.areaValue)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center border border-panel-border text-xs text-secondary-text">
                  No data for current filters
                </div>
              )}

              {!isHeatmapView && !isImpactView && (
                <div className="absolute bottom-0 left-0 flex w-full justify-between px-1">
                  <span className="mono text-[9px] uppercase text-secondary-text">{startLabel}</span>
                  <span className="mono text-[9px] uppercase text-secondary-text">{midLabel}</span>
                  <span className="mono text-[9px] uppercase text-secondary-text">{endLabel}</span>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-panel-border pt-3" />
          </div>
        </div>

        <section className="border-b border-panel-border bg-background-dark px-4 py-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4 border border-panel-border bg-neutral-dark/20 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Best Day Analysis</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="mono text-lg font-bold text-white">{dashboard.analytics.bestDay.label}</p>
                <p className={`mono text-sm font-bold ${dashboard.analytics.bestDay.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatSignedPnl(dashboard.analytics.bestDay.pnl)}
                </p>
              </div>
              <p className="mt-1 text-[10px] uppercase text-secondary-text">{dashboard.analytics.bestDay.trades} trades in selected range</p>
            </div>

            <div className="col-span-4 border border-panel-border bg-neutral-dark/20 px-3 py-2">
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

            <div className="col-span-4 border border-panel-border bg-neutral-dark/20 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Risk Snapshot</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <p className="text-[9px] uppercase text-secondary-text">Profit Factor</p>
                  <p className="mono text-sm font-bold text-white">{dashboard.risk.profitFactor.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-secondary-text">Expectancy</p>
                  <p className={`mono text-sm font-bold ${dashboard.risk.expectancy >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatSignedPnl(dashboard.risk.expectancy)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-secondary-text">Max Drawdown</p>
                  <p className="mono text-sm font-bold text-danger">
                    {dashboard.risk.maxDrawdownPercent.toFixed(2)}% ({formatCompactValue(dashboard.risk.maxDrawdownAmount)})
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-secondary-text">Recovery</p>
                  <p className="mono text-sm font-bold text-white">{dashboard.risk.recoveryDays} days</p>
                </div>
              </div>
            </div>
          </div>

        </section>

        <div className="flex-1 overflow-hidden p-0">
          <div className="flex h-full flex-col bg-background-dark">
            <div className="flex items-center justify-between border-b border-panel-border px-4 py-2">
              <div className="flex items-center gap-2">
                <button
                  className={`h-7 border px-3 text-[10px] font-bold uppercase transition-colors ${isSizerOpen
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-panel-border text-secondary-text hover:text-white'
                    }`}
                  onClick={() => setIsSizerOpen((value) => !value)}
                  type="button"
                >
                  Position Sizing Calculator
                </button>
                <button
                  className="h-7 border border-panel-border px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={filteredTrades.length === 0}
                  onClick={handleExportCsv}
                  type="button"
                >
                  Export CSV
                </button>
                <button
                  className="h-7 border border-panel-border px-3 text-[10px] font-bold uppercase text-secondary-text transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={filteredTrades.length === 0}
                  onClick={handleExportPdf}
                  type="button"
                >
                  Export PDF
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-secondary-text" htmlFor="status-filter">
                  Status
                  <select
                    className="h-7 border border-panel-border bg-background-dark px-2 text-[10px] font-bold uppercase text-white outline-none"
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
                    className="h-7 border border-panel-border bg-background-dark px-2 text-[10px] font-bold uppercase text-white outline-none"
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
                  className="h-7 border border-panel-border px-3 text-[10px] font-bold uppercase leading-7 text-secondary-text transition-colors hover:text-white"
                  href={baseDashboard.tools.chatgptUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  ChatGPT
                </a>
                <a
                  className="h-7 border border-panel-border px-3 text-[10px] font-bold uppercase leading-7 text-secondary-text transition-colors hover:text-white"
                  href={baseDashboard.tools.claudeUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Claude
                </a>
              </div>
            </div>

            {isSizerOpen && (
              <div className="grid grid-cols-12 gap-3 border-b border-panel-border bg-neutral-dark/10 px-4 py-3">
                <div className="col-span-7 grid grid-cols-5 gap-2">
                  <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                    Account
                    <input
                      className="mt-1 h-8 border border-panel-border bg-background-dark px-2 text-xs text-white outline-none"
                      min="0"
                      onChange={(event) => setPositionSizing((prev) => ({ ...prev, accountBalance: event.target.value }))}
                      step="100"
                      type="number"
                      value={positionSizing.accountBalance}
                    />
                  </label>
                  <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                    Risk %
                    <input
                      className="mt-1 h-8 border border-panel-border bg-background-dark px-2 text-xs text-white outline-none"
                      min="0"
                      onChange={(event) => setPositionSizing((prev) => ({ ...prev, riskPercent: event.target.value }))}
                      step="0.1"
                      type="number"
                      value={positionSizing.riskPercent}
                    />
                  </label>
                  <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                    Entry
                    <input
                      className="mt-1 h-8 border border-panel-border bg-background-dark px-2 text-xs text-white outline-none"
                      min="0"
                      onChange={(event) => setPositionSizing((prev) => ({ ...prev, entryPrice: event.target.value }))}
                      step="0.01"
                      type="number"
                      value={positionSizing.entryPrice}
                    />
                  </label>
                  <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                    Stop
                    <input
                      className="mt-1 h-8 border border-panel-border bg-background-dark px-2 text-xs text-white outline-none"
                      min="0"
                      onChange={(event) => setPositionSizing((prev) => ({ ...prev, stopPrice: event.target.value }))}
                      step="0.01"
                      type="number"
                      value={positionSizing.stopPrice}
                    />
                  </label>
                  <label className="flex flex-col text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                    Leverage
                    <input
                      className="mt-1 h-8 border border-panel-border bg-background-dark px-2 text-xs text-white outline-none"
                      min="1"
                      onChange={(event) => setPositionSizing((prev) => ({ ...prev, leverage: event.target.value }))}
                      step="1"
                      type="number"
                      value={positionSizing.leverage}
                    />
                  </label>
                </div>

                <div className="col-span-5 grid grid-cols-2 gap-2 border border-panel-border bg-background-dark/60 p-2">
                  <div>
                    <p className="text-[9px] uppercase text-secondary-text">Risk Amount</p>
                    <p className="mono text-sm font-bold text-danger">{formatFee(sizingResult.riskAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-secondary-text">Stop Distance</p>
                    <p className="mono text-sm font-bold text-white">{formatFee(sizingResult.stopDistance)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-secondary-text">Position Units</p>
                    <p className="mono text-sm font-bold text-primary">{sizingResult.units.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-secondary-text">Notional</p>
                    <p className="mono text-sm font-bold text-white">{formatFee(sizingResult.notional)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-secondary-text">Margin Required</p>
                    <p className="mono text-sm font-bold text-success">{formatFee(sizingResult.marginRequired)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-secondary-text">Rule</p>
                    <p className="mono text-sm font-bold text-secondary-text">Risk / |Entry - Stop|</p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-xs">
                <thead>
                  <tr className="bg-neutral-dark/30 text-[10px] font-semibold uppercase text-secondary-text">
                    <th className="border-b border-r border-panel-border px-4 py-2">Date / Time</th>
                    <th className="border-b border-r border-panel-border px-4 py-2">Symbol</th>
                    <th className="border-b border-r border-panel-border px-4 py-2">Status</th>
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
                  {paginatedTrades.map((trade) => {
                    const noteText = annotationMap[trade.id] ?? trade.annotation ?? ''
                    return (
                      <tr className="group transition-colors hover:bg-neutral-dark/10" key={trade.id}>
                        <td className="mono px-4 py-2 text-secondary-text">{trade.dateTimeLabel}</td>
                        <td className="px-4 py-2 font-bold uppercase tracking-tight text-white">{trade.symbol}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold ${trade.status === 'OPEN'
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
                            className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold ${trade.side === 'LONG'
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
                            className={`h-6 border px-3 text-[10px] font-bold uppercase transition-colors ${trade.status === 'OPEN'
                              ? 'border-primary/40 text-primary hover:border-primary'
                              : 'border-panel-border text-secondary-text hover:border-secondary-text/50 hover:text-white'
                              }`}
                            onClick={() => handleEditNote(trade)}
                            title={noteText || 'No note yet'}
                            type="button"
                          >
                            {trade.status === 'OPEN' ? 'Edit Open Note' : noteText ? 'Edit Note' : 'Add Note'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-panel-border bg-neutral-dark/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-secondary-text">
              <div className="flex items-center gap-4">
                <span>
                  Showing {visibleStart}-{visibleEnd} of {filteredTrades.length} Trades
                </span>
                {statusFilter !== 'ALL' && (
                  <span className="text-[9px] text-secondary-text/80">
                    ({statusFilter.toLowerCase()} from {scopedTrades.length} scoped)
                  </span>
                )}
                <span className="text-[9px] text-secondary-text/80">Range: {dashboard.periodLabel}</span>
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
