import { writeFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl) console.warn('[generate-env] WARNING: SUPABASE_URL is not set');
if (!supabaseAnonKey) console.warn('[generate-env] WARNING: SUPABASE_ANON_KEY is not set');

writeFileSync(
  'src/environments/environment.prod.ts',
  `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
};\n`
);

console.log('[generate-env] src/environments/environment.prod.ts written');
