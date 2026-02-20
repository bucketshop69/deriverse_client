const SYMBOLS = [
  {
    pair: 'BTC / USDT',
    baseAsset: 'BTC',
    entryMin: 27000,
    entryMax: 34000,
    sizeMin: 0.15,
    sizeMax: 2.4,
    sizeDigits: 3,
  },
  {
    pair: 'ETH / USDT',
    baseAsset: 'ETH',
    entryMin: 1450,
    entryMax: 2100,
    sizeMin: 2,
    sizeMax: 26,
    sizeDigits: 3,
  },
  {
    pair: 'SOL / USDT',
    baseAsset: 'SOL',
    entryMin: 18,
    entryMax: 72,
    sizeMin: 80,
    sizeMax: 520,
    sizeDigits: 2,
  },
  {
    pair: 'BNB / USDT',
    baseAsset: 'BNB',
    entryMin: 205,
    entryMax: 340,
    sizeMin: 18,
    sizeMax: 140,
    sizeDigits: 2,
  },
  {
    pair: 'XRP / USDT',
    baseAsset: 'XRP',
    entryMin: 0.43,
    entryMax: 0.71,
    sizeMin: 1200,
    sizeMax: 10000,
    sizeDigits: 0,
  },
]

const ORDER_TYPES = ['Market', 'Limit']
const ORDER_STATUSES = ['OPEN', 'FILLED', 'CANCELED']
const TRANSFER_TYPES = ['DEPOSIT', 'WITHDRAWAL']
const TRANSFER_STATUSES = ['COMPLETED', 'PENDING', 'FAILED']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_SLOTS = ['00-03', '04-07', '08-11', '12-15', '16-19', '20-23']
const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_LABELS = ['Asia', 'London', 'New York']
const HOD_LABELS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))

function createSeededRng(seed) {
  let value = seed >>> 0

  return function next() {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function randomBetween(rng, min, max) {
  return min + (max - min) * rng()
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)]
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function toFixedNumber(value, digits = 2) {
  return Number(value.toFixed(digits))
}

function formatDateTimeUTC(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`
}

function formatUsd(value, digits = 2) {
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

function formatSignedUsd(value, digits = 2) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${formatUsd(Math.abs(value), digits)}`
}

function formatCompactUsd(value) {
  const absolute = Math.abs(value)

  if (absolute >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }

  if (absolute >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }

  if (absolute >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }

  return formatUsd(value, 2)
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const remainderMinutes = Math.round(minutes % 60)
  return `${hours}h ${remainderMinutes}m`
}

function getMonthShortLabel(date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  })
}

