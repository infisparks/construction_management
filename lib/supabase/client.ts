import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://futnctdhcrtlqrepvzdt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dG5jdGRoY3J0bHFyZXB2emR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODI1NDEsImV4cCI6MjEwNjg1ODU0MX0.5RbkAmhtVo09SWNl1mz7A6NCvzh4lTx-tiAptS_Aqds';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
