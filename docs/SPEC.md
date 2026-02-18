# Deriverse Trading Analytics Dashboard - Specification

## 1. Project Overview

**Project Name:** Deriverse Trading Analytics Dashboard  
**Type:** React Web Application (Vite + React)  
**Purpose:** A comprehensive trading journal and portfolio analytics solution for the Deriverse Solana trading ecosystem  
**Target Users:** Traders of all experience levels (beginner to expert)

---

## 2. Core Requirements (Bounty Baseline)

All traders see these features regardless of tier:

| Feature | Description |
|---------|-------------|
| Total PnL | Net profit/loss with visual indicators (green/red, % change) |
| Trading Volume | Total volume traded in period |
| Fee Analysis | Complete fee breakdown |
| Win Rate | Percentage of profitable trades |
| Trade Count | Total trades executed |
| Average Trade Duration | Mean time positions are held |
| Long/Short Ratio | Directional bias visualization |
| Largest Gain | Biggest single winning trade |
| Largest Loss | Biggest single losing trade |
| Average Win/Loss | Mean amounts for wins and losses |
| Symbol Filtering | Filter by trading pair |
| Date Range Selection | Select custom date ranges |
| Historical PnL Chart | Line chart with drawdown visualization |
| Daily Performance | Day-by-day PnL breakdown |
| Session Analysis | Asia/London/NY session performance |
| Time-of-Day Analysis | Performance by hour |
| Trade History Table | Full list with all trade details |
| Trade Annotations | Add notes to individual trades |
| Fee Composition | Breakdown by fee type |
| Cumulative Fees | Running total of fees paid |
| Order Type Performance | Market vs Limit vs Stop analysis |

---

## 3. Trader Tiers System

### 3.1 Tier Definitions

| Tier | Experience | Icon | Color |
|------|------------|------|-------|
| Beginner | 0-1 years | 🌍 | #10B981 (Green) |
| Intermediate | 2-4 years | ⚡ | #F59E0B (Amber) |
| Expert | 5+ years | 👑 | #8B5CF6 (Purple) |

### 3.2 Beginner Extras (🌍)

| Feature | Description |
|---------|-------------|
| Daily Trade Limit Warning | Alert when exceeding safe daily limits |
| Risk Alerts | "You've traded 10x today" style warnings |
| Post-Trade Tips | Simple insights after each trade |
| Beginner Mode Toggle | Hides complex charts/metrics |
| Metric Tooltips | Hover explanations for all terms |
| Daily Goal Tracker | Set and track daily PnL goals |
| Simplified View | Shows only essential metrics |

### 3.3 Intermediate Extras (⚡)

| Feature | Description |
|---------|-------------|
| Session Analysis | Asia/London/NY session performance breakdown |
| Symbol Correlation | Cross-symbol performance comparison |
| Best Day Analysis | Which day of week performs best |
| Trade Frequency Heatmap | Visual of trading activity by hour/day |
| Risk/Reward Ratio | Per-symbol R:R analysis |
| Breakeven Analysis | Win rate needed to breakeven |
| Win Streak Counter | Consecutive winning trades |
| Loss Streak Counter | Consecutive losing trades |

### 3.4 Expert Extras (👑)

| Feature | Description |
|---------|-------------|
| Customizable Widgets | Drag-and-drop dashboard layout |
| Position Sizing Calculator | Input risk% → get position size |
| Kelly Criterion | Optimal position sizing recommendation |
| Custom Date Presets | Save favorite date ranges |
| CSV/PDF Export | Download reports for tax/accounting |
| Advanced Drawdown Tools | Max DD %, recovery time analysis |
| Multi-timeframe Analysis | 1H/4H/D1/W1 performance |
| White-label Hooks | API endpoints for custom integration |
| Advanced Annotations | Rich text notes on trades |
| Benchmark Comparison | Compare vs BTC/ETH/SOL performance |

---

## 4. Caps (Achievements) System

### 4.1 Cap Categories

| Cap Name | Requirement | Tier |
|----------|-------------|------|
| First Trade | Complete first logged trade | All |
| 10 Trades | Log 10 trades | All |
| 50 Trades | Log 50 trades | All |
| 100 Trades | Log 100 trades | All |
| Week Winner | Profitable 5 days straight | Beginner |
| Month Master | Profitable 20 days in a month | Beginner |
| 60% Club | Maintain 60% win rate | Beginner |
| Consistency King | 70% win rate over 50+ trades | Intermediate |
| Volume Veteran | $100K total volume | Intermediate |
| Fee Saver | Below 1% avg fees in month | Intermediate |
| Streak Legend | 10 winning trades in a row | Intermediate |
| Deep Pockets | $1M total volume | Expert |
| Elite Trader | 80% win rate over 100+ trades | Expert |
| Low Drawdown | <5% max drawdown | Expert |
| All-Rounder | Profitable in 10+ symbols | Expert |

