export const SITE = 'https://stayatniche.com';
export const isLive = <T extends { data: { status?: string } }>(e: T) =>
  e.data.status !== 'draft' && e.data.status !== 'archived';

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const startPrice = (range: string) => {
  const m = range.match(/[\d,]+/);
  return m ? parseInt(m[0].replace(/,/g, ''), 10) : 0;
};
