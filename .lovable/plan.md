

## Analysis

The Agent Map currently fetches from `${API_BASE}/signals?limit=100` and `${API_BASE}/decisions?limit=100`, but both fail with CORS errors ("Failed to fetch") as confirmed in network logs. The `/health` endpoint may have different CORS configuration.

However, `/health` is typically a health-check endpoint that won't return signals/decisions data. The core problem is that **all Railway API calls fail due to CORS**, while the same data is successfully available via the database (Supabase queries return 200 with full signal and decision data).

## Plan

**Switch Agent Map data source from Railway API to database queries** (which already work for all other tabs):

1. **Replace Railway `fetch()` calls** in `AgentMapTab.tsx` with Supabase client queries:
   - `supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(100)` for signals
   - `supabase.from("decisions").select("*").order("created_at", { ascending: false }).limit(100)` for decisions

2. **Keep the 30-second polling interval** — just swap the transport layer

3. **Remove the debug panel's fetch error state** since Supabase queries reliably succeed

4. **No other changes needed** — the data shape from Supabase matches what the component already expects (`agent_name`, `signal_type`, `asset`, `score`, `action`, `thesis`, `metadata_json`)

This approach works because the network logs confirm Supabase returns the exact same signals and decisions data that the Railway API would, with identical field names. All other dashboard tabs already use this pattern successfully.

If you specifically need to hit the Railway API `/health` endpoint (e.g., to display API status), I can add that as a secondary status indicator while using the database for the actual data.

