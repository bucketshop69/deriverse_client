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
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_SLOTS = ['00-03', '04-07', '08-11', '12-15', '16-19', '20-23']

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

function getMonthShortLabel(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  })
}

function toFixedNumber(value, digits = 2) {
  return Number(value.toFixed(digits))
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

function buildChartData({ year, monthIndex, trades, startingEquity }) {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const monthShort = getMonthShortLabel(year, monthIndex)
  const dailyPnl = new Array(daysInMonth).fill(0)

  for (const trade of trades) {
    const day = trade.exitAt.getUTCDate()
    dailyPnl[day - 1] += trade.pnl
  }

  let equity = startingEquity
  let peakEquity = startingEquity

  const points = dailyPnl.map((pnl, dayIndex) => {
    equity += pnl
    peakEquity = Math.max(peakEquity, equity)

    return {
      day: dayIndex + 1,
      pnl,
      equity,
      drawdown: peakEquity - equity,
      label: `${monthShort} ${String(dayIndex + 1).padStart(2, '0')}`,
    }
  })

  return {
    points,
    ath: peakEquity,
    xLabels: [
      `${monthShort} ${String(1).padStart(2, '0')}`,
      `${monthShort} ${String(Math.ceil(daysInMonth / 2)).padStart(2, '0')}`,
      `${monthShort} ${String(daysInMonth).padStart(2, '0')}`,
    ],
  }
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
  const heatmapMax = heatmapValues.reduce(
    (max, row) => Math.max(max, ...row),
    1,
  )

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

function summarizeTrades({ trades, startingEquity }) {
  const totalTrades = trades.length
  const totalVolume = trades.reduce((sum, trade) => sum + trade.notional, 0)
  const totalFees = trades.reduce((sum, trade) => sum + trade.fee, 0)
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const totalWins = trades.filter((trade) => trade.pnl > 0).length
  const totalLongs = trades.filter((trade) => trade.side === 'LONG').length
  const totalShorts = totalTrades - totalLongs
  const totalDurationMinutes = trades.reduce((sum, trade) => sum + trade.durationMinutes, 0)
  const maxWin = Math.max(...trades.map((trade) => trade.pnl))
  const maxLoss = Math.min(...trades.map((trade) => trade.pnl))

  const makerFees = trades
    .filter((trade) => trade.type === 'Limit')
    .reduce((sum, trade) => sum + trade.fee, 0)
  const takerFees = totalFees - makerFees

  const marketTrades = trades.filter((trade) => trade.type === 'Market').length
  const limitTrades = totalTrades - marketTrades

  return {
    totalTrades,
    totalVolume,
    totalFees,
    totalPnl,
    netPnlPercent: (totalPnl / startingEquity) * 100,
    winRate: (totalWins / totalTrades) * 100,
    longShortRatio: totalLongs / Math.max(totalShorts, 1),
    averageDurationMinutes: totalDurationMinutes / totalTrades,
    maxWin,
    maxLoss,
    makerFees,
    takerFees,
    marketRatio: (marketTrades / totalTrades) * 100,
    limitRatio: (limitTrades / totalTrades) * 100,
  }
}

export function createDashboardMockData({ year = 2023, monthIndex = 9, totalTrades = 142, seed = 20231001 } = {}) {
  const startingEquity = 35000
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const monthShort = getMonthShortLabel(year, monthIndex)
  const trades = buildTrades({ year, monthIndex, totalTrades, seed })
  const summary = summarizeTrades({ trades, startingEquity })
  const chart = buildChartData({ year, monthIndex, trades, startingEquity })
  const analytics = buildAnalytics(trades)

  return {
    periodLabel: `${monthShort} 1 - ${monthShort} ${daysInMonth}, ${year}`,
    modeLabel: 'Normal',
    symbolFilterLabel: 'All Symbols',
    chart,
    analytics,
    tools: {
      chatgptUrl: 'https://chat.openai.com/',
      claudeUrl: 'https://claude.ai/',
    },
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
      netPnlValue: summary.netPnlPercent,
      feeValue: summary.totalFees,
    },
    feeBreakdown: {
      maker: summary.makerFees,
      taker: summary.takerFees,
    },
    orderTypeBreakdown: {
      market: summary.marketRatio,
      limit: summary.limitRatio,
    },
    table: {
      totalTrades: trades.length,
      trades,
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