function getDayKey(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function fromDayKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dayStartUtc(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function formatDayLabel(date) {
  return `${getMonthShortLabel(date)} ${pad2(date.getUTCDate())}`
}

function formatPeriodLabel(startDate, endDate) {
  const start = `${getMonthShortLabel(startDate)} ${startDate.getUTCDate()}, ${startDate.getUTCFullYear()}`
  const end = `${getMonthShortLabel(endDate)} ${endDate.getUTCDate()}, ${endDate.getUTCFullYear()}`
  return `${start} - ${end}`
}

function getXLabels(points) {
  if (points.length === 0) {
    return ['-', '-', '-']
  }

  const start = points[0].label
  const mid = points[Math.floor((points.length - 1) / 2)].label
  const end = points[points.length - 1].label

  return [start, mid, end]
}

function getSessionName(hour) {
  if (hour < 8) {
    return 'Asia'
  }

  if (hour < 16) {
    return 'London'
  }

  return 'New York'
}

function createTrade({ rng, index, year, monthIndex, monthStartMs, monthEndMs }) {
  const symbol = pick(rng, SYMBOLS)
  const side = rng() < 0.58 ? 'LONG' : 'SHORT'
  const type = rng() < 0.74 ? ORDER_TYPES[0] : ORDER_TYPES[1]
  const size = toFixedNumber(randomBetween(rng, symbol.sizeMin, symbol.sizeMax), symbol.sizeDigits)
  const entry = toFixedNumber(randomBetween(rng, symbol.entryMin, symbol.entryMax), 2)
  const marketMove = randomBetween(rng, -0.016, 0.026)
  const exit = toFixedNumber(entry * (1 + marketMove), 2)
  const notional = entry * size

  const grossPnl = side === 'LONG' ? (exit - entry) * size : (entry - exit) * size
  const feeRate = type === 'Market' ? randomBetween(rng, 0.00055, 0.00085) : randomBetween(rng, 0.0002, 0.00035)
  const fee = toFixedNumber(notional * feeRate, 2)
  const pnl = toFixedNumber(grossPnl - fee, 2)

  const exitAt = new Date(Math.floor(randomBetween(rng, monthStartMs, monthEndMs + 1)))
  const durationMinutes = Math.floor(randomBetween(rng, 20, 540))
  const entryAt = new Date(exitAt.getTime() - durationMinutes * 60_000)

  return {
    id: `trade-${year}-${monthIndex + 1}-${index + 1}`,
    symbol: symbol.pair,
    baseAsset: symbol.baseAsset,
    side,
    type,
    size,
    sizeDigits: symbol.sizeDigits,
    entry,
    exit,
    pnl,
    fee,
    notional,
    durationMinutes,
    entryAt,
    exitAt,
    dateTimeLabel: formatDateTimeUTC(exitAt),
  }
}

function buildTrades({ year, monthIndex, totalTrades, seed }) {
  const rng = createSeededRng(seed)
  const monthStartMs = Date.UTC(year, monthIndex, 1, 0, 0, 0)
  const monthEndMs = Date.UTC(year, monthIndex + 1, 0, 23, 59, 59)
  const trades = []

  for (let index = 0; index < totalTrades; index += 1) {
    trades.push(createTrade({ rng, index, year, monthIndex, monthStartMs, monthEndMs }))
  }

  const sortedTrades = trades.sort((a, b) => b.exitAt.getTime() - a.exitAt.getTime())
  const openCount = Math.max(3, Math.round(totalTrades * 0.08))

  return sortedTrades.map((trade, index) => ({
    ...trade,
    status: index < openCount ? 'OPEN' : 'CLOSED',
    annotation: index % 13 === 0 ? 'Scale entry and monitor fee impact before adding size.' : '',
  }))
}

function buildOrders({ trades, seed }) {
  const rng = createSeededRng(seed ^ 0x1f2e3d4c)
  const sortedByEntry = trades
    .slice()
    .sort((a, b) => b.entryAt.getTime() - a.entryAt.getTime())
    .slice(0, Math.min(96, trades.length))

  const openTarget = Math.max(4, Math.round(sortedByEntry.length * 0.14))
  const canceledTarget = Math.max(3, Math.round(sortedByEntry.length * 0.1))

  return sortedByEntry.map((trade, index) => {
    let status = 'FILLED'
    if (index < openTarget) {
      status = 'OPEN'
    } else if (index < openTarget + canceledTarget) {
      status = 'CANCELED'
    }

    const limitOffset = randomBetween(rng, -0.0045, 0.0035)
    const price = toFixedNumber(trade.entry * (1 + limitOffset), 2)
    const timeInForce = pick(rng, ['GTC', 'IOC', 'FOK'])
    const filledRatio = status === 'FILLED' ? 1 : status === 'CANCELED' ? randomBetween(rng, 0.05, 0.6) : randomBetween(rng, 0, 0.35)
    const filledSize = toFixedNumber(trade.size * filledRatio, trade.sizeDigits)

    return {
      id: `order-${trade.id}`,
      orderId: `DV-${Math.floor(randomBetween(rng, 100000, 999999))}`,
      symbol: trade.symbol,
      side: trade.side,
      type: trade.type,
      timeInForce,
      size: trade.size,
      filledSize,
      baseAsset: trade.baseAsset,
      sizeDigits: trade.sizeDigits,
      price,
      status,
      createdAt: trade.entryAt,
      dateTimeLabel: formatDateTimeUTC(trade.entryAt),
    }
  })
}

function buildTransfers({ trades, seed }) {
  const rng = createSeededRng(seed ^ 0x0a1b2c3d)
  const sortedByExitAsc = trades
    .slice()
    .sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime())

  if (sortedByExitAsc.length === 0) {
    return []
  }

  const minTime = sortedByExitAsc[0].exitAt.getTime()
  const maxTime = sortedByExitAsc[sortedByExitAsc.length - 1].exitAt.getTime()
  const totalTransfers = 18
  const transfers = []

  for (let index = 0; index < totalTransfers; index += 1) {
    const occurredAt = new Date(Math.floor(randomBetween(rng, minTime, maxTime + 1)))
    const type = pick(rng, TRANSFER_TYPES)
    const status = index < 2
      ? pick(rng, ['PENDING', 'FAILED'])
      : pick(rng, TRANSFER_STATUSES)
    const amount = type === 'DEPOSIT'
      ? toFixedNumber(randomBetween(rng, 350, 9500), 2)
      : toFixedNumber(randomBetween(rng, 120, 6200), 2)

    transfers.push({
      id: `transfer-${index + 1}`,
      transferId: `TX-${Math.floor(randomBetween(rng, 1000000, 9999999))}`,
      occurredAt,
      dateTimeLabel: formatDateTimeUTC(occurredAt),
      type,
      amount,
      status,
      asset: pick(rng, ['USDC', 'USDT', 'SOL']),
    })
  }

  return transfers.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
}

function summarizeTrades({ trades, startingEquity }) {
  const totalTrades = trades.length
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      totalVolume: 0,
      totalFees: 0,
      totalPnl: 0,
      netPnlPercent: 0,
      winRate: 0,
      longShortRatio: 0,
      averageDurationMinutes: 0,
      maxWin: 0,
      maxLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      makerFees: 0,
      takerFees: 0,
      marketRatio: 0,
      limitRatio: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      recoveryDays: 0,
    }
  }

  const totalVolume = trades.reduce((sum, trade) => sum + trade.notional, 0)
  const totalFees = trades.reduce((sum, trade) => sum + trade.fee, 0)
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const winners = trades.filter((trade) => trade.pnl > 0)
  const losers = trades.filter((trade) => trade.pnl < 0)
  const totalLongs = trades.filter((trade) => trade.side === 'LONG').length
  const totalShorts = totalTrades - totalLongs
  const totalDurationMinutes = trades.reduce((sum, trade) => sum + trade.durationMinutes, 0)
  const maxWin = Math.max(...trades.map((trade) => trade.pnl))
  const maxLoss = Math.min(...trades.map((trade) => trade.pnl))

  const grossProfit = winners.reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0))
  const averageWin = winners.length > 0 ? grossProfit / winners.length : 0
  const averageLoss = losers.length > 0 ? grossLoss / losers.length : 0

  const makerFees = trades
    .filter((trade) => trade.type === 'Limit')
    .reduce((sum, trade) => sum + trade.fee, 0)
  const takerFees = totalFees - makerFees

  const marketTrades = trades.filter((trade) => trade.type === 'Market').length
  const limitTrades = totalTrades - marketTrades

  const orderedTrades = trades.slice().sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime())
  let equity = startingEquity
  let peakEquity = startingEquity
  let peakAt = orderedTrades[0]?.exitAt ?? null
  let maxDrawdownAmount = 0
  let maxDrawdownPercent = 0
  let currentDrawdownStart = null
  let maxRecoveryDays = 0

  for (const trade of orderedTrades) {
    equity += trade.pnl

    if (equity >= peakEquity) {
      peakEquity = equity
      peakAt = trade.exitAt

      if (currentDrawdownStart) {
        const days = Math.max(1, Math.round((trade.exitAt.getTime() - currentDrawdownStart.getTime()) / DAY_MS))
        maxRecoveryDays = Math.max(maxRecoveryDays, days)
        currentDrawdownStart = null
      }

      continue
    }

    const drawdown = peakEquity - equity
    const drawdownPercent = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0

    if (!currentDrawdownStart) {
      currentDrawdownStart = peakAt ?? trade.exitAt
    }

    if (drawdown > maxDrawdownAmount) {
      maxDrawdownAmount = drawdown
      maxDrawdownPercent = drawdownPercent
    }
  }

  if (currentDrawdownStart && orderedTrades.length > 0) {
    const lastTrade = orderedTrades[orderedTrades.length - 1]
    const days = Math.max(1, Math.round((lastTrade.exitAt.getTime() - currentDrawdownStart.getTime()) / DAY_MS))
    maxRecoveryDays = Math.max(maxRecoveryDays, days)
  }

  return {
    totalTrades,
    totalVolume,
    totalFees,
    totalPnl,
    netPnlPercent: (totalPnl / startingEquity) * 100,
    winRate: (winners.length / totalTrades) * 100,
    longShortRatio: totalLongs / Math.max(totalShorts, 1),
    averageDurationMinutes: totalDurationMinutes / totalTrades,
    maxWin,
    maxLoss,
    averageWin,
    averageLoss,
    makerFees,
    takerFees,
    marketRatio: (marketTrades / totalTrades) * 100,
    limitRatio: (limitTrades / totalTrades) * 100,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
    expectancy: totalPnl / totalTrades,
    maxDrawdownAmount,
    maxDrawdownPercent,
    recoveryDays: maxRecoveryDays,
  }
}

