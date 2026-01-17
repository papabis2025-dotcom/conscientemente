
import { createClient } from '@supabase/supabase-js';

console.log('Supabase: Initializing...');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase: Env Vars', { url: supabaseUrl, hasKey: !!supabaseAnonKey });

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase: MISSING KEYS - Check .env.local');
    // throw new Error('Supabase URL and Anon Key are required');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
console.log('Supabase: Client created');
