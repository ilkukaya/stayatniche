#!/usr/bin/env node
/**
 * fetch-hotels.js
 *
 * Fetches hotel data from the Travelpayouts / HotelLook API and filters
 * candidates for the StayAtNiche content pipeline.
 *
 * Endpoints used (HotelLook v2):
 *   Location lookup : GET https://engine.hotellook.com/api/v2/lookup.json
 *   Hotel list      : GET https://engine.hotellook.com/api/v2/hotels.json
 *
 * Usage:
 *   node scripts/fetch-hotels.js
 *   node scripts/fetch-hotels.js --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const API_TOKEN  = process.env.HOTELLOOK_API_TOKEN || '4814b700ea7f8f579676d7426ffa1116';
const BASE_URL   = 'https://engine.hotellook.com/api/v2';
const LOOKUP_URL = `${BASE_URL}/lookup.json`;
const HOTELS_URL = `${BASE_URL}/hotels.json`;

const isDryRun = process.argv.includes('--dry-run');

// Major chain brand keywords (case-insensitive substring match)
const CHAIN_KEYWORDS = [
  // Hilton portfolio
  'hilton', 'doubletree', 'hampton inn', 'embassy suites', 'waldorf astoria',
  'curio collection', 'tapestry collection', 'canopy by hilton', 'signia',
  // Marriott portfolio
  'marriott', 'sheraton', 'westin', 'w hotel', 'st. regis', 'st regis',
  'ritz-carlton', 'ritz carlton', 'four points', 'aloft hotel', 'moxy hotel',
  'courtyard', 'residence inn', 'fairfield inn', 'ac hotels', 'delta hotels',
  'le méridien', 'le meridien', 'autograph collection',
  // IHG portfolio
  'intercontinental', 'holiday inn', 'crowne plaza', 'kimpton', 'hotel indigo',
  'even hotels', 'candlewood suites', 'staybridge suites', 'regent hotel',
  // Accor portfolio
  'accorhotels', 'sofitel', 'novotel', 'mercure hotel', 'ibis hotel',
  'pullman hotel', 'mgallery', 'fairmont', 'raffles hotel', 'swissôtel',
  'swissotel', 'orient express hotel',
  // Wyndham portfolio
  'wyndham', 'days inn', 'ramada', 'super 8', 'la quinta', 'tryp hotel',
  'dolce hotel', 'howard johnson', 'travelodge', 'wingate by wyndham',
  'baymont inn',
  // Best Western
  'best western',
  // Radisson portfolio
  'radisson', 'park inn by radisson', 'park plaza', 'country inn & suites',
  'blu hotel',
  // Choice Hotels
  'comfort inn', 'quality inn', 'sleep inn', 'clarion hotel', 'econo lodge',
  'rodeway inn', 'mainstay suites', 'suburban extended',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isChainHotel(hotelName) {
  const lower = hotelName.toLowerCase();
  return CHAIN_KEYWORDS.some(kw => lower.includes(kw));
}

/** Normalize rating to a 0–10 scale; HotelLook sometimes returns 0–100. */
function normalizeRating(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return 0;
  return n > 10 ? n / 10 : n;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

/** Resolve a text query to a HotelLook location ID. */
async function lookupLocation(query, country) {
  // Strip generic words so "Bali unique hotels" → "Bali"
  const cleanQuery = query
    .replace(/\b(unique|boutique|traditional|chalet|safari|overwater|lodge|riad|hotel|hotels|accommodation)\b/gi, '')
    .trim();

  const url =
    `${LOOKUP_URL}?query=${encodeURIComponent(cleanQuery)}`
    + `&lang=en&lookFor=both&limit=10&token=${API_TOKEN}`;

  let data;
  try {
    data = await fetchJSON(url);
  } catch (err) {
    throw new Error(`Location lookup failed for "${cleanQuery}": ${err.message}`);
  }

  const locations = data?.results?.locations ?? [];
  if (locations.length === 0) return null;

  // Prefer a match whose country field aligns with the source country
  if (country && country !== 'various') {
    const countryLower = country.toLowerCase();
    const match = locations.find(
      loc =>
        (loc.country?.toLowerCase() ?? '').includes(countryLower) ||
        (loc.name?.toLowerCase()    ?? '').includes(countryLower)
    );
    if (match) return match.id;
  }

  return locations[0].id;
}

/** Fetch hotel list for a given location ID. */
async function fetchHotelsByLocation(locationId, limit) {
  const url =
    `${HOTELS_URL}?locationId=${locationId}&language=en&limit=${limit}&token=${API_TOKEN}`;

  let data;
  try {
    data = await fetchJSON(url);
  } catch (err) {
    throw new Error(`Hotel fetch failed for locationId=${locationId}: ${err.message}`);
  }

  // Response may be an array or { hotels: [...] }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.hotels)) return data.hotels;
  return [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏨  StayAtNiche — Hotel Fetcher  [${isDryRun ? 'DRY RUN' : 'LIVE'}]\n`);

  // 1. Load sources config
  const sourcesPath = path.join(__dirname, '../src/content/settings/hotel-sources.json');
  const sourcesConfig = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  const sources = sourcesConfig.sources;
  console.log(`Sources loaded: ${sources.length}`);

  // 2. Collect existing hotel slugs
  const hotelsDir  = path.join(__dirname, '../src/content/hotels');
  const existingFiles = fs.readdirSync(hotelsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const existingSlugs = new Set(existingFiles.map(f => f.replace(/\.(md|mdx)$/, '')));
  console.log(`Existing hotels: ${existingSlugs.size}\n`);

  // 3. Build log structure
  const log = {
    timestamp:     new Date().toISOString(),
    dryRun:        isDryRun,
    existingCount: existingSlugs.size,
    sources:       [],
    summary: {
      fetched:  0,
      new:      0,
      skipped:  0,   // already exists
      filtered: 0,   // chain or low rating
      errors:   0,
    },
    newHotels: [],   // flat list of candidates that passed all filters
  };

  // 4. Process each source
  for (const source of sources) {
    console.log(`▶  ${source.query}  (${source.country})`);

    const sourceLog = {
      query:      source.query,
      country:    source.country,
      region:     source.region,
      category:   source.category,
      locationId: null,
      fetched:    0,
      results:    [],
      errors:     [],
    };

    // 4a. Resolve location
    let locationId;
    try {
      locationId = await lookupLocation(source.query, source.country);
    } catch (err) {
      console.error(`   ✗ ${err.message}`);
      sourceLog.errors.push(err.message);
      log.summary.errors++;
      log.sources.push(sourceLog);
      continue;
    }

    if (!locationId) {
      const msg = `No location found for "${source.query}"`;
      console.warn(`   ⚠  ${msg}`);
      sourceLog.errors.push(msg);
      log.sources.push(sourceLog);
      continue;
    }

    sourceLog.locationId = locationId;
    console.log(`   Location ID: ${locationId}`);

    // 4b. Fetch hotels (request more than maxResults to have room after filtering)
    let hotels = [];
    try {
      hotels = await fetchHotelsByLocation(locationId, source.maxResults * 4);
    } catch (err) {
      console.error(`   ✗ ${err.message}`);
      sourceLog.errors.push(err.message);
      log.summary.errors++;
      log.sources.push(sourceLog);
      continue;
    }

    sourceLog.fetched = hotels.length;
    log.summary.fetched += hotels.length;
    console.log(`   Fetched: ${hotels.length} hotels`);

    // 4c. Evaluate each hotel
    let newCount = 0;

    for (const hotel of hotels) {
      const name = hotel.name ?? hotel.hotel_name;
      if (!name) continue;

      const rating = normalizeRating(hotel.rating ?? hotel.userRating ?? 0);
      const slug   = slugify(name);

      const entry = {
        id:       hotel.id ?? hotel.hotel_id ?? null,
        name,
        slug,
        rating,
        stars:    hotel.stars ?? null,
        city:     hotel.location?.name ?? hotel.city ?? null,
        country:  hotel.location?.country ?? source.country,
        lat:      hotel.location?.lat ?? hotel.lat ?? null,
        lon:      hotel.location?.lon ?? hotel.lon ?? null,
        category: source.category,
        region:   source.region,
        status:   null,
        reason:   null,
      };

      // --- Filter: already exists ---
      if (existingSlugs.has(slug)) {
        entry.status = 'skipped';
        entry.reason = 'already exists';
        log.summary.skipped++;
        sourceLog.results.push(entry);
        continue;
      }

      // --- Filter: chain hotel ---
      if (isChainHotel(name)) {
        entry.status = 'filtered';
        entry.reason = 'chain hotel';
        log.summary.filtered++;
        sourceLog.results.push(entry);
        continue;
      }

      // --- Filter: rating below threshold ---
      if (rating < 8.0) {
        entry.status = 'filtered';
        entry.reason = `low rating (${rating.toFixed(1)})`;
        log.summary.filtered++;
        sourceLog.results.push(entry);
        continue;
      }

      // ✅ Passed all filters
      entry.status = 'new';
      log.summary.new++;
      newCount++;
      sourceLog.results.push(entry);
      log.newHotels.push(entry);

      console.log(`   ✓ NEW  ${name}  (⭐ ${entry.stars ?? '?'}, rating ${rating.toFixed(1)}, slug: ${slug})`);
    }

    if (newCount === 0) console.log('   (no new candidates)');
    log.sources.push(sourceLog);
  }

  // 5. Print summary
  console.log('\n══════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════');
  console.log(`  Fetched total : ${log.summary.fetched}`);
  console.log(`  New candidates: ${log.summary.new}`);
  console.log(`  Skipped (dup) : ${log.summary.skipped}`);
  console.log(`  Filtered out  : ${log.summary.filtered}`);
  console.log(`  Source errors : ${log.summary.errors}`);
  console.log('══════════════════════════════════\n');

  // 6. Write log file
  const logPath = path.join(__dirname, 'fetch-log.json');
  if (!isDryRun) {
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    console.log(`Log written → ${logPath}`);
  } else {
    console.log(`[DRY RUN] Log NOT written (would go to ${logPath})`);
    // Still write in dry-run so the caller can inspect results
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    console.log(`Log written → ${logPath}  (dry-run, no hotel files created)`);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
