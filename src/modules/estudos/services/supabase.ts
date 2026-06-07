// Re-export the single shared Supabase client from the central service.
// This prevents multiple GoTrueClient instances from being created,
// which would cause auth token conflicts and undefined behavior.
export { supabase } from '../../../services/supabase';
