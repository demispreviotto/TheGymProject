// Fails if the production index.html needs script-src 'unsafe-inline' (see vercel.json CSP).
import { readFileSync } from 'node:fs';

const file = 'dist/the-gym-project/browser/index.html';
const html = readFileSync(file, 'utf8');

const inlineHandlers = html.match(/\son[a-z]+\s*=\s*["']/gi) ?? [];
const inlineScripts = (html.match(/<script\b[^>]*>/gi) ?? []).filter(tag => !/\bsrc\s*=/.test(tag));

if (inlineHandlers.length || inlineScripts.length) {
  console.error(`CSP check failed for ${file}:`);
  if (inlineHandlers.length) console.error(`  inline event handlers: ${inlineHandlers.join(' ')}`);
  if (inlineScripts.length) console.error(`  inline <script> tags: ${inlineScripts.join(' ')}`);
  process.exit(1);
}
console.log('CSP check passed: no inline scripts or event handlers.');
