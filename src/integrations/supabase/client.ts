import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://tdkzbwmwmrabhynlxuuz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka3pid213bXJhYmh5bmx4dXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTgxNDUsImV4cCI6MjA3Mjg3NDE0NX0.P1Gnlym8mMd8MHTZ5zvbqqd44OYFjeZP-PC6KfLnYkk";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
