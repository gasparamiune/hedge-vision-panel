import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oanaswbwlxryhrttyfyv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbmFzd2J3bHhyeWhydHR5Znl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMjMzMDIsImV4cCI6MjA1Nzg5OTMwMn0.CM0GDKP9DGPfmR18t_LMb4Rn85MnOKUfSZgp-MaO9nI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
