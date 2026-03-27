#!/usr/bin/env node
/**
 * generate-hotel-content.js
 *
 * Reads scripts/fetch-log.json and generates markdown hotel files
 * in src/content/hotels/ for each new hotel candidate.
 *
 * - Skips hotels whose slug already exists as a .md or .mdx file
 * - Uses the same frontmatter format as existing hotel files
 * - Includes Expedia affiliate booking links
 *
 * Usage:
 *   node scripts/generate-hotel-content.js
 *   node scripts/generate-hotel-content.js --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const isDryRun = process.argv.includes('--dry-run');

// ─── Region → Continent mapping ──────────────────────────────────────────────

const REGION_TO_CONTINENT = {
  'southeast-asia':      'Asia',
  'east-asia':           'Asia',
  'south-asia':          'Asia',
  'central-asia':        'Asia',
  'middle-east':         'Asia',
  'middle-east-africa':  'Africa',
  'africa':              'Africa',
  'nordic':              'Europe',
  'europe':              'Europe',
  'north-america':       'North America',
  'south-america':       'South America',
  'caribbean':           'North America',
  'oceania':             'Oceania',
  'arctic':              'Europe',
};

// ─── Category → highlights / amenities / bestFor templates ───────────────────

const CATEGORY_TEMPLATES = {
  tropical: {
    highlights: [
      'Lush tropical setting surrounded by jungle and nature',
      'Unique architecture blending with the natural environment',
      'Private outdoor spaces ideal for relaxation',
      'Access to pristine beaches or natural water features',
    ],
    amenities: [
      'Outdoor pool or natural swimming area',
      'Tropical garden and nature walks',
      'On-site restaurant with local cuisine',
      'Spa and wellness treatments',
    ],
    bestFor: [
      'Travellers seeking immersive tropical nature experiences',
      'Couples looking for a romantic jungle or beach escape',
      'Eco-conscious travellers wanting sustainable stays',
    ],
  },
  arctic: {
    highlights: [
      'Unique Arctic or sub-Arctic location with dramatic scenery',
      'Opportunities to witness the Northern Lights',
      'Cold-weather adventure activities nearby',
      'Cosy interiors designed for long winter nights',
    ],
    amenities: [
      'Heated rooms with panoramic views',
      'Hot tub or sauna with outdoor views',
      'On-site restaurant with Nordic cuisine',
      'Northern Lights wake-up call service',
    ],
    bestFor: [
      'Aurora hunters and Northern Lights enthusiasts',
      'Winter adventure travellers',
      'Couples seeking a remote and dramatic escape',
    ],
  },
  cultural: {
    highlights: [
      'Authentic architecture reflecting local heritage and tradition',
      'Immersive cultural experiences and guided activities',
      'Located within or near UNESCO World Heritage sites',
      'Locally sourced cuisine celebrating regional flavours',
    ],
    amenities: [
      'Cultural tours and locally guided excursions',
      'Traditional décor and heritage furnishings',
      'On-site restaurant with authentic regional cuisine',
      'Concierge service for cultural itinerary planning',
    ],
    bestFor: [
      'Culture and history enthusiasts',
      'Travellers seeking authentic local experiences',
      'Photographers and storytellers',
    ],
  },
  mountain: {
    highlights: [
      'Spectacular mountain setting with panoramic alpine views',
      'Direct access to hiking, skiing, or climbing terrain',
      'Cosy chalet-style interiors with fireplaces',
      'Fresh mountain air and remote tranquillity',
    ],
    amenities: [
      'Ski-in/ski-out access or shuttle service',
      'Fireplace lounge and après-ski bar',
      'Mountain spa and wellness facilities',
      'Equipment rental and guided mountain activities',
    ],
    bestFor: [
      'Skiers, hikers, and outdoor adventurers',
      'Couples seeking a romantic alpine retreat',
      'Families wanting active mountain holidays',
    ],
  },
  safari: {
    highlights: [
      'Prime wildlife viewing location in a protected conservation area',
      'Expert-guided game drives at dawn and dusk',
      'Luxury tented or lodge accommodation in the wilderness',
      'Intimate camp with limited guests for exclusive experience',
    ],
    amenities: [
      'Twice-daily guided game drives included',
      'Bush dining and sundowner experiences',
      'Wildlife tracking and nature walks',
      'Swimming pool and outdoor relaxation areas',
    ],
    bestFor: [
      'Wildlife and nature photography enthusiasts',
      'Couples on safari honeymoon or anniversary trips',
      'Travellers seeking bucket-list African wildlife encounters',
    ],
  },
  overwater: {
    highlights: [
      'Iconic overwater bungalow with direct lagoon access',
      'Glass-floor panels revealing the marine world below',
      'Private deck with steps directly into the ocean',
      'Stunning sunrises and sunsets over open water',
    ],
    amenities: [
      'Private overwater deck and sun loungers',
      'Direct lagoon access via private steps',
      'Snorkelling equipment included',
      'In-room dining and butler service',
    ],
    bestFor: [
      'Honeymoon and anniversary couples',
      'Snorkellers and marine life enthusiasts',
      'Travellers seeking the ultimate island luxury experience',
    ],
  },
  scenic: {
    highlights: [
      'Dramatic natural setting with world-class views',
      'Unique location accessible only by scenic journey',
      'Architecturally striking design that complements the landscape',
      'Exceptional peace and seclusion in a natural environment',
    ],
    amenities: [
      'Panoramic terrace or viewing platform',
      'On-site restaurant with locally sourced ingredients',
      'Guided nature excursions and local exploration',
      'Wellness and relaxation facilities',
    ],
    bestFor: [
      'Nature lovers and landscape photographers',
      'Travellers seeking serenity and escape from city life',
      'Adventurers using the property as a base for exploration',
    ],
  },
  nature: {
    highlights: [
      'Deep immersion in pristine natural surroundings',
      'Eco-friendly design with minimal environmental footprint',
      'Wildlife encounters on the doorstep',
      'Remote location offering genuine solitude',
    ],
    amenities: [
      'Guided nature walks and wildlife tracking',
      'Eco-lodge dining with seasonal local produce',
      'Outdoor hot tub or natural bathing facilities',
      'Stargazing platform and night-sky experiences',
    ],
    bestFor: [
      'Eco-travellers and conservation-minded guests',
      'Wildlife enthusiasts and birdwatchers',
      'Couples or solo travellers seeking remote wilderness',
    ],
  },
};

// Default template for unlisted categories
const DEFAULT_TEMPLATE = {
  highlights: [
    'Unique property offering a distinctive and memorable stay',
    'Exceptional setting in a sought-after destination',
    'Thoughtfully designed spaces for comfort and experience',
    'Personalised service tailored to each guest',
  ],
  amenities: [
    'On-site dining with locally inspired cuisine',
    'Outdoor terrace or garden area',
    'Concierge and activity planning service',
    'Comfortable rooms with quality furnishings',
  ],
  bestFor: [
    'Travellers seeking something beyond the ordinary',
    'Couples and honeymooners',
    'Explorers wanting a memorable base in the destination',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTemplate(category) {
  return CATEGORY_TEMPLATES[category] ?? DEFAULT_TEMPLATE;
}

function getPriceIndicator(stars) {
  if (!stars) return 3;
  const s = parseInt(stars, 10);
  if (s >= 5) return 5;
  if (s === 4) return 3;
  if (s === 3) return 2;
  return 1;
}

function getPriceRange(stars) {
  if (!stars) return '$200 - $500';
  const s = parseInt(stars, 10);
  if (s >= 5) return '$500 - $1,500';
  if (s === 4) return '$200 - $500';
  if (s === 3) return '$80 - $200';
  return '$40 - $100';
}

function buildExpediaUrl(hotelName, city, country) {
  const destination = [city, country].filter(Boolean).join(', ');
  return `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination)}&adults=2`;
}

function yamlString(value) {
  // Wrap in double quotes, escaping internal double quotes
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function yamlList(items) {
  return items.map(item => `  - ${yamlString(item)}`).join('\n');
}

function generateDescription(hotel) {
  const location = hotel.city ? `${hotel.city}, ${hotel.country}` : hotel.country;
  const categoryLabel = hotel.category
    ? hotel.category.replace(/-/g, ' ')
    : 'unique';
  const starText = hotel.stars ? ` ${hotel.stars}-star` : '';

  return `A distinctive${starText} ${categoryLabel} property in ${location}, offering an exceptional stay in one of the world's most remarkable destinations.`;
}

function generateBodyContent(hotel) {
  const location = hotel.city ? `${hotel.city}, ${hotel.country}` : hotel.country;
  const template = getTemplate(hotel.category);

  return `${hotel.name} is a standout property in ${location}, selected for StayAtNiche based on its exceptional guest ratings and distinctive character. Located in the heart of the destination, this hotel offers travellers a genuine alternative to chain accommodation.

The property's setting makes it a compelling choice for those who want their accommodation to be part of the experience itself. With a guest rating of ${hotel.rating ? hotel.rating.toFixed(1) : 'N/A'} out of 10, it consistently delivers on the promise of a memorable stay.

## Why Stay Here

${template.highlights.map(h => `- ${h}`).join('\n')}

## Location

Situated in ${location}, guests have access to the region's key attractions and experiences. The destination is known for its natural beauty, cultural richness, and the kind of travel experiences that stay with you long after you return home.
`;
}

function generateMarkdown(hotel) {
  const template = getTemplate(hotel.category);
  const continent = REGION_TO_CONTINENT[hotel.region] ?? '';
  const description = generateDescription(hotel);
  const priceIndicator = getPriceIndicator(hotel.stars);
  const priceRange = getPriceRange(hotel.stars);
  const expediaUrl = buildExpediaUrl(hotel.name, hotel.city, hotel.country);
  const destination = hotel.city ?? hotel.country ?? 'Unknown';

  const frontmatter = [
    `name: ${yamlString(hotel.name)}`,
    `category: ${hotel.category ?? 'boutique'}`,
    `destination: ${yamlString(destination)}`,
    `country: ${yamlString(hotel.country ?? '')}`,
    ...(continent ? [`continent: ${continent}`] : []),
    `description: ${yamlString(description)}`,
    `coverImage: /images/hotels/${hotel.slug}.jpg`,
    `priceRange: ${yamlString(priceRange)}`,
    `priceIndicator: ${priceIndicator}`,
    `highlights:`,
    yamlList(template.highlights),
    `amenities:`,
    yamlList(template.amenities),
    `bestFor:`,
    yamlList(template.bestFor),
    `bookingUrl: ${expediaUrl}`,
    `rating: ${hotel.rating ? hotel.rating.toFixed(1) : 8.0}`,
    `reviewCount: 0`,
    ...(hotel.lat && hotel.lon
      ? [`coordinates:\n  lat: ${hotel.lat}\n  lng: ${hotel.lon}`]
      : []),
    `featured: false`,
    `status: published`,
    `affiliateLinks:`,
    `  - partner: "expedia"`,
    `    url: ${yamlString(expediaUrl)}`,
    `    label: "Check on Expedia"`,
  ].join('\n');

  const body = generateBodyContent(hotel);

  return `---\n${frontmatter}\n---\n\n${body}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏨  StayAtNiche — Hotel Content Generator  [${isDryRun ? 'DRY RUN' : 'LIVE'}]\n`);

  // 1. Load fetch log
  const logPath = path.join(__dirname, 'fetch-log.json');
  if (!fs.existsSync(logPath)) {
    console.error(`fetch-log.json not found at ${logPath}`);
    console.error('Run "npm run fetch-hotels" first to generate hotel data.');
    process.exit(1);
  }

  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const candidates = (log.newHotels ?? []).filter(h => h.status === 'new');

  console.log(`Candidates from fetch-log.json: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log('No new hotel candidates found. Run "npm run fetch-hotels" to fetch fresh data.');
    return;
  }

  // 2. Collect existing slugs to avoid overwrites
  const hotelsDir = path.join(__dirname, '../src/content/hotels');
  const existingFiles = fs.readdirSync(hotelsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const existingSlugs = new Set(existingFiles.map(f => f.replace(/\.(md|mdx)$/, '')));
  console.log(`Existing hotel files: ${existingSlugs.size}\n`);

  // 3. Generate markdown for each candidate
  let created = 0;
  let skipped = 0;

  for (const hotel of candidates) {
    const slug = hotel.slug;
    if (!slug) {
      console.warn(`  ⚠  Skipping hotel with no slug: ${hotel.name}`);
      skipped++;
      continue;
    }

    if (existingSlugs.has(slug)) {
      console.log(`  ↷  SKIP  ${hotel.name}  (${slug}.md already exists)`);
      skipped++;
      continue;
    }

    const markdown = generateMarkdown(hotel);
    const filePath = path.join(hotelsDir, `${slug}.md`);

    if (isDryRun) {
      console.log(`  ✓  DRY RUN  ${hotel.name}  →  ${slug}.md`);
    } else {
      fs.writeFileSync(filePath, markdown, 'utf8');
      console.log(`  ✓  CREATED  ${hotel.name}  →  ${slug}.md`);
    }

    created++;
  }

  console.log('\n══════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════');
  console.log(`  Created : ${created}${isDryRun ? ' (dry run)' : ''}`);
  console.log(`  Skipped : ${skipped}`);
  console.log('══════════════════════════════════\n');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
