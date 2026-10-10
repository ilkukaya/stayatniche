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

// Partners approved in the Travelpayouts account (My Programs, 27 programs, checked 2026-10-10).
// Plain links to these are converted by Drive; links to hosts outside this list are treated as
// ordinary external links and earn nothing, so the site does not promote them.
// Program ids in brackets (app.travelpayouts.com/programs/<id>).
export const APPROVED = [
  'expedia.com',          // Expedia [594], hotels
  'klook.com',            // Klook [137], tours, transfers, eSIM, car rental
  'kkday.com',            // KKday [633], tours
  'tiqets.com',           // Tiqets [89], attraction tickets
  'gocity.com',           // Go City [62], city passes
  'wegotrip.com',         // WeGoTrip [150], audio tours
  'aviasales.com',        // Aviasales [100], flights
  'kiwi.com',             // Kiwi.com [111], flights
  'welcomepickups.com',   // Welcome Pickups [627], transfers
  'kiwitaxi.com',         // Kiwitaxi [1], transfers
  'gettransfer.com',      // GetTransfer [147], transfers
  'intui.travel',         // intui.travel [22], transfers
  'localrent.com',        // Localrent [87], car rental
  'getrentacar.com',      // GetRentacar [222], car rental
  'qeeq.com',             // QEEQ [172], car rental
  'economybookings.com',  // Economybookings [10], car rental
  'autoeurope.eu',        // AutoEurope EU/UK [143], car rental (not autoeurope.com)
  'bikesbooking.com',     // BikesBooking [57], scooters and bikes
  'airalo.com',           // Airalo [541], eSIM
  'yesim.tech', 'yesim.app', // Yesim [224], eSIM
  'saily.com',            // Saily [629], eSIM
  'gigsky.com',           // GigSky [636], eSIM
  'drimsim.com',          // Drimsim [102], SIM
  'ektatraveling.com',    // EKTA [225], travel insurance
  'airhelp.com',          // AirHelp [120], flight compensation
  'compensair.com',       // Compensair [86], flight compensation
  'radicalstorage.com',   // Radical Storage [209], luggage storage
];

export const hostKey = (host) => host.replace(/^www\./, '').toLowerCase();
export const isPartner = (host) => APPROVED.some(d => hostKey(host) === d || hostKey(host).endsWith('.' + d));

// Partner deep links we could not verify (search pages for small places often 404 or bounce
// to the homepage) are sent to a stable landing page instead. Tracking works the same way.
// Tested on the live site 2026-09-29: Kiwi, Welcome Pickups, Localrent, Tiqets search,
// Radical Storage city links did not land on a useful page for small destinations.
const SAFE_LANDING = {
  'kiwi.com': 'https://www.kiwi.com/en/',
  'welcomepickups.com': 'https://www.welcomepickups.com/',
  'localrent.com': 'https://localrent.com/en/',
  'tiqets.com': 'https://www.tiqets.com/en/',
  'radicalstorage.com': 'https://radicalstorage.com/',
  'kiwitaxi.com': 'https://kiwitaxi.com/',
  'gettransfer.com': 'https://gettransfer.com/',
  'qeeq.com': 'https://www.qeeq.com/',
  'autoeurope.eu': 'https://www.autoeurope.eu/',
  'economybookings.com': 'https://www.economybookings.com/',
  'intui.travel': 'https://intui.travel/',
  'bikebooking.com': 'https://www.bikesbooking.com/',
  'bikesbooking.com': 'https://www.bikesbooking.com/',
  'getrentacar.com': 'https://getrentacar.com/',
  'aviasales.com': 'https://www.aviasales.com/',
  'wegotrip.com': 'https://wegotrip.com/',
};
/** Keep homepages and deep links on hosts we trust; replace guessed deep links with a stable page. */
export function safeUrl(url) {
  let u;
  try { u = new URL(url); } catch { return url; }
  const landing = SAFE_LANDING[hostKey(u.hostname)];
  const isRoot = (u.pathname === '/' || /^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(u.pathname)) && !u.search;
  return landing && !isRoot ? landing : url;
}

/** Tracked link for verified programs, otherwise the (safe) URL for Drive to convert. */
export function partnerLink(rawUrl, subId) {
  const url = safeUrl(rawUrl);
  let u;
  try { u = new URL(url); } catch { return url; }
  const v = VERIFIED[hostKey(u.hostname)];
  if (!v) return url;
  const sub = subId ? `&sub_id=${encodeURIComponent(String(subId).slice(0, 60))}` : '';
  return `https://tp.media/r?campaign_id=${v.campaign}&marker=${TP_MARKER}&p=${v.p}&trs=${TP_TRS}&u=${encodeURIComponent(url)}${sub}`;
}
