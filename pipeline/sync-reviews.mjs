/**
 * Copies the reviewer's decisions from the review page into the queue. Input: the page's
 * `queue` documents exported with ArtifactData (`query` with `out_dir`), one JSON file each.
 *   decision "approve" -> status "approved" (the writer publishes it), finalCategory set
 *   decision "reject"  -> status "rejected"
 *   no decision / "unsure" -> stays "classified"
 * Published candidates are never touched.
 * Usage: node pipeline/sync-reviews.mjs <export dir>
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadQueue, saveQueue } from './lib.mjs';
import { CATEGORIES } from './categories.mjs';

const root = process.argv[2];
if (!root) { console.error('usage: node pipeline/sync-reviews.mjs <export dir>'); process.exit(1); }
const files = (d) => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? files(join(d, f)) : f.endsWith('.json') ? [join(d, f)] : []);
const q = loadQueue();
const tally = {};
const bump = (k) => (tally[k] = (tally[k] ?? 0) + 1);

for (const f of files(root)) {
  const raw = JSON.parse(readFileSync(f, 'utf8'));
  const doc = raw?.data?.id ? raw.data : raw;
  const c = q[doc?.id];
  if (!c || c.status === 'published') continue;
  const cat = CATEGORIES[doc.finalCat] ? doc.finalCat : doc.cat;
  if (doc.decision === 'approve' && CATEGORIES[cat]) {
    if (c.status !== 'approved') bump('approved');
    Object.assign(c, { status: 'approved', finalCategory: cat, reviewNote: doc.note || undefined, reviewedAt: doc.reviewedAt ?? null });
  } else if (doc.decision === 'reject') {
    if (c.status !== 'rejected') bump('rejected');
    Object.assign(c, { status: 'rejected', reasons: [`reviewer: ${doc.note || 'rejected on review page'}`], reviewedAt: doc.reviewedAt ?? null });
  } else if (c.status === 'approved' || (c.status === 'rejected' && c.reasons?.[0]?.startsWith('reviewer:'))) {
    // The reviewer undid an earlier decision.
    c.status = 'classified'; c.reasons = []; bump('reopened');
  }
}
saveQueue(q);
console.log(`reviews synced: ${JSON.stringify(tally)}`);
