import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xajjsjvdnftccgekkmzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhampzanZkbmZ0Y2NnZWtrbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjcwNzgsImV4cCI6MjA5OTc0MzA3OH0.0U4-waMREbdfcm3n8u6aT7N1lke5kiknAwkgRPrgtBg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
