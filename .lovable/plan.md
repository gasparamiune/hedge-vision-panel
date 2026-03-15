

# Fix Table Names and Anon Key

## Changes

### 1. `src/hooks/use-dashboard-data.ts` — Fix table names (line 13-18)
Update `TABLE_MAP` to use the correct table names:
```typescript
const TABLE_MAP: Record<TabKey, string> = {
  decisions: "decisions",
  opportunities: "opportunities",
  signals: "signals",
  runs: "agent_runs",
};
```

### 2. `src/lib/supabase.ts` — Update anon key (line 4)
Replace the outdated anon key with the one you provided:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbmFzd2J3bHhyeWhydHR5Znl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjU2MzIsImV4cCI6MjA4OTE0MTYzMn0.1KhescuQW49QgRqVGSzSE4MmDhao0SQ_q9SUp298zdc
```

Both are single-line fixes that should resolve the 401 and 404 errors.

