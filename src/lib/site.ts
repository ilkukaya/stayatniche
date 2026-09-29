export const SITE = 'https://stayatniche.com';
export const isLive = <T extends { data: { status?: string } }>(e: T) =>
  e.data.status !== 'draft' && e.data.status !== 'archived';
