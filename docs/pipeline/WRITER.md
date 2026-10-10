# Daily writer runbook (for the scheduled Claude session)

Goal: publish the stays the owner **approved on the review page**, up to **20** per day, accurately.
Never publish anything that is not `status: "approved"` in the queue. If nothing is approved, publish nothing.

- Default branch: `claude/setup-stayatniche-project-xHSQk` (call it `$B`).
- Review page: https://claude.ai/artifact/WC5XfcRYrJmXf8aqCCfDz7 (collection `queue`, document id =
  candidate id with every non-alphanumeric run replaced by `_`, e.g. `osm:way/123` -> `osm_way_123`).

## 0. Setup
1. `git fetch origin $B && git checkout -b claude/pipeline-YYYY-MM-DD origin/$B`, then `npm ci`.
2. Evidence packs: `mkdir -p .pipeline-data && git fetch --depth 1 origin pipeline-data && git archive FETCH_HEAD | tar -x -C .pipeline-data`.
3. Pick up decisions made since the classifier ran: ArtifactData `query` on `queue` with
   `{"where": [["status","==","pending"]], "limit": 1000}` and `out_dir: "/tmp/review-export"`, then
   `node pipeline/sync-reviews.mjs /tmp/review-export`.

## 1. Pick candidates
- Read `data/pipeline/candidates.json`. Eligible: `status: "approved"` only.
- `node pipeline/approved.mjs 20` lists them in cell order (id, review-page doc id, category, country, name). Take those, so that
  whole category × country cells fill up and their "Best … in …" pages appear.