function buildAnalytics(trades) {
  const sessionMap = {
    Asia: { name: 'Asia', trades: 0, pnl: 0 },
    London: { name: 'London', trades: 0, pnl: 0 },
    'New York': { name: 'New York', trades: 0, pnl: 0 },
  }

  const weekdayPnl = WEEKDAY_SHORT.map((label) => ({ label, pnl: 0, trades: 0 }))
  const heatmapValues = Array.from({ length: 7 }, () => Array.from({ length: HEATMAP_SLOTS.length }, () => 0))

  for (const trade of trades) {
    const hour = trade.exitAt.getUTCHours()
    const day = trade.exitAt.getUTCDay()
    const sessionName = getSessionName(hour)
    const slot = Math.floor(hour / 4)

    sessionMap[sessionName].trades += 1
    sessionMap[sessionName].pnl += trade.pnl

    weekdayPnl[day].pnl += trade.pnl
    weekdayPnl[day].trades += 1

    heatmapValues[day][slot] += 1
  }

  const sessions = Object.values(sessionMap)
  const bestDay = weekdayPnl.reduce((best, current) => (current.pnl > best.pnl ? current : best), weekdayPnl[0])
  const heatmapMax = heatmapValues.reduce((max, row) => Math.max(max, ...row), 1)

  const streakSource = trades
    .filter((trade) => trade.status === 'CLOSED')
    .slice()
    .sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime())

  let currentWin = 0
  let currentLoss = 0
  let maxWin = 0
  let maxLoss = 0

  for (const trade of streakSource) {
    if (trade.pnl >= 0) {
      currentWin += 1
      currentLoss = 0
      maxWin = Math.max(maxWin, currentWin)
    } else {
      currentLoss += 1
      currentWin = 0
      maxLoss = Math.max(maxLoss, currentLoss)
    }
  }

  return {
    sessions,
    bestDay,
    streaks: {
      currentWin,
      currentLoss,
      maxWin,
      maxLoss,
    },
    heatmap: {
      dayLabels: WEEKDAY_SHORT,
      slotLabels: HEATMAP_SLOTS,
      values: heatmapValues,
      maxValue: heatmapMax,
    },
  }
}

