
import { createClient } from '@supabase/supabase-js';

console.log('Supabase: Initializing...');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase: MISSING KEYS - Check .env.local');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Defined' : 'Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Defined' : 'Missing');
} else {
    console.log('Supabase: Keys present');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
console.log('Supabase: Client created');
