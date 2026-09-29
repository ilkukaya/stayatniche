// Travelpayouts link builder, shared by build-time helpers and the markdown rehype plugin.
//
// Format verified against a link generated in the Travelpayouts dashboard (Create link):
//   https://tp.media/r?campaign_id=594&marker=688397&p=8645&trs=478307&u=<encoded url>
//   marker = partner (account) ID, trs = project "Stayatniche" ID, p + campaign_id = program.
//
// Only programs whose p/campaign_id were verified from a dashboard-generated link are listed in
// VERIFIED. Links to every other partner are emitted as plain brand URLs, which Travelpayouts
// Drive ("Switch Links") converts to tracked links in the browser. Never guess program IDs:
// a wrong ID silently earns nothing.
export const TP_MARKER = '688397';
export const TP_TRS = '478307';

export const VERIFIED = {
  'expedia.com': { p: '8645', campaign: '594' },
};

// Partners approved in the Travelpayouts account (My Programs). Plain links to these are
// converted by Drive; links to hosts outside this list are treated as ordinary external links.
export const APPROVED = [
  'expedia.com', 'klook.com', 'aviasales.com', 'tiqets.com', 'kiwi.com', 'welcomepickups.com',
  'intui.travel', 'localrent.com', 'gettransfer.com', 'kiwitaxi.com', 'getrentacar.com',
  'radicalstorage.com', 'compensair.com', 'yesim.app', 'ekta.travel', 'bikesbooking.com',
  'bikebooking.com', 'qeeq.com', 'airalo.com', 'drimsim.com', 'airhelp.com',
  'economybookings.com', 'wegotrip.com', 'autoeurope.com', 'autoeurope.eu', 'saily.com',
];

export const hostKey = (host) => host.replace(/^www\./, '').toLowerCase();
export const isPartner = (host) => APPROVED.some(d => hostKey(host) === d || hostKey(host).endsWith('.' + d));

/** Tracked link for verified programs, otherwise the URL unchanged (Drive converts it). */
export function partnerLink(url, subId) {
  let u;
  try { u = new URL(url); } catch { return url; }
  const v = VERIFIED[hostKey(u.hostname)];
  if (!v) return url;
  const sub = subId ? `&sub_id=${encodeURIComponent(String(subId).slice(0, 60))}` : '';
  return `https://tp.media/r?campaign_id=${v.campaign}&marker=${TP_MARKER}&p=${v.p}&trs=${TP_TRS}&u=${encodeURIComponent(url)}${sub}`;
}
