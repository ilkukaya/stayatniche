import { defineCollection, z } from 'astro:content';

const categories = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    coverImage: z.string(),
    stats: z.object({
      hotelCount: z.number(),
      avgPrice: z.number(),
      topDestination: z.string(),
    }),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }),
});

const hotels = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    category: z.string(),
    destination: z.string(),
    country: z.string(),
    description: z.string(),
    coverImage: z.string(),
    gallery: z.array(z.string()).default([]),
    priceRange: z.string(),
    priceIndicator: z.number().min(1).max(5),
    highlights: z.array(z.string()).default([]),
    amenities: z.array(z.string()).default([]),
    bestFor: z.array(z.string()).default([]),
    bookingUrl: z.string().url(),
    rating: z.number().min(1).max(10),
    reviewCount: z.number(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    featured: z.boolean().default(false),
  }),
});

const settings = defineCollection({
  type: 'data',
  schema: z.object({
    siteName: z.string().optional(),
    siteDescription: z.string().optional(),
    affiliateId: z.string().optional(),
  }),
});

export const collections = { categories, hotels, settings };