function buildFeeTrend(trades) {
  if (trades.length === 0) {
    return []
  }

  const feeByDay = new Map()
  for (const trade of trades) {
    const key = getDayKey(trade.exitAt)
    feeByDay.set(key, (feeByDay.get(key) ?? 0) + trade.fee)
  }

  let running = 0
  return [...feeByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, fee]) => {
      running += fee
      return {
        label: formatDayLabel(fromDayKey(dayKey)),
        value: running,
      }
    })
}

function buildDailyChart({ trades, startDate, endDate, startingEquity }) {
  const pnlByDay = new Map()
  const feeByDay = new Map()
  for (const trade of trades) {
    const key = getDayKey(trade.exitAt)
    pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + trade.pnl)
    feeByDay.set(key, (feeByDay.get(key) ?? 0) + trade.fee)
  }

  let equity = startingEquity
  let peak = startingEquity
  const points = []

  for (let dayMs = dayStartUtc(startDate); dayMs <= dayStartUtc(endDate); dayMs += DAY_MS) {
    const dayDate = new Date(dayMs)
    const dayKey = getDayKey(dayDate)
    const pnl = pnlByDay.get(dayKey) ?? 0
    const fee = feeByDay.get(dayKey) ?? 0
    equity += pnl
    peak = Math.max(peak, equity)
    const cumulativePnl = equity - startingEquity

    points.push({
      label: formatDayLabel(dayDate),
      lineValue: cumulativePnl,
      secondaryLineValue: equity,
      areaValue: peak - equity,
      feeValue: fee,
    })
  }

  return {
    lineLegend: 'Cumulative PnL',
    secondLineLegend: 'Account Equity',
    areaLegend: 'Drawdown Overlay',
    feeLegend: 'Daily Fees',
    points,
    xLabels: getXLabels(points),
    headlineLabel: 'ATH',
    headlineValue: formatAth(peak),
    headlineClass: 'text-success',
  }
}

