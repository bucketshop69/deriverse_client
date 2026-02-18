# Issue 001: Initial Dashboard Layout - Two-Column Trading Journal View

## Overview

Build the initial dashboard screen for the Deriverse Trading Analytics Dashboard. This is the main landing page that displays a trader's key metrics and trade history in a two-column layout.

## Design Reference

See attached HTML mockup in the issue description or reference the design file.

## Requirements

### Layout Structure

- **Header (h-12)**
  - Logo + "DERIVERSE" title (left)
  - Tier selector button showing "Intermediate" with dropdown chevron (left-center)
  - Date range picker: "Oct 1 - Oct 31, 2023" (right-center)
  - Filter dropdown: "All Symbols" (right-center)
  - User avatar (right) - circular, 32x32px

- **Stats Panel (col-span-4)**
  - Two-column grid layout with 8 metric rows:
    1. Net PnL: +14.2% (green)
    2. Win Rate: 68.0%
    3. Volume: $1.24M
    4. Fees: $450.12 (red)
    5. L/S Ratio: 1.22
    6. Total Trades: 142
    7. Avg Duration: 4h 20m
    8. Max Win/Loss: $2.4k (green) / -$1.1k (red)
  - Each row: label (uppercase, 10px, secondary text) + value (mono, 14px, bold)
  - Background: #0D0D0F with #1A1A1A dividers

- **Main Content Panel (col-span-8)**
  - Section title: "Equity Curve & Drawdown" (uppercase, 12px, bold)
  - Legend:
    - Cyan dot (#0ddbf2) + "Cumulative PnL"
    - Red dot (rgba) + "Drawdown Overlay"
  - ATH label: "$42,500.00" (top-right, mono, green)
  - SVG chart area: ~180px height
    - Area path for drawdown (red, 5% opacity)
    - Line path for equity curve (cyan stroke)
    - Horizontal dashed reference lines at y=40, 90, 130
    - X-axis labels: "Oct 01", "Oct 14", "Oct 31" (bottom)
  - Toggle buttons (Daily/Session/HOD) - "Daily" active with cyan bg
  - Fee breakdown: Maker $120 (green) / Taker $330 (red)
  - Order Types bar: "Mkt/Lim: 75% / 25%" with progress bar

- **Trade History Table (full width below)**
  - Columns: Date/Time, Symbol, Side, Type, Size, Entry, Exit, PnL, Fee, Action
  - Row styling:
    - Hover: slight background change
    - Side badges: "LONG" (green bg), "SHORT" (red bg)
    - PnL: green for profit, red for loss
  - Sample data:
    - BTC/USDT LONG Market 1.2 BTC @ 29,450 → 30,120 = +$670
    - ETH/USDT SHORT Limit 15 ETH @ 1,850.25 → 1,820.10 = +$452.25
    - SOL/USDT LONG Market 250 SOL @ 32.40 → 31.10 = -$325
  - Pagination footer:
    - "Showing 1-50 of 142 Trades"
    - Live synced indicator (green dot)
    - Page navigation: Previous | 01 02 03 | Next

### Visual Specifications

- **Colors**
  - Background: #0D0D0F
  - Surface: #1A1A1A
  - Primary accent: #0ddbf2 (cyan)
  - Success/Profit: #00C087 (green)
  - Danger/Loss: #FF3B30 (red)
  - Secondary text: #666666
  - Text: #FFFFFF

- **Typography**
  - Font family: "Space Grotesk" (display), "JetBrains Mono" (numbers/code)
  - Headings: 10-14px, uppercase, bold, tracking-wide
  - Body: 10-12px
  - Numbers: monospace

- **Spacing**
  - Header: h-12 (48px)
  - Panel padding: 16px (p-4)
  - Table cells: px-4 py-2
  - Gap between grid: 1px (border effect)

### Functionality

- Date range dropdown - shows selected range (visual only for now)
- Filter dropdown - "All Symbols" (visual only for now)
- Tier selector - "Intermediate" with dropdown (visual only for now)
- Toggle buttons - Daily/Session/HOD switch (visual only for now)
- "Annotate" button per row (no functionality required)
- Pagination controls (no functionality required)
- User avatar (static image)

### Mock Data Requirements

Generate realistic mock data for:
- 50 visible trades in the table
- 142 total trades (for pagination)
- Chart data for Oct 1-31 period
- Stats panel values matching the design

## Acceptance Criteria

1. ✅ Page matches the design mockup exactly
2. ✅ All colors match the specified hex values
3. ✅ Typography uses Space Grotesk + JetBrains Mono
4. ✅ Trade table displays 3+ sample trades with proper formatting
5. ✅ Side badges show correct colors (green=long, red=short)
6. ✅ PnL values colored appropriately (green=profit, red=loss)
7. ✅ Responsive: works on 1024px+ width screens
8. ✅ No console errors on load

## Technical Notes

- Use Tailwind CSS for styling (already configured)
- No external chart libraries needed - use inline SVG for the equity curve
- Mock data can be hardcoded or generated with faker
- This is Phase 2 of the development roadmap

## Priority

**High** - This is the core landing page and foundation for all other features
