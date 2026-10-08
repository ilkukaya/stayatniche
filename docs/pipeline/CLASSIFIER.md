# Daily classifier runbook (for the scheduled Claude session)

Goal: turn last night's evidence packs into Haiku decisions, put the stays worth listing on the
review page, and copy the reviewer's decisions back into the queue. You do not browse the web
and you do not write hotel pages (the writer routine does that).

- Repo: `ilkukaya/stayatniche`, default branch `claude/setup-stayatniche-project-xHSQk` (call it `$B`).
- Review page: https://claude.ai/artifact/WC5XfcRYrJmXf8aqCCfDz7 (collection `queue`).
- Run name: today's date, e.g. `2026-10-09` (call it `$RUN`).

## 0. Setup
```
git fetch origin $B && git checkout -B $B origin/$B
mkdir -p .pipeline-data && git fetch --depth 1 origin pipeline-data && git archive FETCH_HEAD | tar -x -C .pipeline-data
```
If `pipeline-data` does not exist yet, there is nothing to classify: do step 1 only.

## 1. Copy the reviewer's decisions into the queue
1. With the ArtifactData tool: `action: "query"`, `url` = review page, `collection: "queue"`,
   `query: {"where": [["status","==","pending"]], "limit": 1000}`, `out_dir: "/tmp/review-export"`.
2. `node pipeline/sync-reviews.mjs /tmp/review-export`
3. If it changed anything: `git add data/pipeline/candidates.json`, commit
   `pipeline: sync reviews ($RUN)`, `git pull --rebase origin $B`, `git push origin HEAD:$B`.
   On a rebase conflict in candidates.json: `git rebase --abort`, `git reset --hard origin/$B`,
   run step 1.2 again, commit and push.

## 2. Classify new evidence packs
1. `node pipeline/next-batches.mjs $RUN 150` writes `data/pipeline/decisions/$RUN/todo.json`
   (a list of batches, each a list of pack paths). If it reports 0 packs, skip to step 4.
2. For every batch `i` (1-based), launch a `hotel-classifier` subagent (it runs on Haiku), at most
   6 at a time, in the background, with this prompt:
   > Working directory: <repo path>. Classify these evidence files (read each fully): <paths>.
   > Write the JSON array (one object per file, "id" copied from each file) to
   > data/pipeline/decisions/$RUN/batch-<i>.json
3. When all are done, check each `batch-<i>.json` parses and has one object per pack. Re-run a
   failed or incomplete batch once; if it fails again, delete its file (those packs stay in the
   inbox and are retried tomorrow).
4. `node pipeline/check-decisions.mjs data/pipeline/decisions/$RUN` (verifies every quote against
   the evidence, assigns accepted / needs_review / no_evidence / duplicate / rejected, writes
   `checked.json` and `REPORT.md`).
5. `node pipeline/review-items.mjs data/pipeline/decisions/$RUN` writes
   `queue-batches.json`: send each inner list with ArtifactData `action: "batch"`, `url` = review
   page, `writes` = that list (≤ 50 writes each). These are new documents; no `if_version`.
   If a write is refused because the document already exists, skip that one.
6. Remove `todo.json`, then `git add data/pipeline/decisions/$RUN`, commit
   `pipeline: classify <n> candidates ($RUN)`, `git pull --rebase origin $B`, `git push origin HEAD:$B`.
   (The nightly job applies these decisions to the queue and prunes the evidence packs.)

## 3. Rules
- Never edit evidence packs, `pipeline-data`, hotel pages or anything under `src/`.
- Never change a review-page document a person has decided on (`decision` set).
- Zero new packs is a normal outcome.

## 4. Final message
Short summary: reviews synced (approved / rejected), packs classified, how many went to the review
page (accepted / needs review), rejected, no evidence, and anything that failed.
