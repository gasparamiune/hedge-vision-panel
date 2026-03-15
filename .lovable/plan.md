

# Major Dashboard Overhaul

This is a large update touching nearly every component. I'll break it into the key files to create/modify.

## Architecture

```text
src/
├── hooks/
│   └── use-dashboard-data.ts    ← add "portfolio" tab, "paper_trades" table, asset class filter state
├── components/
│   ├── DashboardHeader.tsx      ← add asset class filter (ALL/CRYPTO/STOCK), LIVE/STALE indicator, auto-refresh 60s
│   ├── DataTable.tsx            ← refactor into tab-specific renderers
│   ├── PortfolioTab.tsx         ← NEW: paper_trades table + summary bar
│   ├── OpportunitiesTab.tsx     ← NEW: verdict badge, confidence %, expandable reasons, source_scores bar chart
│   ├── SignalsTab.tsx           ← NEW: agent color dots, expandable reasoning from metadata_json
│   ├── DecisionsTab.tsx         ← NEW: PDF download button, agent_count badge, row highlights
│   └── SystemStatusTab.tsx      ← NEW: renamed from "runs", live dot, avg metrics, bar chart
├── pages/
│   └── Index.tsx                ← wire new tabs, pass assetClassFilter, default to "portfolio"
```

## Changes by File

### 1. `src/hooks/use-dashboard-data.ts`
- Add `portfolio` to `TabKey` union and `DashboardData` interface
- Add `paper_trades` to `TABLE_MAP`
- Tab order: `["portfolio", "decisions", "opportunities", "signals", "status"]`
- Rename `runs` key to `status` (still maps to `agent_runs` table)
- Add `assetClassFilter` state (`"ALL" | "CRYPTO" | "STOCK"`) and a filtering function that filters rows by `asset_class` field across all tabs
- Auto-refresh via `useEffect` with 60s `setInterval`, track `lastRefreshTime`

### 2. `src/components/DashboardHeader.tsx`
- Update tab list to: `["portfolio", "decisions", "opportunities", "signals", "status"]`
- Display "status" tab label as "SYSTEM STATUS"
- Add asset class filter buttons: ALL / CRYPTO / STOCK as pill toggles
- Add LIVE/STALE indicator: green dot + "LIVE" if `lastRefreshTime` < 2 min ago, red dot + "STALE" otherwise
- Show relative last refresh time (e.g. "12s ago")
- Props: add `assetClassFilter`, `onAssetClassFilterChange`, `lastRefreshTime`

### 3. `src/components/PortfolioTab.tsx` (NEW)
- Summary bar: Total Open Positions, Best Performer (highest P&L%), Worst Performer, Total P&L%
- Table columns: Asset, Asset Class (CRYPTO/STOCK badge), Entry Price, Current Price, P&L % (green/red), Status (OPEN/CLOSED badge), Entry Time
- Calculate P&L% as `((current_price - entry_price) / entry_price) * 100`
- Empty state: "No positions open — waiting for high-conviction signals"

### 4. `src/components/OpportunitiesTab.tsx` (NEW)
- Parse `advice` JSON field from each row
- Verdict badge: STRONG BUY (bright green), BUY (green), WATCH (amber), AVOID (red) — large badge
- Confidence as percentage next to badge
- Expandable section (Collapsible) per row: `key_reasons` as green bullet points, `risk_factors` as red bullet points, `suggested_action` text
- `source_scores`: render as mini horizontal bar chart per agent (colored bars with labels)
- Keep existing columns (asset, combined_score, etc.)

### 5. `src/components/SignalsTab.tsx` (NEW)
- Parse `metadata_json` for `reasoning` field
- Expandable row showing reasoning in muted smaller font
- Agent color dots: `momentum_breakout`=green, `wallet_flow`=cyan, `news_narrative`=blue, `stock_momentum`=orange, `stock_news`=yellow, `polymarket_edge`=purple, `market_snapshot`=gray
- Show dot next to agent name in the agent column

### 6. `src/components/DecisionsTab.tsx` (NEW)
- For rows where `action` is "alert" or "paper_trade", add PDF download icon button
- PDF URL: `GET {SUPABASE_URL}/reports/{asset}_{action}_{timestamp}.pdf` (or construct similar)
- Row highlight: alert rows = amber bg, paper_trade rows = bright green bg (already partially done)
- `agent_count` badge showing count of agreeing agents

### 7. `src/components/SystemStatusTab.tsx` (NEW, replaces "runs")
- Live indicator: green dot if last run `completed_at` < 2 min ago, red dot otherwise
- Large stat numbers: avg signals per cycle, avg opportunities per cycle (computed from `signal_count`, `opportunity_count`)
- Bar chart of `opportunity_count` over last 20 runs using simple div-based bars
- Table of recent runs below

### 8. `src/pages/Index.tsx`
- Default tab = `"portfolio"`
- Pass `assetClassFilter` to each tab component
- Render tab-specific components instead of generic `DataTable`
- Move auto-refresh + lastRefreshTime into hook, pass to header

### 9. `src/index.css`
- No changes needed; existing terminal color tokens cover all needed colors

## Technical Notes
- All tab components will receive filtered data (by asset class) from the hook
- The PDF download for decisions will use `window.open()` to the constructed URL
- Bar charts will be pure CSS/div-based — no charting library needed
- Collapsible/expandable rows will use the existing `@radix-ui/react-collapsible` already installed
- The `recharts` library is already in `package.json` and can be used for the bar chart in System Status if preferred

