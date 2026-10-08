/**
 * Lists evidence packs that still need a Haiku decision and splits them into batches for the
 * hotel-classifier subagents. A pack needs a decision when its candidate has none yet and it is
 * not already in a batch file of an earlier run (decided but not yet applied by the nightly job).
 * Writes data/pipeline/decisions/<run>/todo.json: [[pack paths], ...].
 * Usage: node pipeline/next-batches.mjs <run name, e.g. 2026-10-09> [max packs=150] [batch size=17]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { loadQueue, INBOX, DECISIONS } from './lib.mjs';

const [run, max = 150, size = 17] = process.argv.slice(2);
if (!run) { console.error('usage: node pipeline/next-batches.mjs <run> [max] [batch size]'); process.exit(1); }
const q = loadQueue();
const decided = new Set();
for (const r of existsSync(DECISIONS) ? readdirSync(DECISIONS) : [])
  for (const f of readdirSync(`${DECISIONS}/${r}`).filter(f => /^batch.*\.json$/.test(f)))
    try { for (const d of JSON.parse(readFileSync(`${DECISIONS}/${r}/${f}`, 'utf8'))) decided.add(d.id); } catch {}

const todo = [];
for (const f of existsSync(INBOX) ? readdirSync(INBOX).sort() : []) {
  let pack; try { pack = JSON.parse(readFileSync(`${INBOX}/${f}`, 'utf8')); } catch { continue; }
  const c = q[pack.id];
  if (!c || c.haiku || decided.has(pack.id) || ['classified', 'approved', 'published', 'rejected', 'duplicate'].includes(c.status)) continue;
  todo.push(`${INBOX}/${f}`);
}
const take = todo.slice(0, +max);
const batches = [];
for (let i = 0; i < take.length; i += +size) batches.push(take.slice(i, i + +size));
mkdirSync(`${DECISIONS}/${run}`, { recursive: true });
writeFileSync(`${DECISIONS}/${run}/todo.json`, JSON.stringify(batches, null, 1) + '\n');
console.log(`${todo.length} packs need a decision; ${take.length} in ${batches.length} batch(es) -> ${DECISIONS}/${run}/todo.json`);
