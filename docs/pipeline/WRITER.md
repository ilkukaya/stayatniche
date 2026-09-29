# Daily writer runbook (for the scheduled Claude session)

Goal: publish up to **8** newly verified niche stays per day, accurately. Quality over volume:
never publish anything you could not verify. If nothing qualifies, publish nothing.

## 0. Setup
1. Work in the `stayatniche` repo on a new branch from the default branch
   (`claude/setup-stayatniche-project-xHSQk`): `git checkout -b claude/pipeline-YYYY-MM-DD origin/claude/setup-stayatniche-project-xHSQk`.
2. `npm ci`.

## 1. Pick candidates
- Read `data/pipeline/candidates.json`. Eligible: `status: "verified"`.
- Choose up to 8, favouring categories with the fewest published hotels (see `data/pipeline/STATUS.md`),
  then candidates with a Wikidata id and a website `evidence.keyword` match.
- Skip anything that is a chain hotel with nothing unusual about the stay itself.

## 2. Verify and gather facts (per candidate)
- Evidence already collected: `evidence.title`, `evidence.description`, `evidence.snippet`, `website`, `country`, `city`, coordinates.
- DirectBooker: `hotel-lookup-by-name-and-coordinates` with the candidate's name and coordinates.
  - If `exact_match` (or a clearly same-property `possible_match` within ~1 km): call `hotel-details`, and
    `hotel-availability-lowest-direct-rate` for 2 adults, 2 nights, check-in ~60 days from today.
  - If no match: continue with evidence only.
- The stay must genuinely belong to the category (a "treehouse" must be a room in/among trees on a raised
  structure; a "cave hotel" must have rooms in rock; etc.). If in doubt, set the candidate to `weak` with a reason and skip.
- If anything suggests it is closed, set `status: "rejected"` with a reason and skip.

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

## 3b. Translations (required)
The site is published in English, German, French, Spanish, Italian and Dutch. For every hotel you
publish, also write its five translations, following `docs/i18n/TRANSLATING.md` exactly (format,
allowed fields, glossary, voice per language):

```
src/content/translations/de/hotels/<slug>.md
src/content/translations/fr/hotels/<slug>.md
src/content/translations/es/hotels/<slug>.md
src/content/translations/it/hotels/<slug>.md
src/content/translations/nl/hotels/<slug>.md
```

Write each as a native travel editor of that language would, not word for word, and never add facts
that the English page doesn't have. Then run `node scripts/i18n-check.mjs all hotels` and fix every error.
A hotel without its translations only appears on the English site. That is acceptable only if you
run out of time, and you must say so in the final message.

## 4. Update the queue
Set each published candidate to `status: "published"` and `slug: "<slug>"`. Save rejected/weak decisions with `reasons`.
Run `node pipeline/status.mjs`.

## 5. Check and ship
1. `npm run build && node scripts/check-build.mjs` must pass.
2. Commit (message: `pipeline: publish N stays (YYYY-MM-DD)`), push, open a PR to the default branch, and merge it
   once CI is green. If CI fails, fix or drop the offending file; never merge red.
3. Trigger the `fetch-photos.yml` workflow on the default branch to look for free-licensed photos.
4. Final message: list what was published, skipped and why.
