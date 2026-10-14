import { writeFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
const isPipeline = Boolean(process.env.CI || process.env.VERCEL);

const missing = [
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_ANON_KEY', supabaseAnonKey],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  const message = `[generate-env] ${missing.join(', ')} not set`;
  if (isPipeline) {
    // A production bundle with empty Supabase config would deploy a broken app.
    console.error(`${message} — refusing to build in CI.`);
    process.exit(1);
  }
  console.warn(`${message} (local build only; the generated file is git-ignored)`);
}

writeFileSync(
  'src/environments/environment.prod.ts',
  `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
};\n`
);

console.log('[generate-env] src/environments/environment.prod.ts written');
