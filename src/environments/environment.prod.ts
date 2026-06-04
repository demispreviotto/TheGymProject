const env = (import.meta as any).env ?? {};

export const environment = {
  production: true,
  supabaseUrl: env['NG_APP_SUPABASE_URL'] ?? '',
  supabaseAnonKey: env['NG_APP_SUPABASE_ANON_KEY'] ?? '',
};
