import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('supabase-client', {
  providedIn: 'root',
  factory: () => createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Bypasses the Web Locks API multi-tab deadlock error on local hosts
        lock: async (name, acquireTimeout, fn) => await fn()
      }
    }
  ),
});
