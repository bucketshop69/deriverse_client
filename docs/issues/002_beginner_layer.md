# Issue 002: Beginner Layer (Single-Route Dashboard)

## Overview

Implement the first Beginner Layer milestone from `docs/SPEC.md` on the existing single-route dashboard (`/`) without adding new routes or sidebar architecture.

## Scope

- Beginner Mode Toggle
- Simplified View
- Metric Tooltips
- Daily Goal Tracker
- Daily Trade Limit Warning

## Constraints

- Keep current dashboard layout as the base foundation.
- All work must stay inside the same route.
- No regressions to existing baseline stats/chart/table behavior.

## Implementation Instructions

### 1. Beginner State and Preferences

- Add tier and beginner-preference state in app/store:
  - `tier: 'beginner' | 'intermediate' | 'expert'`
  - `dailyGoalAmount`
  - `dailyTradeLimit`
- Persist preferences locally for now.
- Treat beginner mode as derived state: `tier === 'beginner'`.

### 2. Beginner Mode Toggle

- Keep control in current dashboard header for now.
- Use a tier control (or temporary switch-to-beginner control) to activate beginner behavior.
- When `tier === 'beginner'`, hide advanced/complex panels and show simplified widgets.
- Changes must be instant and reversible.

### 3. Simplified View

- Provide a lightweight beginner view with only essential information:
  - key metrics
  - goal progress
  - reduced trade table complexity

### 4. Metric Tooltips

- Add glossary tooltips for core metrics (PnL, win rate, drawdown, fees, L/S ratio, etc.).
- Tooltip language must stay simple and educational.

### 5. Daily Goal Tracker

- Allow setting a daily pnl goal.
- Show progress, remaining amount, and completion state.
- Reset logic should follow current day boundary.

### 6. Daily Trade Limit Warning

- Build the daily trade-count signal from current filtered trades.
- Show warning card with 3 states:
  - Normal
  - Near limit
  - Limit exceeded
- Use clear, non-technical copy.

## Acceptance Criteria

1. Tier-based beginner activation (`tier === 'beginner'`), Simplified View, Metric Tooltips, Daily Goal Tracker, and Daily Trade Limit Warning are present in the single route.
2. Beginner mode reduces complexity without breaking baseline data integrity.
3. Goal tracker and trade-limit warning behave correctly across day changes.
4. Tooltips exist for key metrics and use beginner-oriented language.
5. No console errors and no visual regressions in baseline dashboard.

## Out of Scope

- Risk Alerts and Post-Trade Tips (deferred to follow-up issue).
- Intermediate and Expert feature implementation.
- Multi-route navigation changes.
- Backend persistence/API integration.

## Non-Coding Implementation Plan (Current Status)

### Current Status Snapshot

- Single-route dashboard foundation is already implemented.
- Baseline stats, chart, and trade table are visible and working.
- Mock data is available and sufficient for beginner-first UI behavior testing.
- Tier model is defined as `beginner | intermediate | expert`.

### Delivery Plan Without Code Details

1. Align UX behavior and states

- Finalize what changes visually when tier is `beginner`.
- Confirm which existing widgets are considered advanced vs essential.
- Confirm copy tone for beginner-facing labels and hints.

1. Define beginner experience map

- Decide exact placement of the beginner activation control in the current header.
- Define simplified view layout (what stays, what hides, what gets condensed).
- Define tooltip coverage list for key baseline metrics.

1. Define user preference decisions

- Confirm default values for:
  - daily goal amount
  - daily trade limit
  - default tier during local testing
- Confirm persistence expectation for these preferences per browser session/device.

1. Validate warning and goal behavior rules

- Confirm rule thresholds for trade-limit states: normal / near / exceeded.
- Confirm daily reset boundary behavior (calendar-day logic).
- Confirm acceptance behavior for edge cases (no trades, no goal set, negative pnl day).

1. UX review pass before coding completion

- Review clarity of simplified view and tooltip language.
- Verify beginner flow remains understandable without onboarding docs.
- Check that baseline dashboard quality is not reduced for non-beginner tiers.

1. Pre-release checklist for this issue

- Functional walkthrough in beginner tier.
- Visual regression check against current baseline dashboard.
- Quick product sign-off on copy, thresholds, and simplified layout.

## Priority

High
