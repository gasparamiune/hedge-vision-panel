import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oanaswbwlxryhrttyfyv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbmFzd2J3bHhyeWhydHR5Znl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjU2MzIsImV4cCI6MjA4OTE0MTYzMn0.1KhescuQW49QgRqVGSzSE4MmDhao0SQ_q9SUp298zdc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
