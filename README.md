# Deriverse Trading Analytics Dashboard

Comprehensive analytics dashboard and trading journal built for the Deriverse bounty.

## Overview

This project delivers a professional single-route dashboard for active traders with:

- Performance tracking (PnL, win rate, volume, fees, L/S ratio, trade count, duration)
- Time analytics (daily, session, and hour-of-day chart modes)
- Risk analytics (profit factor, expectancy, max drawdown, recovery duration)
- Execution analytics (maker/taker fee split, order type mix)
- Journal workflow (trade table + editable notes persisted in local storage)
- Workflow tools (position sizing calculator + CSV/PDF export)

## Tech Stack

- React + Vite
- Tailwind CSS
- Deterministic seeded mock data generator

## Local Development

```bash
npm install
npm run dev
```

Build production bundle:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Feature Coverage (Bounty Scope)

- Total PnL tracking with visual indicators
- Trading volume and fee analysis
- Win rate and trade count metrics
- Average trade duration
- Long/short ratio
- Largest gain/loss and average win/loss
- Symbol filtering and date range controls
- Historical performance chart with drawdown (daily mode)
- Session and time-of-day analysis (chart mode toggle + analytics cards)
- Trade history table with annotation editing
- Fee composition and cumulative fee trend
- Order type performance analysis

## Data + Calculation Notes

- All metrics are recomputed from filtered trades (symbol/date scope aware).
- Notes are persisted in `localStorage` under `deriverse.notes.v1`.
- Mock data is deterministic by seed for repeatable demos.

## Project Structure

- `src/App.jsx` - dashboard UI and interaction logic
- `src/data/mockDashboardData.js` - mock generator + analytics/risk/summary model
- `docs/SPEC.md` - product scope and delivery phases
- `docs/issues/*.md` - implementation issues and milestone specs

## Submission Checklist

- Public GitHub repository link
- Social profile link (for example, X/Twitter)
- Short demo video/gif showing:
  - Filtering by date and symbol
  - Daily/Session/HOD chart switching
  - Note editing persistence
  - Position sizing calculation
  - CSV/PDF export
