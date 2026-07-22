import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    readonly env: {
      readonly [key: string]: string | undefined;
    };
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are set, otherwise log warning for local fallback
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseUrl.trim() !== '' && 
  supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL' && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseAnonKey !== 'placeholder-anon-key'
);

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);

