import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and Anon Key from environment variables
// VITE_ prefix is required for Vite to expose environment variables to client-side code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ensure that the environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not defined in environment variables.');
  // In a real application, you might want to throw an error or handle this more gracefully
  throw new Error('Supabase credentials are missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
