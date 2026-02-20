import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import DepositModal from './components/DepositModal'
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
const FEE_BAR_TOP = 176
const FEE_BAR_BOTTOM = 210
const NOTES_STORAGE_KEY = 'deriverse.notes.v1'
const DAY_IN_MS = 24 * 60 * 60 * 1000
const PERPS_BASE_ASSETS = new Set(['BTC', 'ETH', 'SOL'])
const WEEKDAY_SHORT_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function mapValueToRange(value, min, max, rangeMin, rangeMax) {
  if (max === min) {
    return (rangeMin + rangeMax) / 2
  }

  const ratio = (value - min) / (max - min)
  return rangeMax - ratio * (rangeMax - rangeMin)
}

function buildLinePath(points, valueKey = 'lineValue') {
  if (points.length === 0) {
    return ''
  }

  const values = points
    .map((point) => point[valueKey])
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) {
    return ''
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * CHART_WIDTH
      const pointValue = Number.isFinite(point[valueKey]) ? point[valueKey] : 0
      const y = mapValueToRange(pointValue, min, max, LINE_TOP, LINE_BOTTOM)
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

function filterRecordsByDateRange(records, dateKey, startDate, endDate) {
  return records.filter((record) => {
    const dateValue = record[dateKey]
    if (!(dateValue instanceof Date)) {
      return false
    }

    const ms = dateValue.getTime()
    if (startDate && ms < startDate.getTime()) {
      return false
    }

    if (endDate && ms > endDate.getTime() + (DAY_IN_MS - 1)) {
      return false
    }

    return true
  })
}

function formatDurationMinutes(minutes) {
  const safeMinutes = Math.max(0, Number(minutes) || 0)
  const hours = Math.floor(safeMinutes / 60)
  const remainderMinutes = Math.round(safeMinutes % 60)
  return `${hours}h ${remainderMinutes}m`
}

function getTradeMarketScope(trade) {
  return PERPS_BASE_ASSETS.has(trade.baseAsset) ? 'PERPS' : 'SPOT'
}

function filterTradesByMarketScope(trades, marketScope) {
  if (marketScope === 'ALL') {
    return trades
  }

  return trades.filter((trade) => getTradeMarketScope(trade) === marketScope)
}

function formatSignedPercent(value, digits = 1) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

function formatSignedInteger(value) {
  const rounded = Math.round(value)
  if (rounded === 0) {
    return '0'
  }

  return `${rounded > 0 ? '+' : '-'}${Math.abs(rounded)}`
}

function formatSignedUsdDelta(value) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${formatFee(Math.abs(value))}`
}

function formatSignedCompactDelta(value) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${formatCompactValue(Math.abs(value))}`
}