### 4.2 Cap Display

- Badge icons next to profile
- Progress bars for in-progress caps
- Unlock animations
- Cap showcase on profile page

---

## 5. Data Model

### 5.1 Trade Schema

```typescript
interface Trade {
  id: string;
  symbol: string;           // e.g., "SOL-PERP", "BTC-PERP"
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  size: number;             // Notional value
  leverage: number;         // e.g., 1, 2, 5, 10
  entryTime: Date;
  exitTime: Date;
  pnl: number;              // Net PnL after fees
  fees: number;             // Total fees paid
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit';
  status: 'open' | 'closed';
  annotation?: string;      // User note
  tags?: string[];          // e.g., ["news", "setup-breakout"]
  slippage?: number;        // Execution slippage
}
```

### 5.2 User Profile Schema

```typescript
interface UserProfile {
  id: string;
  tier: 'beginner' | 'intermediate' | 'expert';
  displayName: string;
  caps: string[];           // Unlocked cap IDs
  preferences: {
    beginnerMode: boolean;
    theme: 'dark' | 'light';
    defaultDateRange: string;
  };
  stats: {
    totalTrades: number;
    totalVolume: number;
    totalFees: number;
  };
}
```

---

## 6. UI/UX Approach

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | Tier Badge | User | Settings           │
├────────────┬────────────────────────────────────────────┤
│            │  Dashboard Grid                            │
│  Sidebar   │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│            │  │ Total   │ │ Win     │ │ Volume  │       │
│  - Overview│  │ PnL     │ │ Rate    │ │ Chart   │       │
│  - Trades  │  └─────────┘ └─────────┘ └─────────┘       │
│  - Analytics│ ┌─────────────────────┐ ┌─────────┐       │
│  - Caps    │  │ Historical PnL     │ │ Long/   │       │
│  - Settings│  │ Chart + Drawdown   │ │ Short   │       │
│            │  └─────────────────────┘ └─────────┘       │
│            │  ┌─────────────────────────────────┐      │
│            │  │ Trade History Table              │      │
│            │  │ (with annotations)               │      │
│            │  └─────────────────────────────────┘      │
└────────────┴────────────────────────────────────────────┘
```

### 6.2 Theme

- **Primary:** Dark mode default (trading terminal aesthetic)
- **Accent Colors:**
  - Profit: #10B981 (Green)
  - Loss: #EF4444 (Red)
  - Neutral: #6B7280 (Gray)
- **Tier Colors:** Green → Amber → Purple progression

### 6.3 Responsiveness

- Desktop-first (traders use big screens)
- Tablet support for mobile review
- Collapsible sidebar on smaller screens

---

## 7. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| State | Zustand (lightweight) |
| Charts | Recharts or Lightweight Charts |
| Tables | TanStack Table |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Date Handling | date-fns |
| Mock Data | Faker.js or custom generators |

---

## 8. Development Phases

### Phase 1: Foundation

- [ ] Project setup (Vite + React + Tailwind)
- [ ] Mock data generation (500+ trades)
- [ ] Basic layout + routing
- [ ] Core components (Card, Button, Badge)

### Phase 2: Core Dashboard

- [ ] Total PnL + visual indicators
- [ ] Win rate + trade count
- [ ] Basic trade history table
- [ ] Symbol/date filters

### Phase 3: Analytics

- [ ] Volume + fee charts
- [ ] Long/short ratio
- [ ] Historical PnL chart
- [ ] Time-based metrics

### Phase 4: Tier System

- [ ] Tier detection/selection UI
- [ ] Beginner mode toggle
- [ ] Tier-specific widgets
- [ ] Adaptive dashboard

### Phase 5: Caps System

- [ ] Achievement definitions
- [ ] Progress tracking
- [ ] Badge display
- [ ] Unlock animations

### Phase 6: Polish

- [ ] Animations + transitions
- [ ] Responsive fixes
- [ ] Performance optimization
- [ ] Documentation

---

## 9. Future Considerations (Post-Bounty)

- AI-powered trade insights
- Real-time Solana data integration
- Mobile app
- Social trading features
- API for external integrations
