import { defineCollection, z } from 'astro:content';

// ── Shared schemas ────────────────────────────────────────────
const seoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  noIndex: z.boolean().default(false),
}).optional();

// ── Hotels ────────────────────────────────────────────────────
const hotels = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    category: z.string(),
    destination: z.string(),
    country: z.string(),
    continent: z.string().optional(),
    address: z.string().optional(),
    description: z.string(),
    coverImage: z.string().optional(),
    gallery: z.array(z.string()).default([]),

    priceRange: z.string(),
    pricePerNight: z.number().optional(),
    priceIndicator: z.number().min(1).max(5),

    highlights: z.array(z.string()).default([]),
    amenities: z.array(z.string()).default([]),
    bestFor: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),

    prosAndCons: z.object({
      pros: z.array(z.string()).default([]),
      cons: z.array(z.string()).default([]),
    }).optional(),

    bookingUrl: z.string(),
    affiliateLinks: z.array(z.object({
      partner: z.string(),
      url: z.string(),
      label: z.string().default('Check Rates'),
    })).default([]),

    rating: z.number().min(1).max(10),
    reviewCount: z.number(),

    checkInOut: z.object({
      checkIn: z.string().default('15:00'),
      checkOut: z.string().default('11:00'),
    }).optional(),

    seasonalInfo: z.object({
      bestTime: z.string(),
      peakSeason: z.string().optional(),
      lowSeason: z.string().optional(),
      notes: z.string().optional(),
    }).optional(),

    nearbyAttractions: z.array(z.object({
      name: z.string(),
      distance: z.string(),
    })).default([]),

    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),

    featured: z.boolean().default(false),
    editorsPick: z.boolean().default(false),
    trending: z.boolean().default(false),
    status: z.enum(['published', 'draft', 'archived']).default('published'),
    publishedDate: z.date().optional(),
    updatedDate: z.date().optional(),

    seo: seoSchema,
  }),
});

// ── Categories ────────────────────────────────────────────────
const categories = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string().optional(),
    description: z.string(),
    icon: z.string(),
    coverImage: z.string().optional(),
    heroImage: z.string().optional(),
    stats: z.object({
      hotelCount: z.number(),
      avgPrice: z.number(),
      topDestination: z.string(),
    }),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    // Legacy flat SEO fields (existing content)
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    // Nested SEO object (new content)
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      ogImage: z.string().optional(),
    }).optional(),
  }),
});

// ── Blog ──────────────────────────────────────────────────────
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string().default('StayAtNiche Team'),
    category: z.string(),
    excerpt: z.string(),
    coverImage: z.string().optional(),
    publishedDate: z.date(),
    updatedDate: z.date().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    affiliateDisclosure: z.boolean().default(true),
    sponsored: z.boolean().default(false),
    relatedHotels: z.array(z.string()).default([]),
    status: z.enum(['published', 'draft']).default('published'),
    seo: seoSchema,
  }),
});

// ── Destinations ──────────────────────────────────────────────
const destinations = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    type: z.enum(['country', 'city', 'region', 'island']),
    continent: z.string(),
    country: z.string().optional(),
    description: z.string(),
    coverImage: z.string().optional(),
    heroImage: z.string().optional(),
    essentials: z.object({
      currency: z.string().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      visaInfo: z.string().optional(),
      plugType: z.string().optional(),
    }).optional(),
    bestTimeToVisit: z.object({
      summary: z.string(),
      details: z.string().optional(),
    }).optional(),
    mustSee: z.array(z.string()).default([]),
    travelTips: z.array(z.string()).default([]),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    seo: seoSchema,
  }),
});

// ── Experiences ───────────────────────────────────────────────
const experiences = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.string(),
    destination: z.string(),
    country: z.string(),
    description: z.string(),
    coverImage: z.string().optional(),
    booking: z.object({
      provider: z.string(),
      url: z.string(),
      price: z.string(),
      duration: z.string(),
    }),
    highlights: z.array(z.string()).default([]),
    included: z.array(z.string()).default([]),
    notIncluded: z.array(z.string()).default([]),
    rating: z.number().min(1).max(10).optional(),
    reviewCount: z.number().optional(),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }).optional(),
  }),
});

// ── Settings ──────────────────────────────────────────────────
const settings = defineCollection({
  type: 'data',
  schema: z.record(z.unknown()),
});

export const collections = {
  hotels,
  categories,
  blog,
  destinations,
  experiences,
  settings,
};