function buildScopeSummary({ trades, startingEquity }) {
  const totalTrades = trades.length
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const totalFees = trades.reduce((sum, trade) => sum + trade.fee, 0)
  const totalVolume = trades.reduce((sum, trade) => sum + trade.notional, 0)
  const totalDurationMinutes = trades.reduce((sum, trade) => sum + trade.durationMinutes, 0)
  const winners = trades.filter((trade) => trade.pnl > 0)
  const losers = trades.filter((trade) => trade.pnl < 0)
  const closedTrades = trades.filter((trade) => trade.status === 'CLOSED')
  const openTrades = trades.filter((trade) => trade.status === 'OPEN')
  const longs = trades.filter((trade) => trade.side === 'LONG').length
  const shorts = totalTrades - longs
  const spotTrades = trades.filter((trade) => getTradeMarketScope(trade) === 'SPOT')
  const perpsTrades = trades.filter((trade) => getTradeMarketScope(trade) === 'PERPS')

  const realizedPnl = closedTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  const unrealizedPnl = openTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  const walletBalance = startingEquity + realizedPnl
  const netEquity = walletBalance + unrealizedPnl
  const netPnlPercent = startingEquity > 0 ? (totalPnl / startingEquity) * 100 : 0
  const winRate = totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0
  const longShortRatio = longs / Math.max(shorts, 1)
  const averageDurationMinutes = totalTrades > 0 ? totalDurationMinutes / totalTrades : 0
  const maxWin = totalTrades > 0 ? Math.max(...trades.map((trade) => trade.pnl)) : 0
  const maxLoss = totalTrades > 0 ? Math.min(...trades.map((trade) => trade.pnl)) : 0
  const averageWin = winners.length > 0 ? winners.reduce((sum, trade) => sum + trade.pnl, 0) / winners.length : 0
  const averageLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0) / losers.length) : 0

  const spotPnl = spotTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  const perpsPnl = perpsTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  const perpsNotional = perpsTrades.reduce((sum, trade) => sum + trade.notional, 0)
  const marginUsed = perpsNotional / 5
  const effectiveLeverage = perpsNotional / Math.max(Math.abs(netEquity), 1)
  const marginUsagePercent = netEquity > 0 ? (marginUsed / netEquity) * 100 : 0
  const liqBufferPercent = Math.max(
    5,
    100 - Math.min(92, effectiveLeverage * 11 + (Math.abs(unrealizedPnl) / Math.max(Math.abs(netEquity), 1)) * 10),
  )
  const fundingPnl = perpsTrades.reduce((sum, trade) => {
    const hourlyRate = trade.side === 'LONG' ? -0.00001 : 0.000008
    return sum + trade.notional * hourlyRate * (trade.durationMinutes / 60)
  }, 0)
  const inventoryTurnover = totalVolume / Math.max(Math.abs(walletBalance), 1)
  const spotAverageDurationMinutes = spotTrades.length > 0
    ? spotTrades.reduce((sum, trade) => sum + trade.durationMinutes, 0) / spotTrades.length
    : 0
  const impliedSlippageBps = totalTrades > 0
    ? trades.reduce((sum, trade) => sum + (trade.type === 'Market' ? 6.5 : 1.6), 0) / totalTrades
    : 0
  const feeToPnlPercent = Math.abs(totalPnl) > 0 ? (totalFees / Math.abs(totalPnl)) * 100 : 0
  const spotContributionPercent = Math.abs(totalPnl) > 0 ? (spotPnl / totalPnl) * 100 : 0
  const perpsContributionPercent = Math.abs(totalPnl) > 0 ? (perpsPnl / totalPnl) * 100 : 0

  return {
    totalTrades,
    totalPnl,
    totalFees,
    totalVolume,
    totalDurationMinutes,
    realizedPnl,
    unrealizedPnl,
    walletBalance,
    netEquity,
    netPnlPercent,
    winRate,
    longShortRatio,
    averageDurationMinutes,
    maxWin,
    maxLoss,
    averageWin,
    averageLoss,
    spotTrades: spotTrades.length,
    perpsTrades: perpsTrades.length,
    spotPnl,
    perpsPnl,
    fundingPnl,
    effectiveLeverage,
    marginUsagePercent,
    liqBufferPercent,
    inventoryTurnover,
    spotAverageDurationMinutes,
    impliedSlippageBps,
    feeToPnlPercent,
    spotContributionPercent,
    perpsContributionPercent,
  }
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
  const { connected, connecting, disconnect, publicKey } = useWallet()
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const baseDashboard = useMemo(
    () => createDashboardMockData({ year: 2023, monthIndex: 9, totalTrades: 142, seed: 20231114 }),
    [],
  )

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
  const [transferStatusFilter, setTransferStatusFilter] = useState('ALL')
  const [rangePreset, setRangePreset] = useState('ALL')
  const [accountScope, setAccountScope] = useState('ALL')
  const [symbolFilter, setSymbolFilter] = useState('ALL')
  const [tableView, setTableView] = useState('POSITIONS')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [chartView, setChartView] = useState('PERFORMANCE')
  const [performanceView, setPerformanceView] = useState('DAILY')
  const [chartHoverIndex, setChartHoverIndex] = useState(null)
  const [heatmapHover, setHeatmapHover] = useState(null)
  const [impactHover, setImpactHover] = useState(null)
  const [impactActiveOnly, setImpactActiveOnly] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [editingNoteTrade, setEditingNoteTrade] = useState(null)
  const [editingNoteValue, setEditingNoteValue] = useState('')
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
        symbol: symbolFilter,
        startDate: rangeWindow.startDate,
        endDate: rangeWindow.endDate,
      }),
    [baseDashboard.table.trades, rangeWindow.endDate, rangeWindow.startDate, symbolFilter],
  )

  const accountScopeTrades = useMemo(
    () => filterTradesByMarketScope(scopedTrades, accountScope),
    [accountScope, scopedTrades],
  )

  const previousRangeWindow = useMemo(() => {
    if (!rangeWindow.startDate || !rangeWindow.endDate) {
      return null
    }

    const spanDays = Math.max(1, Math.round((rangeWindow.endDate.getTime() - rangeWindow.startDate.getTime()) / DAY_IN_MS) + 1)
    const previousEndDate = new Date(rangeWindow.startDate)
    previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1)
    const previousStartDate = new Date(previousEndDate)
    previousStartDate.setUTCDate(previousStartDate.getUTCDate() - (spanDays - 1))

    return {
      startDate: previousStartDate,
      endDate: previousEndDate,
      startInput: formatDateInputValue(previousStartDate),
      endInput: formatDateInputValue(previousEndDate),
    }
  }, [rangeWindow.endDate, rangeWindow.startDate])

  const previousRangeTrades = useMemo(
    () =>
      previousRangeWindow
        ? filterTradesByScope({
          trades: baseDashboard.table.trades,
          symbol: symbolFilter,
          startDate: previousRangeWindow.startDate,
          endDate: previousRangeWindow.endDate,
        })
        : [],
    [baseDashboard.table.trades, previousRangeWindow, symbolFilter],
  )

  const previousAccountScopeTrades = useMemo(
    () => filterTradesByMarketScope(previousRangeTrades, accountScope),
    [accountScope, previousRangeTrades],
  )

  const dashboard = useMemo(
    () =>
      createDashboardSnapshot({
        trades: scopedTrades,
        startingEquity: baseDashboard.startingEquity,
        startDateInput: rangeWindow.startInput,
        endDateInput: rangeWindow.endInput,
        chartView: chartView === 'PERFORMANCE' ? performanceView : chartView,
      }),
    [baseDashboard.startingEquity, chartView, performanceView, rangeWindow.endInput, rangeWindow.startInput, scopedTrades],
  )

  const filteredPositions = useMemo(() => {
    if (statusFilter === 'ALL') {
      return scopedTrades
    }

    return scopedTrades.filter((trade) => trade.status === statusFilter)
  }, [scopedTrades, statusFilter])

  const scopedOrders = useMemo(
    () =>
      filterRecordsByDateRange(baseDashboard.table.orders, 'createdAt', rangeWindow.startDate, rangeWindow.endDate).filter(
        (order) => symbolFilter === 'ALL' || order.symbol === symbolFilter,
      ),
    [baseDashboard.table.orders, rangeWindow.endDate, rangeWindow.startDate, symbolFilter],
  )
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') {
      return scopedOrders
    }

    return scopedOrders.filter((order) => order.status === orderStatusFilter)
  }, [orderStatusFilter, scopedOrders])

  const scopedTransfers = useMemo(
    () => filterRecordsByDateRange(baseDashboard.table.transfers, 'occurredAt', rangeWindow.startDate, rangeWindow.endDate),
    [baseDashboard.table.transfers, rangeWindow.endDate, rangeWindow.startDate],
  )
  const filteredTransfers = useMemo(() => {
    if (transferStatusFilter === 'ALL') {
      return scopedTransfers
    }

    return scopedTransfers.filter((transfer) => transfer.status === transferStatusFilter)
  }, [scopedTransfers, transferStatusFilter])

  const activeRows = useMemo(() => {
    if (tableView === 'ORDERS') {
      return filteredOrders
    }

    if (tableView === 'TRANSFERS') {
      return filteredTransfers
    }

    return filteredPositions
  }, [filteredOrders, filteredPositions, filteredTransfers, tableView])
  const activeRowsLabel = tableView === 'ORDERS' ? 'Orders' : tableView === 'TRANSFERS' ? 'Transfers' : 'Positions'
  const pageCount = Math.max(1, Math.ceil(activeRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return activeRows.slice(start, end)
  }, [activeRows, currentPage, pageSize])
  const paginationItems = buildPaginationItems(pageCount, currentPage)
  const chartLinePath = buildLinePath(dashboard.chart.points, 'lineValue')
  const accountEquityLinePath = buildLinePath(dashboard.chart.points, 'secondaryLineValue')
  const hasAccountEquityLine = Boolean(dashboard.chart.secondLineLegend && accountEquityLinePath)
  const chartAreaPath = buildAreaPath(dashboard.chart.points)
  const isHeatmapView = chartView === 'HEATMAP'
  const isImpactView = chartView === 'IMPACT'
  const isInsightsView = chartView === 'INSIGHTS'
  const isNonChartView = isHeatmapView || isImpactView || isInsightsView
  const lineValues = dashboard.chart.points.map((point) => point.lineValue)
  const lineMin = lineValues.length > 0 ? Math.min(...lineValues) : 0
  const lineMax = lineValues.length > 0 ? Math.max(...lineValues) : 0
  const feeValues = dashboard.chart.points.map((point) => (Number.isFinite(point.feeValue) ? point.feeValue : 0))
  const feeMax = feeValues.length > 0 ? Math.max(...feeValues) : 0
  const showDailyFeeBars = chartView === 'PERFORMANCE' && performanceView === 'DAILY' && feeMax > 0
  const hoveredChartPoint = !isNonChartView && chartHoverIndex !== null ? dashboard.chart.points[chartHoverIndex] : null
  const hoverXPercent = hoveredChartPoint
    ? (chartHoverIndex / Math.max(dashboard.chart.points.length - 1, 1)) * 100
    : 0
  const hoverYPercent = hoveredChartPoint
    ? (mapValueToRange(hoveredChartPoint.lineValue, lineMin, lineMax, LINE_TOP, LINE_BOTTOM) / CHART_HEIGHT) * 100
    : 0
  const [startLabel, midLabel, endLabel] = dashboard.chart.xLabels
  const visibleStart = activeRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const visibleEnd = activeRows.length === 0 ? 0 : visibleStart + paginatedRows.length - 1
  const activeScopedCount = tableView === 'ORDERS' ? scopedOrders.length : tableView === 'TRANSFERS' ? scopedTransfers.length : scopedTrades.length
  const activeStatusFilter = tableView === 'ORDERS' ? orderStatusFilter : tableView === 'TRANSFERS' ? transferStatusFilter : statusFilter
  const selectableSymbols = useMemo(() => ['ALL', ...baseDashboard.availableSymbols], [baseDashboard.availableSymbols])

  const accountScopeSummary = useMemo(
    () => buildScopeSummary({ trades: accountScopeTrades, startingEquity: baseDashboard.startingEquity }),
    [accountScopeTrades, baseDashboard.startingEquity],
  )

  const previousAccountScopeSummary = useMemo(
    () =>
      previousRangeWindow
        ? buildScopeSummary({ trades: previousAccountScopeTrades, startingEquity: baseDashboard.startingEquity })
        : null,
    [baseDashboard.startingEquity, previousAccountScopeTrades, previousRangeWindow],
  )
  const aiDocsPrompt = useMemo(
    () =>
      [
        'Use the Deriverse docs to analyze this wallet.',
        '',
        'Wallet: <WALLET_ADDRESS>',
        'Documentation URL: https://deriverse.gitbook.io/deriverse-v1',
        '',
        'Please provide:',
        '1) Performance summary',
        '2) Key risk metrics',
        '3) Notable trade behavior patterns',
        '4) Improvements based on Deriverse features',
        '5) Follow-up questions for deeper review',
      ].join('\n'),
    [],
  )
  const walletAddressLabel = publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : ''
  const chatgptPrefillUrl = useMemo(() => `https://chatgpt.com/?q=${encodeURIComponent(aiDocsPrompt)}`, [aiDocsPrompt])
  const claudePrefillUrl = useMemo(() => `https://claude.ai/new?q=${encodeURIComponent(aiDocsPrompt)}`, [aiDocsPrompt])

  function getScopeDeltaLabel(currentValue, previousValue, formatter) {
    if (previousAccountScopeSummary === null) {
      return '--'
    }

    return formatter(currentValue - previousValue)
  }

  function handleWalletConnectClick() {
    setWalletModalVisible(true)
  }

  function handleOpenDepositModal() {
    if (!connected) {
      return
    }

    setIsDepositModalOpen(true)
  }

  async function handleWalletDisconnectClick() {
    try {
      await disconnect()
    } catch (error) {
      console.error('Failed to disconnect wallet', error)
    }
  }

  const statsRows = [
    {
      label: 'Net PnL',
      value: formatSignedPercent(accountScopeSummary.netPnlPercent, 1),
      valueClass: accountScopeSummary.netPnlPercent >= 0 ? 'text-success' : 'text-danger',
      delta: getScopeDeltaLabel(
        accountScopeSummary.netPnlPercent,
        previousAccountScopeSummary?.netPnlPercent ?? 0,
        (delta) => formatSignedPercent(delta, 1),
      ),
    },
    {
      label: 'Win Rate',
      value: `${accountScopeSummary.winRate.toFixed(1)}%`,
      valueClass: 'text-white',
      delta: getScopeDeltaLabel(
        accountScopeSummary.winRate,
        previousAccountScopeSummary?.winRate ?? 0,
        (delta) => formatSignedPercent(delta, 1),
      ),
    },
    {
      label: 'Volume',
      value: formatCompactValue(accountScopeSummary.totalVolume),
      valueClass: 'text-white',
      delta: getScopeDeltaLabel(
        accountScopeSummary.totalVolume,
        previousAccountScopeSummary?.totalVolume ?? 0,
        (delta) => formatSignedCompactDelta(delta),
      ),
    },
    {
      label: 'Fees',
      value: formatFee(accountScopeSummary.totalFees),
      valueClass: 'text-danger',
      delta: getScopeDeltaLabel(
        accountScopeSummary.totalFees,
        previousAccountScopeSummary?.totalFees ?? 0,
        (delta) => formatSignedUsdDelta(delta),
      ),
    },
    {
      label: 'L/S Ratio',
      value: accountScopeSummary.longShortRatio.toFixed(2),
      valueClass: 'text-white',
      delta: getScopeDeltaLabel(
        accountScopeSummary.longShortRatio,
        previousAccountScopeSummary?.longShortRatio ?? 0,
        (delta) => `${delta >= 0 ? '+' : '-'}${Math.abs(delta).toFixed(2)}`,
      ),
    },
    {
      label: 'Total Trades',
      value: String(accountScopeSummary.totalTrades),
      valueClass: 'text-white',
      delta: getScopeDeltaLabel(
        accountScopeSummary.totalTrades,
        previousAccountScopeSummary?.totalTrades ?? 0,
        (delta) => formatSignedInteger(delta),
      ),
    },
    {
      label: 'Avg Duration',
      value: formatDurationMinutes(accountScopeSummary.averageDurationMinutes),
      valueClass: 'text-white',
      delta: getScopeDeltaLabel(
        accountScopeSummary.averageDurationMinutes,
        previousAccountScopeSummary?.averageDurationMinutes ?? 0,
        (delta) => `${delta >= 0 ? '+' : '-'}${formatDurationMinutes(Math.abs(delta))}`,
      ),
    },
  ]

  const isComparisonAvailable = previousAccountScopeSummary !== null
  const accountMatrixItems = [
    { label: 'Net Equity', value: formatFee(accountScopeSummary.netEquity), valueClass: 'text-white' },
    { label: 'Wallet Balance', value: formatFee(accountScopeSummary.walletBalance), valueClass: 'text-white' },
    {
      label: 'Realized PnL',
      value: formatSignedPnl(accountScopeSummary.realizedPnl),
      valueClass: accountScopeSummary.realizedPnl >= 0 ? 'text-success' : 'text-danger',
    },
    {
      label: 'Unrealized PnL',
      value: formatSignedPnl(accountScopeSummary.unrealizedPnl),
      valueClass: accountScopeSummary.unrealizedPnl >= 0 ? 'text-success' : 'text-danger',
    },
    { label: 'Fees Paid', value: formatFee(accountScopeSummary.totalFees), valueClass: 'text-danger' },
    {
      label: 'Funding PnL',
      value: accountScope === 'SPOT' ? '--' : formatSignedPnl(accountScopeSummary.fundingPnl),
      valueClass:
        accountScope === 'SPOT'
          ? 'text-secondary-text'
          : accountScopeSummary.fundingPnl >= 0
            ? 'text-success'
            : 'text-danger',
    },
  ]
  const performanceMatrixItems = [
    ...statsRows.map((row, index) => ({
      label: row.label,
      value: row.value,
      valueClass: row.valueClass,
      delta: isComparisonAvailable && index < 2 ? row.delta : null,
    })),
    {
      label: 'Avg Win/Loss',
      value: `${formatCompactValue(accountScopeSummary.averageWin)} / -${formatCompactValue(accountScopeSummary.averageLoss)}`,
      valueClass: 'text-white',
      delta: null,
    },
  ]
  const scopeMatrixItems = [
    { label: 'Spot PnL Share', value: `${accountScopeSummary.spotContributionPercent.toFixed(1)}%`, valueClass: 'text-white' },
    { label: 'Perps PnL Share', value: `${accountScopeSummary.perpsContributionPercent.toFixed(1)}%`, valueClass: 'text-white' },
    { label: 'Spot / Perps Trades', value: `${accountScopeSummary.spotTrades} / ${accountScopeSummary.perpsTrades}`, valueClass: 'text-white' },
    {
      label: 'Funding PnL',
      value: formatSignedPnl(accountScopeSummary.fundingPnl),
      valueClass: accountScopeSummary.fundingPnl >= 0 ? 'text-success' : 'text-danger',
    },
  ]

  const bestDayTradeStrips = useMemo(() => {
    const bestDayIndex = WEEKDAY_SHORT_LABELS.indexOf(dashboard.analytics.bestDay.label)
    if (bestDayIndex < 0) {
      return []
    }

    return scopedTrades
      .filter((trade) => trade.exitAt.getUTCDay() === bestDayIndex)
      .slice()
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10)
      .map((trade) => ({
        id: trade.id,
        symbol: trade.symbol.split('/')[0].trim(),
        sideShort: trade.side === 'LONG' ? 'L' : 'S',
        pnl: trade.pnl,
      }))
  }, [dashboard.analytics.bestDay.label, scopedTrades])

  const streakInsights = useMemo(() => {
    const closedTrades = scopedTrades
      .filter((trade) => trade.status === 'CLOSED')
      .slice()
      .sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime())

    if (closedTrades.length === 0) {
      return {
        currentRunPnl: 0,
        longestWinRunCount: 0,
        longestWinRunPnl: 0,
        longestLossRunCount: 0,
        longestLossRunPnl: 0,
        recentOutcomes: [],
      }
    }

    const runs = []
    let currentType = null
    let currentCount = 0
    let currentPnl = 0

    for (const trade of closedTrades) {
      const runType = trade.pnl >= 0 ? 'WIN' : 'LOSS'
      if (currentType === runType) {
        currentCount += 1
        currentPnl += trade.pnl
      } else {
        if (currentType !== null) {
          runs.push({ type: currentType, count: currentCount, pnl: currentPnl })
        }
        currentType = runType
        currentCount = 1
        currentPnl = trade.pnl
      }
    }

    runs.push({ type: currentType, count: currentCount, pnl: currentPnl })

    const currentRun = runs[runs.length - 1]
    const winRuns = runs.filter((run) => run.type === 'WIN')
    const lossRuns = runs.filter((run) => run.type === 'LOSS')
    const longestWinRun = winRuns.reduce((best, run) => {
      if (!best) {
        return run
      }
      if (run.count > best.count) {
        return run
      }
      if (run.count === best.count && run.pnl > best.pnl) {
        return run
      }
      return best
    }, null)
    const longestLossRun = lossRuns.reduce((best, run) => {
      if (!best) {
        return run
      }
      if (run.count > best.count) {
        return run
      }
      if (run.count === best.count && Math.abs(run.pnl) > Math.abs(best.pnl)) {
        return run
      }
      return best
    }, null)

    const recentOutcomes = closedTrades.slice(-8).map((trade) => ({
      id: trade.id,
      outcome: trade.pnl >= 0 ? 'W' : 'L',
      pnl: trade.pnl,
    }))

    return {
      currentRunPnl: currentRun?.pnl ?? 0,
      longestWinRunCount: longestWinRun?.count ?? 0,
      longestWinRunPnl: longestWinRun?.pnl ?? 0,
      longestLossRunCount: longestLossRun?.count ?? 0,
      longestLossRunPnl: longestLossRun?.pnl ?? 0,
      recentOutcomes,
    }
  }, [scopedTrades])
  const orderTypePerformance = useMemo(() => {
    const byType = (type) => {
      const source = scopedTrades.filter((trade) => trade.type.toUpperCase() === type.toUpperCase())
      const trades = source.length
      const winners = source.filter((trade) => trade.pnl > 0).length
      const totalPnl = source.reduce((sum, trade) => sum + trade.pnl, 0)
      const totalFees = source.reduce((sum, trade) => sum + trade.fee, 0)

      return {
        label: type === 'Market' ? 'Market' : 'Limit',
        trades,
        winRate: trades > 0 ? (winners / trades) * 100 : 0,
        avgPnl: trades > 0 ? totalPnl / trades : 0,
        totalPnl,
        avgFee: trades > 0 ? totalFees / trades : 0,
      }
    }

    return [byType('Market'), byType('Limit')]
  }, [scopedTrades])

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
    setEditingNoteTrade(trade)
    setEditingNoteValue(existing)
  }

  function handleSaveNoteEdit() {
    if (!editingNoteTrade) {
      return
    }

    const trimmed = editingNoteValue.trim()
    setAnnotationMap((current) => {
      const next = { ...current }

      if (trimmed.length === 0) {
        delete next[editingNoteTrade.id]
      } else {
        next[editingNoteTrade.id] = trimmed
      }

      return next
    })

    setEditingNoteTrade(null)
    setEditingNoteValue('')
  }

  function handleCloseNoteEditor() {
    setEditingNoteTrade(null)
    setEditingNoteValue('')
  }

  function handleChartMouseMove(event) {
    if (isNonChartView || dashboard.chart.points.length === 0) {
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
    let header = []
    let rows = []
    let scopeLabel = 'positions'

    if (tableView === 'ORDERS') {
      scopeLabel = 'orders'
      header = ['Date Time', 'Order ID', 'Symbol', 'Side', 'Type', 'TIF', 'Size', 'Filled', 'Price', 'Status']
      rows = filteredOrders.map((order) => [
        order.dateTimeLabel,
        order.orderId,
        order.symbol,
        order.side,
        order.type,
        order.timeInForce,
        `${order.size} ${order.baseAsset}`,
        `${order.filledSize} ${order.baseAsset}`,
        order.price,
        order.status,
      ])
    } else if (tableView === 'TRANSFERS') {
      scopeLabel = 'transfers'
      header = ['Date Time', 'Transfer ID', 'Type', 'Asset', 'Amount', 'Status']
      rows = filteredTransfers.map((transfer) => [
        transfer.dateTimeLabel,
        transfer.transferId,
        transfer.type,
        transfer.asset,
        transfer.amount,
        transfer.status,
      ])
    } else {
      header = ['Date Time', 'Symbol', 'Status', 'Side', 'Type', 'Size', 'Entry', 'Exit', 'PnL', 'Fee', 'Annotation']
      rows = filteredPositions.map((trade) => [
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
    }

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(','))
      .join('\n')

    const now = new Date()
    const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `deriverse-${scopeLabel}-${stamp}.csv`)
  }

  function handleExportPdf() {
    const reportWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!reportWindow) {
      return
    }

    let heading = 'Positions Export'
    let headerCells = []
    let rows = ''
    let filterLabel = ''

    if (tableView === 'ORDERS') {
      heading = 'Orders Export'
      headerCells = ['Date / Time', 'Order ID', 'Symbol', 'Side', 'Type', 'TIF', 'Size', 'Filled', 'Price', 'Status']
      rows = filteredOrders
        .map((order) => `
          <tr>
            <td>${escapeHtml(order.dateTimeLabel)}</td>
            <td>${escapeHtml(order.orderId)}</td>
            <td>${escapeHtml(order.symbol)}</td>
            <td>${escapeHtml(order.side)}</td>
            <td>${escapeHtml(order.type)}</td>
            <td>${escapeHtml(order.timeInForce)}</td>
            <td>${escapeHtml(formatTradeSize(order.size, order.baseAsset, order.sizeDigits))}</td>
            <td>${escapeHtml(formatTradeSize(order.filledSize, order.baseAsset, order.sizeDigits))}</td>
            <td>${escapeHtml(formatPrice(order.price))}</td>
            <td>${escapeHtml(order.status)}</td>
          </tr>
        `)
        .join('')
      filterLabel = orderStatusFilter
    } else if (tableView === 'TRANSFERS') {
      heading = 'Deposits / Withdrawals Export'
      headerCells = ['Date / Time', 'Transfer ID', 'Type', 'Asset', 'Amount', 'Status']
      rows = filteredTransfers
        .map((transfer) => `
          <tr>
            <td>${escapeHtml(transfer.dateTimeLabel)}</td>
            <td>${escapeHtml(transfer.transferId)}</td>
            <td>${escapeHtml(transfer.type)}</td>
            <td>${escapeHtml(transfer.asset)}</td>
            <td>${escapeHtml(formatFee(transfer.amount))}</td>
            <td>${escapeHtml(transfer.status)}</td>
          </tr>
        `)
        .join('')
      filterLabel = transferStatusFilter
    } else {
      headerCells = ['Date / Time', 'Symbol', 'Status', 'Side', 'Type', 'Size', 'Entry', 'Exit', 'PnL', 'Fee', 'Note']
      rows = filteredPositions
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
      filterLabel = statusFilter
    }
    const tableHeaderHtml = headerCells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')

    const documentHtml = `
      <html>
        <head>
          <title>Deriverse Export</title>
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
          <h1>${escapeHtml(heading)}</h1>
          <p>Period: ${escapeHtml(dashboard.periodLabel)}</p>
          <p>Filters: ${escapeHtml(rangePreset)} | ${escapeHtml(filterLabel)} | ${escapeHtml(activeRows.length)} rows</p>
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
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
      <DepositModal
        accountBalance={accountScopeSummary.walletBalance}
        connected={connected}
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        publicKey={publicKey}
      />
      {editingNoteTrade && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-[560px] border border-panel-border bg-background-dark p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Position Note</p>
                <p className="mono text-sm font-bold text-white">{editingNoteTrade.symbol}</p>
              </div>
              <button
                className="h-8 w-8 border border-panel-border bg-neutral-dark/40 text-lg leading-none text-secondary-text hover:text-white"
                onClick={handleCloseNoteEditor}
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
                maxLength={500}
                onChange={(event) => setEditingNoteValue(event.target.value)}
                placeholder="Add context for this position..."
                value={editingNoteValue}
              />
              <div className="mt-1 flex items-center justify-between text-[10px] text-secondary-text">
                <span>Leave empty to remove note</span>
                <span className="mono">{editingNoteValue.length}/500</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="h-9 border border-panel-border bg-background-dark px-3 text-[10px] font-bold uppercase tracking-wider text-secondary-text hover:text-white"
                onClick={handleCloseNoteEditor}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-9 border border-primary/50 bg-primary/10 px-3 text-[10px] font-bold uppercase tracking-wider text-primary hover:border-primary"
                onClick={handleSaveNoteEdit}
                type="button"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex min-h-screen w-full flex-col lg:mx-auto lg:max-w-[83.333333%]">
        <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-panel-border bg-background-dark px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DeriverseLogo className="size-5 text-primary" />
              <h1 className="text-base font-bold tracking-tight">DERIVERSE</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`h-8 border px-3 text-[10px] font-bold uppercase tracking-wide ${
                connected
                  ? 'border-panel-border bg-neutral-dark/50 text-white hover:border-secondary-text'
                  : 'cursor-not-allowed border-panel-border/60 bg-neutral-dark/20 text-secondary-text/70'
              }`}
              disabled={!connected}
              onClick={handleOpenDepositModal}
              title={!connected ? 'Connect wallet to deposit' : 'Deposit funds'}
              type="button"
            >
              Deposit
            </button>
            <button
              className={`h-8 border px-3 text-[10px] font-bold uppercase tracking-wide ${
                connected
                  ? 'border-success/40 bg-success/10 text-success hover:border-success'
                  : 'border-panel-border bg-neutral-dark/50 text-white hover:border-secondary-text'
              }`}
              onClick={handleWalletConnectClick}
              type="button"
            >
              {connecting ? 'Connecting...' : connected ? walletAddressLabel : 'Connect Wallet'}
            </button>
            {connected && (
              <button
                className="h-8 border border-panel-border bg-background-dark px-2 text-[10px] font-bold uppercase tracking-wide text-secondary-text hover:text-white"
                onClick={handleWalletDisconnectClick}
                type="button"
              >
                Disconnect
              </button>
            )}
          </div>
        </header>

        <div className="grid h-[45vh] min-h-[340px] grid-cols-12 gap-px overflow-hidden border-b border-panel-border bg-neutral-dark">
          <div className="col-span-4 h-full min-h-0 overflow-hidden bg-background-dark">
            <div className="flex h-full flex-col">
              <div className="border-b border-panel-border px-3 py-2">
                <div className="overflow-hidden border border-panel-border">
                  <div className="flex gap-px ">
                    {['ALL', 'SPOT', 'PERPS'].map((scope) => (
                      <button
                        className={`h-7 px-2.5 text-[10px] font-bold uppercase ${accountScope === scope ? 'bg-primary text-background-dark' : 'bg-background-dark text-secondary-text hover:text-white'
                          }`}
                        key={scope}
                        onClick={() => setAccountScope(scope)}
                        type="button"
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="thin-scrollbar flex-1 overflow-y-auto p-3">
                <section className="border border-panel-border bg-neutral-dark/20">
                  <div className="space-y-2 p-2">
                    <div>
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-secondary-text">Account</p>
                      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                        {accountMatrixItems.map((item) => (
                          <div key={item.label}>
                            <p className="text-[9px] uppercase text-secondary-text">{item.label}</p>
                            <p className={`mono text-sm font-bold leading-none ${item.valueClass}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-panel-border/70 pt-2">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-secondary-text">Performance</p>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                        {performanceMatrixItems.map((item) => (
                          <div key={item.label}>
                            <p className="text-[9px] uppercase text-secondary-text">{item.label}</p>
                            <p className={`mono text-sm font-bold leading-none ${item.valueClass}`}>
                              {item.value}
                              {item.delta && <span className="text-[9px] text-secondary-text"> · {item.delta}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-panel-border/70 pt-2">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-secondary-text">Scope</p>
                        <p className="text-[9px] uppercase text-secondary-text">{accountScope}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {scopeMatrixItems.map((item) => (
                          <div key={item.label}>
                            <p className="text-[9px] uppercase text-secondary-text">{item.label}</p>
                            <p className={`mono text-sm font-bold leading-none ${item.valueClass}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div className="col-span-8 flex h-full min-h-0 flex-col overflow-hidden border-l border-panel-border bg-background-dark p-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                {isInsightsView ? (
                  <p className="mono text-xs font-medium text-white">Insights Snapshot</p>
                ) : (
                  <>
                    <p className={`mono text-xs font-medium ${dashboard.chart.headlineClass}`}>
                      {dashboard.chart.headlineLabel}: {dashboard.chart.headlineValue}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 bg-primary" />
                        <span className="text-[10px] text-secondary-text">{dashboard.chart.lineLegend}</span>
                      </div>
                      {hasAccountEquityLine && (
                        <div className="flex items-center gap-1.5">
                          <span className="h-0.5 w-3 border-t border-dashed border-[#6B7280]" />
                          <span className="text-[10px] text-secondary-text">{dashboard.chart.secondLineLegend}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 border border-danger bg-danger/40" />
                        <span className="text-[10px] text-secondary-text">{dashboard.chart.areaLegend}</span>
                      </div>
                      {showDailyFeeBars && (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-1.5 bg-[#7F1D1D]" />
                          <span className="text-[10px] text-secondary-text">{dashboard.chart.feeLegend ?? 'Daily Fees'}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
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
                    <button
                      className={`h-8 px-3 text-[10px] font-bold uppercase ${chartView === 'INSIGHTS' ? 'bg-primary text-background-dark' : 'bg-background-dark text-secondary-text hover:text-white'
                        }`}
                      onClick={() => setChartView('INSIGHTS')}
                      type="button"
                    >
                      Insights
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

            <div className="relative mb-2 min-h-0 flex-1 overflow-hidden w-full">
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
                              className="h-6 bg-background-dark"
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
                        className={`h-5 border px-2 text-[9px] font-bold uppercase ${impactActiveOnly
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
              ) : isInsightsView ? (
                <div className="grid h-full grid-cols-12 gap-2">
                  <div className="col-span-4 border border-panel-border bg-neutral-dark/20 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Best Day Analysis</p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="mono text-lg font-bold text-white">{dashboard.analytics.bestDay.label}</p>
                      <p className={`mono text-sm font-bold ${dashboard.analytics.bestDay.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatSignedPnl(dashboard.analytics.bestDay.pnl)}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] uppercase text-secondary-text">{dashboard.analytics.bestDay.trades} trades in selected range</p>
                    <div className="mt-2 border-t border-panel-border/70 pt-2">
                      <p className="text-[9px] uppercase text-secondary-text">Best-day trades</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {bestDayTradeStrips.length > 0 ? (
                          bestDayTradeStrips.map((trade) => (
                            <span
                              className={`mono inline-flex items-center gap-1 border border-panel-border bg-background-dark/70 px-1.5 py-0.5 text-[9px] ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}
                              key={trade.id}
                              title={`${trade.symbol} ${trade.sideShort === 'L' ? 'LONG' : 'SHORT'} ${formatSignedPnl(trade.pnl)}`}
                            >
                              <span className="text-secondary-text">{trade.symbol}</span>
                              <span className="text-secondary-text">{trade.sideShort}</span>
                              <span>{formatSignedPnl(trade.pnl)}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] uppercase text-secondary-text">No day trades in scope</span>
                        )}
                      </div>
                    </div>
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
                    <div className="mt-2 border-t border-panel-border/70 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] uppercase text-secondary-text">Current Run PnL</p>
                          <p className={`mono text-sm font-bold ${streakInsights.currentRunPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatSignedPnl(streakInsights.currentRunPnl)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-secondary-text">Longest Runs PnL</p>
                          <p className="mono text-[10px] font-bold text-white">
                            W{streakInsights.longestWinRunCount}: {formatSignedPnl(streakInsights.longestWinRunPnl)}
                          </p>
                          <p className="mono text-[10px] font-bold text-white">
                            L{streakInsights.longestLossRunCount}: {formatSignedPnl(streakInsights.longestLossRunPnl)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[9px] uppercase text-secondary-text">Recent outcomes</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {streakInsights.recentOutcomes.length > 0 ? (
                          streakInsights.recentOutcomes.map((item) => (
                            <span
                              className={`mono inline-flex items-center gap-1 border border-panel-border bg-background-dark/70 px-1.5 py-0.5 text-[9px] ${item.outcome === 'W' ? 'text-success' : 'text-danger'}`}
                              key={item.id}
                            >
                              <span>{item.outcome}</span>
                              <span>{formatSignedPnl(item.pnl)}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] uppercase text-secondary-text">No closed streak data</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 border border-panel-border bg-neutral-dark/20 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">Order Type Performance</p>
                    <div className="mt-2 space-y-2">
                      {orderTypePerformance.map((item) => (
                        <div className="border border-panel-border/70 bg-background-dark/50 px-2 py-1.5" key={item.label}>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase text-white">{item.label}</p>
                            <p className={`mono text-[10px] font-bold ${item.totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                              {formatSignedPnl(item.totalPnl)}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <p className="text-[9px] uppercase text-secondary-text">Trades: <span className="mono text-white">{item.trades}</span></p>
                            <p className="text-[9px] uppercase text-secondary-text">Win Rate: <span className="mono text-white">{item.winRate.toFixed(1)}%</span></p>
                            <p className="text-[9px] uppercase text-secondary-text">Avg PnL: <span className={`mono ${item.avgPnl >= 0 ? 'text-success' : 'text-danger'}`}>{formatSignedPnl(item.avgPnl)}</span></p>
                            <p className="text-[9px] uppercase text-secondary-text">Avg Fee: <span className="mono text-secondary-text">{formatFee(item.avgFee)}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    {showDailyFeeBars &&
                      dashboard.chart.points.map((point, index) => {
                        const barWidth = (CHART_WIDTH / Math.max(dashboard.chart.points.length, 1)) * 0.66
                        const step = CHART_WIDTH / Math.max(dashboard.chart.points.length - 1, 1)
                        const x = index * step - barWidth / 2
                        const heightTop = mapValueToRange(point.feeValue ?? 0, 0, feeMax, FEE_BAR_BOTTOM, FEE_BAR_TOP)

                        return (
                          <rect
                            fill="rgba(180, 83, 9, 0.78)"
                            height={Math.max(1, FEE_BAR_BOTTOM - heightTop)}
                            key={`fee-bar-${point.label}-${index}`}
                            rx="0.8"
                            stroke="rgba(245, 158, 11, 0.95)"
                            strokeWidth="0.35"
                            width={Math.max(1.5, barWidth)}
                            x={Math.max(0, x)}
                            y={heightTop}
                          />
                        )
                      })}
                    <path d={chartLinePath} fill="none" stroke="#9CA3AF" strokeWidth="1.5" />
                    {hasAccountEquityLine && (
                      <path
                        d={accountEquityLinePath}
                        fill="none"
                        stroke="#6B7280"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                        strokeWidth="1.2"
                      />
                    )}
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
                        {dashboard.chart.secondLineLegend && Number.isFinite(hoveredChartPoint.secondaryLineValue) && (
                          <p className="mono text-[#6B7280]">
                            {dashboard.chart.secondLineLegend}: {formatCompactValue(hoveredChartPoint.secondaryLineValue)}
                          </p>
                        )}
                        {showDailyFeeBars && Number.isFinite(hoveredChartPoint.feeValue) && (
                          <p className="mono text-[#B45309]">
                            {dashboard.chart.feeLegend ?? 'Daily Fees'}: {formatFee(hoveredChartPoint.feeValue)}
                          </p>
                        )}
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

              {!isHeatmapView && !isImpactView && !isInsightsView && (
                <div className="absolute bottom-0 left-0 flex w-full justify-between px-1">
                  <span className="mono text-[9px] uppercase text-secondary-text">{startLabel}</span>
                  <span className="mono text-[9px] uppercase text-secondary-text">{midLabel}</span>
                  <span className="mono text-[9px] uppercase text-secondary-text">{endLabel}</span>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-panel-border pt-3">
              {chartView === 'PERFORMANCE' && (
                <div className="flex justify-end">
                  <div className="overflow-hidden border border-panel-border bg-neutral-dark">
                    <div className="flex gap-px bg-neutral-dark">
                      {[
                        { id: 'DAILY', label: 'Daily' },
                        { id: 'SESSION', label: 'Session' },
                        { id: 'HOD', label: 'HOD' },
                      ].map((option) => (
                        <button
                          className={`h-7 px-2.5 text-[10px] font-bold uppercase ${
                            performanceView === option.id
                              ? 'bg-primary text-background-dark'
                              : 'bg-background-dark text-secondary-text hover:text-white'
                          }`}
                          key={option.id}
                          onClick={() => setPerformanceView(option.id)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-0">
          <div className="flex h-full flex-col bg-background-dark">
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
                    onClick={() => {
                      setTableView(option.id)
                      setPage(1)
                    }}
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
                    disabled={activeRows.length === 0}
                    id="export-menu"
                    onChange={(event) => {
                      if (event.target.value === 'CSV') {
                        handleExportCsv()
                      }

                      if (event.target.value === 'PDF') {
                        handleExportPdf()
                      }

                      event.target.value = ''
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Choose</option>
                    <option value="CSV">CSV</option>
                    <option value="PDF">PDF</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              {tableView === 'POSITIONS' ? (
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
                            onChange={(event) => {
                              setSymbolFilter(event.target.value)
                              setPage(1)
                            }}
                            value={symbolFilter}
                          >
                            {selectableSymbols.map((symbol) => (
                              <option key={symbol} value={symbol}>
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
                            onChange={(event) => {
                              setStatusFilter(event.target.value)
                              setPage(1)
                            }}
                            value={statusFilter}
                          >
                            <option value="ALL">All</option>
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
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
                    {paginatedRows.map((trade) => {
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
                          <td className={`mono px-4 py-2 text-right font-bold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
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
                              {noteText ? 'Edit Note' : 'Add Note'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : tableView === 'ORDERS' ? (
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
                            onChange={(event) => {
                              setSymbolFilter(event.target.value)
                              setPage(1)
                            }}
                            value={symbolFilter}
                          >
                            {selectableSymbols.map((symbol) => (
                              <option key={symbol} value={symbol}>
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
                            onChange={(event) => {
                              setOrderStatusFilter(event.target.value)
                              setPage(1)
                            }}
                            value={orderStatusFilter}
                          >
                            <option value="ALL">All</option>
                            <option value="OPEN">Open</option>
                            <option value="FILLED">Filled</option>
                            <option value="CANCELED">Canceled</option>
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-dark">
                    {paginatedRows.map((order) => (
                      <tr className="group transition-colors hover:bg-neutral-dark/10" key={order.id}>
                        <td className="mono px-4 py-2 text-secondary-text">{order.dateTimeLabel}</td>
                        <td className="mono px-4 py-2 text-white">{order.orderId}</td>
                        <td className="px-4 py-2 font-bold uppercase tracking-tight text-white">{order.symbol}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold ${order.side === 'LONG'
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
              ) : (
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
                            onChange={(event) => {
                              setTransferStatusFilter(event.target.value)
                              setPage(1)
                            }}
                            value={transferStatusFilter}
                          >
                            <option value="ALL">All</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING">Pending</option>
                            <option value="FAILED">Failed</option>
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-dark">
                    {paginatedRows.map((transfer) => (
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
              )}
            </div>

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
                  Showing {visibleStart}-{visibleEnd} of {activeRows.length} {activeRowsLabel}
                </span>
                {activeStatusFilter !== 'ALL' && (
                  <span className="text-[9px] text-secondary-text/80">
                    ({activeStatusFilter.toLowerCase()} from {activeScopedCount} scoped)
                  </span>
                )}
                <span className="text-[9px] text-secondary-text/80">Range: {dashboard.periodLabel}</span>
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