function buildSessionChart(trades) {
  const aggregates = {
    Asia: { label: 'Asia', pnl: 0, fees: 0 },
    London: { label: 'London', pnl: 0, fees: 0 },
    'New York': { label: 'New York', pnl: 0, fees: 0 },
  }

  for (const trade of trades) {
    const name = getSessionName(trade.exitAt.getUTCHours())
    aggregates[name].pnl += trade.pnl
    aggregates[name].fees += trade.fee
  }

  const points = SESSION_LABELS.map((label) => ({
    label,
    lineValue: aggregates[label].pnl,
    areaValue: aggregates[label].fees,
    feeValue: aggregates[label].fees,
  }))
  const best = points.reduce((winner, current) => (current.lineValue > winner.lineValue ? current : winner), points[0])

  return {
    lineLegend: 'Session Net PnL',
    areaLegend: 'Session Fees',
    points,
    xLabels: getXLabels(points),
    headlineLabel: 'Best Session',
    headlineValue: `${best.label} (${formatSignedPnl(best.lineValue)})`,
    headlineClass: best.lineValue >= 0 ? 'text-success' : 'text-danger',
  }
}

function buildHodChart(trades) {
  const buckets = HOD_LABELS.map((hour) => ({ label: `${hour}:00`, pnl: 0, fees: 0 }))

  for (const trade of trades) {
    const hour = trade.exitAt.getUTCHours()
    buckets[hour].pnl += trade.pnl
    buckets[hour].fees += trade.fee
  }

  const points = buckets.map((bucket) => ({
    label: bucket.label,
    lineValue: bucket.pnl,
    areaValue: bucket.fees,
    feeValue: bucket.fees,
  }))
  const best = points.reduce((winner, current) => (current.lineValue > winner.lineValue ? current : winner), points[0])

  return {
    lineLegend: 'Hourly Net PnL',
    areaLegend: 'Hourly Fees',
    points,
    xLabels: getXLabels(points),
    headlineLabel: 'Best Hour',
    headlineValue: `${best.label} (${formatSignedPnl(best.lineValue)})`,
    headlineClass: best.lineValue >= 0 ? 'text-success' : 'text-danger',
  }
}

function buildChartModel({ trades, startDate, endDate, startingEquity, chartView }) {
  if (chartView === 'SESSION') {
    return buildSessionChart(trades)
  }

  if (chartView === 'HOD') {
    return buildHodChart(trades)
  }

  return buildDailyChart({ trades, startDate, endDate, startingEquity })
}

function parseDateInputValue(value) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}

function normalizeDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { startDate, endDate }
  }

  if (startDate.getTime() <= endDate.getTime()) {
    return { startDate, endDate }
  }

  return { startDate: endDate, endDate: startDate }
}

export function filterTradesByScope({ trades, symbol = 'ALL', startDate = null, endDate = null }) {
  return trades.filter((trade) => {
    if (symbol !== 'ALL' && trade.symbol !== symbol) {
      return false
    }

    const exitMs = trade.exitAt.getTime()
    if (startDate && exitMs < startDate.getTime()) {
      return false
    }

    if (endDate && exitMs > endDate.getTime() + (DAY_MS - 1)) {
      return false
    }

    return true
  })
}

