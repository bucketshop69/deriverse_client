# Deriverse Trading Analytics Dashboard - Specification

## 1. Project Overview

**Project Name:** Deriverse Trading Analytics Dashboard  
**Type:** React Web Application (Vite + React)  
**Purpose:** A comprehensive trading journal and portfolio analytics solution for the Deriverse Solana trading ecosystem  
**Primary Release Direction:** Normal Mode first (single-route dashboard)

### Product Direction (Current)

- Ship a strong **Normal Mode** first.
- Defer Beginner/Intermediate/Expert mode gating until after Normal Mode is complete.
- Keep the app as a **single-route dashboard (`/`)** for the current phase.

---

## 2. Normal Mode Feature Set (Current Scope)

### 2.1 Core Performance Snapshot

| Feature | Description |
|---------|-------------|
| Total PnL | Net profit/loss with visual indicators (green/red, % change) |
| Trading Volume | Total volume traded in period |
| Win Rate | Percentage of profitable trades |
| Trade Count | Total trades executed |
| Average Trade Duration | Mean time positions are held |
| Long/Short Ratio | Directional bias visualization |
| Largest Gain | Biggest single winning trade |
| Largest Loss | Biggest single losing trade |
| Average Win/Loss | Mean amounts for wins and losses |
| Win/Loss Streak Counters | Consecutive wins and losses in the selected period |

### 2.2 Filters and Scope Controls

| Feature | Description |
|---------|-------------|
| Symbol Filtering | Filter by trading pair |
| Date Range Selection | Select custom date ranges |

### 2.3 Performance Analytics

| Feature | Description |
|---------|-------------|
| Historical PnL Chart | Line chart with drawdown visualization |
| Daily Performance | Day-by-day PnL breakdown |
| Session Analysis | Asia/London/NY session performance |
| Time-of-Day Analysis | Performance by hour |
| Best Day Analysis | Best performing weekday insight |
| Trade Frequency Heatmap | Trading activity by day/hour |

### 2.4 Cost and Execution Analytics

| Feature | Description |
|---------|-------------|
| Fee Analysis | Complete fee breakdown |
| Fee Composition | Breakdown by fee type |
| Cumulative Fees | Running total of fees paid |
| Order Type Performance | Market vs Limit vs Stop analysis |

### 2.5 Trade Journal

| Feature | Description |
|---------|-------------|
| Trade History Table | Full list with all trade details |
| Trade Annotations | Add notes to individual trades |
| Open Trade Note Entry | Open trades can be direct note-entry points |

### 2.6 Trader Tools and Actions

| Feature | Description |
|---------|-------------|
| Position Sizing Calculator | Input risk% and sizing assumptions |
| CSV/PDF Export | Download reports for review/accounting |
| Ask AI | Redirect user to ChatGPT/Claude for deeper analysis context |

---

## 3. Caps (Achievements) System

### 3.1 Cap Categories

| Cap Name | Requirement | Scope |
|----------|-------------|-------|
| First Trade | Complete first logged trade | Normal Mode |
| 10 Trades | Log 10 trades | Normal Mode |
| 50 Trades | Log 50 trades | Normal Mode |
| 100 Trades | Log 100 trades | Normal Mode |
| Week Winner | Profitable 5 days straight | Normal Mode |
| Month Master | Profitable 20 days in a month | Normal Mode |
| 60% Club | Maintain 60% win rate | Normal Mode |
| Consistency King | 70% win rate over 50+ trades | Normal Mode |
| Volume Veteran | $100K total volume | Normal Mode |
| Fee Saver | Below 1% avg fees in month | Normal Mode |
| Streak Legend | 10 winning trades in a row | Normal Mode |
| Deep Pockets | $1M total volume | Normal Mode |
| Elite Trader | 80% win rate over 100+ trades | Normal Mode |
| Low Drawdown | <5% max drawdown | Normal Mode |
| All-Rounder | Profitable in 10+ symbols | Normal Mode |

### 3.2 Cap Display

- Badge icons next to profile
- Progress bars for in-progress caps
- Unlock animations
- Cap showcase on profile page

---

## 4. Data Model

### 4.1 Trade Schema

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
  annotation?: string;      // User note (including open-trade notes)
  tags?: string[];
  slippage?: number;
}
```

### 4.2 User Profile Schema

```typescript
interface UserProfile {
  id: string;
  displayName: string;
  preferences: {
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

## 5. UI/UX Approach

### 5.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Date | Filters | Mode Label | User      │
├─────────────────────────────────────────────────────────┤
│ Core Performance + Analytics Panels                     │
├─────────────────────────────────────────────────────────┤
│ Trade Journal Table + Notes + Pagination               │
├─────────────────────────────────────────────────────────┤
│ Tools Row (Sizing, Export, Ask AI)                     │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Theme

- **Primary:** Dark mode default (trading terminal aesthetic)
- **Accent Colors:**
  - Profit: #10B981 (Green)
  - Loss: #EF4444 (Red)
  - Neutral: #6B7280 (Gray)

### 5.3 Responsiveness

- Desktop-first (traders use big screens)
- Tablet support for mobile review
- Progressive disclosure on smaller screens

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React + Vite |
| State | Zustand (lightweight) |
| Charts | Recharts or Lightweight Charts |
| Tables | TanStack Table |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Date Handling | date-fns |
| Mock Data | Faker.js or custom generators |

---

## 7. Development Phases (Normal Mode)

### Phase 1: Foundation

- [x] Project setup (Vite + React + Tailwind)
- [x] Single-route dashboard base layout
- [x] Initial mock data and dashboard rendering
- [ ] Expand mock data generation (500+ trades)

### Phase 2: Core Performance and Filters

- [ ] Total PnL, volume, win rate, trade count, duration
- [ ] Long/short ratio, largest gain/loss, average win/loss
- [ ] Symbol filtering and date range controls

### Phase 3: Analytics Layer

- [ ] Historical PnL + drawdown chart
- [ ] Daily performance
- [ ] Session analysis
- [ ] Time-of-day analysis
- [ ] Best day analysis
- [ ] Trade frequency heatmap
- [ ] Win/loss streak counters

### Phase 4: Cost, Execution, and Journal

- [ ] Fee analysis + composition + cumulative fees
- [ ] Order type performance
- [ ] Trade history table refinements
- [ ] Trade annotations (including open-trade note entry points)

### Phase 5: Tools and Actions

- [ ] Position sizing calculator
- [ ] CSV/PDF export
- [ ] Ask AI redirect (ChatGPT/Claude)

### Phase 6: Caps and Polish

- [ ] Achievement definitions and progress tracking
- [ ] Badge display and unlock animations
- [ ] Responsive and performance fixes
- [ ] Documentation updates

---

## 8. Future Considerations (Post-Normal Mode)

- Re-introduce multi-level experience modes (Beginner/Intermediate/Expert) if needed
- AI-powered native insights beyond external redirect
- Real-time Solana data integration
- Mobile app
- Social trading features
- API for external integrations