- The category to publish under is `finalCategory` (the reviewer's choice), not the old guess.

## 2. Gather facts (per candidate)
Use only these sources:
- The Haiku decision: `haiku.file` in the queue entry points to `checked.json`; its entry for this id
  has `official_name`, `niche_feature`, `highlights` / `amenities` (each with a verified quote),
  `room_count`, `season`, `access`, `check_in`/`check_out`, `audience`.
- The evidence pack `.pipeline-data/inbox/<doc id>.json`: the official site's text, JSON-LD and
  Wikipedia summary. Read it; it has more than the decision.
- The reviewer's `reviewNote` in the queue entry (e.g. "only 3 of 20 rooms are treehouses"): the page
  must reflect it.
- DirectBooker only if its tools are available in this session (`hotel-lookup-by-name-and-coordinates`,
  then `hotel-details` and `hotel-availability-lowest-direct-rate` for 2 adults, 2 nights, ~60 days out).
  Without it, prices are "Rates vary". Missing DirectBooker is never a reason to skip a stay.
- If the evidence pack is missing or says the place closed, set the candidate back to `classified`
  with a `reviewNote` explaining why, and skip it.
- If only some rooms are the niche (`haiku.scope: some_units`), say so plainly in the description and body.

## 3. Write `src/content/hotels/<slug>.md`
Slug: `kebab-case-name-country` (unique). Frontmatter (match `src/content/config.ts`):

```yaml
---
name: "Official name"
category: <category-slug>
destination: "City/area, Region"
country: "Country"
description: "One or two factual sentences on what makes the stay unusual."
priceRange: "From $320"        # only a price you observed today; otherwise "Rates vary"
priceIndicator: 3               # 1–5, ONLY if a price was observed; otherwise omit the line
highlights: [ "…", "…", "…" ]   # 3–5, each a fact from evidence/details
amenities: [ "…" ]              # only amenities stated by the hotel/DirectBooker
bestFor: [ "Couples", "…" ]
bookingUrl: "https://www.expedia.com/Hotel-Search?destination=<url-encoded name, city>&adults=2"
rating: 8.6                     # editorial score 7.5–9.5: uniqueness of the stay, setting, evidence quality
reviewCount: 0
coordinates: { lat: 0.0, lng: 0.0 }
officialWebsite: "https://…"
sourceId: "<candidate id, e.g. osm:way/123>"
verifiedAt: YYYY-MM-DD
publishedDate: YYYY-MM-DD
status: published
---
```
Body: 250–450 words, plain English, editorial but factual. Structure: what the stay is, the rooms,
the setting, practical notes (how to get there, season) only if known. **Never invent** awards, guest
quotes, review counts, prices, room counts, dates or amenities. No superlatives you can't support.
Do not copy sentences from the hotel website; paraphrase facts.

**Write only what is known, and never talk about the process.** The reader must not see how the page
was made. Never write:
- what is missing or unconfirmed ("prices were not available to us", "we could not confirm", "is not
  mentioned", "we have no verified information", "the site does not publish room sizes");
- pipeline words: "batch", "this guide", "evidence", "the review", "our sources";
- hedges that point at the source ("that is the hotel's own statement", "the hotel says" more than once
  per page). State a hotel's claim once as its claim ("listed in the 2026 Michelin Guide, according to
  the hotel") and move on.
If a fact is unknown, leave the topic out. Prices live only in `priceRange` ("Rates vary"), never in the
body. One closing line that tells readers what to ask the hotel is fine when it helps them choose
(e.g. "ask for room 105, the carved cave room").

## 3a. Expedia hotel page (affiliate link)
Expedia is the approved hotel partner (the full list of approved programs is `APPROVED` in
`src/lib/tp-programs.mjs`; link only to those). The "Check rates" buttons go to the stay's own
Expedia page when `src/data/expedia-hotels.json` has it, otherwise to an Expedia search.
For each new stay: WebSearch with `allowed_domains: ["expedia.com"]`, query `"<name> <town> <country>"`.
Accept only a URL of the form `https://www.expedia.com/<City>-Hotels-<Name>.h<digits>.Hotel-Information`
(drop any query string) that clearly names this property in this town; never build one yourself. Add
`"<slug>": "<url>"` to `src/data/expedia-hotels.json` (keep keys sorted). No clear match: add nothing.

## 3b. Translations (required)
The site is published in English, German, French, Spanish, Italian and Dutch. After the English pages
are written, launch `hotel-translator` subagents (they run on Haiku), up to 5 slugs each and at most
4 at a time, with the prompt "Translate these hotel pages: <slugs>". They write, following
`docs/i18n/TRANSLATING.md`:

```
src/content/translations/de/hotels/<slug>.md
src/content/translations/fr/hotels/<slug>.md
src/content/translations/es/hotels/<slug>.md
src/content/translations/it/hotels/<slug>.md
src/content/translations/nl/hotels/<slug>.md
```

Then run `node scripts/i18n-check.mjs all hotels` and fix every error yourself (read the failing file,
correct it). Spot-read one translation per run for tone.
A hotel without its translations only appears on the English site. That is acceptable only if you
run out of time, and you must say so in the final message.

## 4. Update the queue and the review page
1. In `data/pipeline/candidates.json` set each published candidate to `status: "published"` and
   `slug: "<slug>"`. Run `node pipeline/status.mjs`.
2. After the PR is merged: for each published stay, ArtifactData `get` its `queue` document (note the
   `version`), then `update` it with `{"status": "published", "slug": "<slug>", "publishedAt": "<ISO date>"}`
   and that `if_version`. It then appears under "Yayında" on the review page.

## 5. Check and ship
1. `node scripts/check-duplicates.mjs && npm run build && node scripts/check-build.mjs` must pass. If the
   duplicate check names a stay you just wrote, it is already on the site: delete your new file and its
   translations, set that candidate to `duplicate` with `duplicateOf: "<existing slug>"`, and move on.
2. Commit (message: `pipeline: publish N stays (YYYY-MM-DD)`), push, open a PR to the default branch, and merge it
   once CI is green. If CI fails, fix or drop the offending file; never merge red.
3. Trigger the `fetch-photos.yml` workflow on the default branch to look for free-licensed photos.
4. Final message: list what was published, skipped and why.