export function createDashboardSnapshot({
  trades,
  startingEquity,
  startDateInput,
  endDateInput,
  chartView = 'DAILY',
} = {}) {
  if (!trades || trades.length === 0) {
    return {
      periodLabel: '-',
      chart: buildChartModel({
        trades: [],
        startDate: new Date(Date.UTC(2023, 0, 1)),
        endDate: new Date(Date.UTC(2023, 0, 1)),
        startingEquity,
        chartView,
      }),
      analytics: buildAnalytics([]),
      feeTrend: [],
      stats: {
        netPnl: '+0.0%',
        winRate: '0.0%',
        volume: formatUsd(0),
        fees: formatUsd(0),
        longShortRatio: '0.00',
        totalTrades: '0',
        averageDuration: '0h 0m',
        maxWin: formatUsd(0),
        maxLoss: `-${formatUsd(0)}`,
        averageWin: formatUsd(0),
        averageLoss: formatUsd(0),
        netPnlValue: 0,
      },
      feeBreakdown: { maker: 0, taker: 0 },
      orderTypeBreakdown: { market: 0, limit: 0 },
      risk: {
        profitFactor: 0,
        expectancy: 0,
        maxDrawdownAmount: 0,
        maxDrawdownPercent: 0,
        recoveryDays: 0,
      },
    }
  }

  const latestTrade = trades.reduce((latest, trade) => (trade.exitAt > latest.exitAt ? trade : latest), trades[0])
  const earliestTrade = trades.reduce((earliest, trade) => (trade.exitAt < earliest.exitAt ? trade : earliest), trades[0])
  const parsedStart = parseDateInputValue(startDateInput) ?? new Date(dayStartUtc(earliestTrade.exitAt))
  const parsedEnd = parseDateInputValue(endDateInput) ?? new Date(dayStartUtc(latestTrade.exitAt))
  const { startDate, endDate } = normalizeDateRange(parsedStart, parsedEnd)

  const summary = summarizeTrades({ trades, startingEquity })
  const chart = buildChartModel({ trades, startDate, endDate, startingEquity, chartView })
  const analytics = buildAnalytics(trades)
  const feeTrend = buildFeeTrend(trades)

  return {
    periodLabel: formatPeriodLabel(startDate, endDate),
    chart,
    analytics,
    feeTrend,
    stats: {
      netPnl: `${summary.netPnlPercent >= 0 ? '+' : ''}${summary.netPnlPercent.toFixed(1)}%`,
      winRate: `${summary.winRate.toFixed(1)}%`,
      volume: formatCompactUsd(summary.totalVolume),
      fees: formatUsd(summary.totalFees),
      longShortRatio: summary.longShortRatio.toFixed(2),
      totalTrades: String(summary.totalTrades),
      averageDuration: formatDuration(summary.averageDurationMinutes),
      maxWin: formatCompactUsd(summary.maxWin),
      maxLoss: `-${formatCompactUsd(Math.abs(summary.maxLoss))}`,
      averageWin: formatCompactUsd(summary.averageWin),
      averageLoss: formatCompactUsd(summary.averageLoss),
      netPnlValue: summary.netPnlPercent,
    },
    feeBreakdown: {
      maker: summary.makerFees,
      taker: summary.takerFees,
    },
    orderTypeBreakdown: {
      market: summary.marketRatio,
      limit: summary.limitRatio,
    },
    risk: {
      profitFactor: summary.profitFactor,
      expectancy: summary.expectancy,
      maxDrawdownAmount: summary.maxDrawdownAmount,
      maxDrawdownPercent: summary.maxDrawdownPercent,
      recoveryDays: summary.recoveryDays,
    },
  }
}

export function createDashboardMockData({ year = 2023, monthIndex = 9, totalTrades = 142, seed = 20231001 } = {}) {
  const startingEquity = 35000
  const trades = buildTrades({ year, monthIndex, totalTrades, seed })
  const orders = buildOrders({ trades, seed })
  const transfers = buildTransfers({ trades, seed })
  const sortedByTimeAsc = trades.slice().sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime())
  const startDate = sortedByTimeAsc[0].exitAt
  const endDate = sortedByTimeAsc[sortedByTimeAsc.length - 1].exitAt
  const availableSymbols = [...new Set(trades.map((trade) => trade.symbol))].sort()

  return {
    modeLabel: 'Normal',
    symbolFilterLabel: 'All Symbols',
    startingEquity,
    defaultDateStart: `${startDate.getUTCFullYear()}-${pad2(startDate.getUTCMonth() + 1)}-${pad2(startDate.getUTCDate())}`,
    defaultDateEnd: `${endDate.getUTCFullYear()}-${pad2(endDate.getUTCMonth() + 1)}-${pad2(endDate.getUTCDate())}`,
    availableSymbols,
    tools: {
      chatgptUrl: 'https://chat.openai.com/',
      claudeUrl: 'https://claude.ai/',
    },
    table: {
      totalTrades: trades.length,
      trades,
      orders,
      transfers,
    },
  }
}

export function formatPrice(value) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatTradeSize(size, baseAsset, digits) {
  return `${Number(size).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${baseAsset}`
}

export function formatSignedPnl(value) {
  return formatSignedUsd(value, 2)
}

export function formatFee(value) {
  return formatUsd(value, 2)
}

export function formatAth(value) {
  return formatUsd(value, 2)
}

export function formatCompactValue(value) {
  return formatCompactUsd(value)
}
