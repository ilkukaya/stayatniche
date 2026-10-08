/**
 * Applies checked Haiku decisions (data/pipeline/decisions/<run>/checked.json) to the queue and
 * prunes evidence packs that are no longer needed. Idempotent: a decision file is applied once.
 *   accepted / needs_review -> status "classified" (waits for the human review page)
 *   rejected -> "rejected"; duplicate -> "duplicate"
 *   no_evidence -> unchanged, retried after 30 days; rejected after 3 empty tries
 * Also rejects names on a category's exclude list (e.g. Polish "domek" for bubble-hotels).
 * Usage: node pipeline/apply-decisions.mjs
 */
import { readFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { loadQueue, saveQueue, DECISIONS, INBOX, today } from './lib.mjs';
import { excludedName } from './priorities.mjs';

const q = loadQueue();
const tally = {};
const bump = (k) => (tally[k] = (tally[k] ?? 0) + 1);

for (const run of existsSync(DECISIONS) ? readdirSync(DECISIONS).sort() : []) {
  const file = `${DECISIONS}/${run}/checked.json`;
  if (!existsSync(file)) continue;
  for (const d of JSON.parse(readFileSync(file, 'utf8'))) {
    const c = q[d.id];
    if (!c || ['approved', 'published'].includes(c.status) || c.haiku?.file === file || c.noEvidenceFile === file) continue;
    if (d.verdict === 'no_evidence') {
      c.noEvidence = (c.noEvidence ?? 0) + 1;
      c.noEvidenceAt = new Date().toISOString();
      c.noEvidenceFile = file;
      c.haiku = undefined;
      if (c.noEvidence >= 3) { c.status = 'rejected'; c.reasons = ['no readable website after 3 tries']; }
      bump('no_evidence'); continue;
    }
    c.haiku = {
      verdict: d.verdict, category: d.category ?? null, scope: d.niche_scope, confidence: d.confidence,
      feature: d.niche_feature ?? null, reason: d.reason ?? null, file, decidedAt: run,
    };
    if (d.verdict === 'accepted' || d.verdict === 'needs_review') c.status = 'classified';
    else if (d.verdict === 'duplicate') c.status = 'duplicate';
    else { c.status = 'rejected'; c.reasons = [`haiku: ${d.reason ?? 'not a niche stay'}`]; }
    bump(d.verdict);
  }
}

for (const c of Object.values(q)) {
  if (['new', 'verified', 'weak'].includes(c.status) && excludedName(c)) { c.status = 'rejected'; c.reasons = ['excluded name']; bump('excluded'); }
}

// Evidence packs are kept only while a decision or a page still needs them.
let pruned = 0;
if (existsSync(INBOX)) for (const f of readdirSync(INBOX)) {
  let pack; try { pack = JSON.parse(readFileSync(`${INBOX}/${f}`, 'utf8')); } catch { continue; }
  const c = q[pack.id];
  // Awaiting classification = fetched after the last "no evidence" verdict (if any).
  const waiting = c && !c.haiku && c.status !== 'rejected' && (!c.noEvidenceAt || pack.fetchedAt > c.noEvidenceAt);
  const keep = c && (['classified', 'approved'].includes(c.status) || waiting);
  if (!keep) { unlinkSync(`${INBOX}/${f}`); pruned++; }
}

saveQueue(q);
console.log(`applied ${JSON.stringify(tally)}; pruned ${pruned} evidence packs (${today()})`);
