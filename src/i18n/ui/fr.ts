/**
 * Dictionnaire français (vouvoiement). Même structure que en.ts.
 * Typographie : espace fine insécable (U+202F) avant ; : ! ? et $, et à l’intérieur des « ».
 */
import type en from './en';
import type { HotelFaq } from './en';

/** En français, 0 et 1 sont au singulier. */
const plural = (n: number, one: string, many: string) => (Math.abs(n) < 2 ? one : many);

/** « a, b et c » */
const listJoin = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}`);

const lcFirst = (s: string) => (s && !/^.[A-ZÀ-Ý]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const ucFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Catégories : forme nominale (utilisable en milieu de phrase) et genre ──
type Gender = 'm' | 'f';
const CATS: Record<string, [string, Gender]> = {
  'cabanes dans les arbres': ['cabanes dans les arbres', 'f'],
  'hôtels troglodytes': ['hôtels troglodytes', 'm'],
  'chambres sous-marines': ['chambres sous-marines', 'f'],
  'châteaux-hôtels': ['châteaux-hôtels', 'm'],
  'hôtels flottants': ['hôtels flottants', 'm'],
  'bulles transparentes': ['bulles transparentes', 'f'],
  'hôtels à flanc de falaise': ['hôtels à flanc de falaise', 'm'],
  'camps dans le désert': ['camps dans le désert', 'm'],
  'lodges dans la jungle': ['lodges dans la jungle', 'm'],
  'hôtels de glace': ['hôtels de glace', 'm'],
  'lodges de safari': ['lodges de safari', 'm'],
  'bungalows sur pilotis': ['bungalows sur pilotis', 'm'],
  'dormir dans un phare': ['phares où dormir', 'm'],
  'trains-hôtels': ['trains-hôtels', 'm'],
};
const catInfo = (cat: string): [string, Gender] => CATS[cat.trim().toLowerCase()] ?? [lcFirst(cat.trim()), 'm'];
const noun = (cat: string) => catInfo(cat)[0];
const g = (cat: string, m: string, f: string) => (catInfo(cat)[1] === 'f' ? f : m);

// ── Pays : préposition (en / au / aux / à) et article ──
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-\s]+/g, ' ').trim();
const AUX = new Set(['etats unis', 'emirats arabes unis', 'maldives', 'bahamas', 'seychelles', 'philippines', 'pays bas', 'fidji', 'comores', 'galapagos', 'acores', 'canaries', 'baleares']);
const A = new Set(['sainte lucie', 'oman', 'maurice', 'singapour', 'cuba', 'madagascar', 'malte', 'chypre', 'bali', 'tahiti', 'bora bora', 'zanzibar', 'hawai', 'taiwan', 'monaco', 'bahrein', 'porto rico', 'hong kong', 'borneo', 'sao tome et principe']);
const MASC_E = new Set(['mexique', 'cambodge', 'mozambique', 'zimbabwe', 'belize', 'suriname']);
type Prep = 'en' | 'au' | 'aux' | 'à' | 'dans';
const prep = (c: string): Prep => {
  const n = norm(c.split(/\s*[/(]/)[0]);
  if (n.startsWith('plusieurs')) return 'dans';
  if (AUX.has(n)) return 'aux';
  if (A.has(n)) return 'à';
  if (n.startsWith('pays de galles')) return 'au';
  if (/^[aeiouy]/.test(n)) return 'en';
  if (n.endsWith('e') && !MASC_E.has(n)) return 'en';
  return 'au';
};
/** « en Suède », « au Japon », « aux Maldives », « à Sainte-Lucie » */
const inCountry = (c: string) => (prep(c) === 'dans' ? `dans ${lcFirst(c)}` : `${prep(c)} ${c}`);
/** « la Suède », « l’Inde », « le Japon », « les Maldives », « Oman » (après « vers ») */
const theCountry = (c: string) => {
  const p = prep(c);
  if (p === 'aux') return `les ${c}`;
  if (p === 'dans') return lcFirst(c);
  if (p === 'à' || norm(c).startsWith('israel')) return c;
  if (/^[aeiouyh]/.test(norm(c))) return `l’${c}`;
  return p === 'en' ? `la ${c}` : `le ${c}`;
};

const usd = (amount: string) => `${amount} $`;

const fr: typeof en = {
  meta: {
    defaultDescription: 'Les hôtels les plus insolites du monde : cabanes dans les arbres, grottes, chambres sous-marines, châteaux, hôtels de glace et bien plus. Des adresses qui font le voyage.',
  },
  fmt: {
    usd,
    usdRange: (a: string, b: string) => `${a}–${b} $`,
  },
  common: {
    home: 'Accueil',
    skip: 'Aller au contenu',
    breadcrumb: 'Fil d’Ariane',
    stays: (n: number) => `${n} ${plural(n, 'hébergement', 'hébergements')}`,
    faqHeading: 'Questions fréquentes',
    quickAnswers: 'En bref',
    advertisement: 'Publicité',
    priceLevels: ['', 'Petit budget', 'Prix modérés', 'Haut de gamme', 'Luxe', 'Ultra-luxe'],
    readMore: 'Lire la suite',
    updated: 'Mis à jour',
    viewAll: 'Tout voir',
    notFoundTitle: 'Page introuvable',
  },
  nav: {
    homeLabel: 'Accueil StayAtNiche',
    home: 'Accueil',
    main: 'Navigation principale',
    mobile: 'Navigation mobile',
    stays: 'Hébergements',
    explore: 'Explorer',
    countries: 'Pays',
    destinations: 'Destinations',
    guides: 'Guides',
    about: 'À propos',
    search: 'Rechercher',
    saved: 'Favoris',
    savedStays: 'Mes favoris',
    searchPlaceholder: 'Un hébergement, un lieu…',
    browseAll: 'Tous les types d’hébergement',
    kindsOfStay: 'Types d’hébergement',
    menu: 'Menu',
    language: 'Langue',
  },
  footer: {
    tagline: 'Des hôtels qui valent le voyage. Cabanes dans les arbres, grottes, chambres sous la mer, et tout ce qui se cache entre les deux.',
    letterTitle: 'La lettre du vendredi',
    letterText: 'Un hébergement insolite par semaine. Zéro spam, désinscription en un clic.',
    email: 'Adresse e-mail',
    emailPlaceholder: 'vous@exemple.fr',
    subscribe: 'S’abonner',
    colStays: 'Types d’hébergement',
    colDestinations: 'Destinations phares',
    colResources: 'Ressources voyage',
    allCategories: 'Tous les types d’hébergement',
    allDestinations: 'Toutes les destinations',
    byCountry: 'Hôtels par pays',
    guides: 'Guides de voyage',
    experiences: 'Expériences',
    about: 'À propos de StayAtNiche',
    contact: 'Contact',
    newsletter: 'Newsletter',
    privacy: 'Confidentialité',
    disclosure: 'Transparence',
    photoCredits: 'Crédits photo',
    affiliateNote: 'Certains liens sont affiliés : nous pouvons percevoir une commission, sans surcoût pour vous.',
  },
  card: {
    editorsPick: 'Coup de cœur',
    around: (place: string) => `Autour de ${place}`,
    save: (name: string) => `Ajouter ${name} aux favoris`,
    scoreTitle: 'Note de la rédaction sur 10',
    from: 'À partir de',
    perNight: '/ nuit',
    seeRates: 'Voir les tarifs',
    checkRates: 'Vérifier les tarifs',
  },
  essentials: {
    title: 'Préparer le voyage',
    disclaimer: 'Liens partenaires : nous pouvons percevoir une commission, sans surcoût pour vous.',
    intro: (where: string) => `Destination ${where} : tout le reste pour votre voyage, avec des services que nous utilisons nous-mêmes.`,
    with: (brand: string) => `avec ${brand}`,
    groups: { there: 'Pour y aller', during: 'Sur place', before: 'Avant de partir' },
    items: {
      flights: { label: 'Vols', desc: (c: string) => `Comparez les vols et les combinaisons d’itinéraires astucieuses vers ${theCountry(c)}.`, cta: 'Chercher un vol' },
      transfer: { label: 'Transfert aéroport', desc: (_c: string) => 'Un chauffeur à prix fixe vous attend dès votre arrivée.', cta: 'Réserver un transfert' },
      car: { label: 'Location de voiture', desc: (_c: string) => 'Des voitures proposées par des loueurs locaux.', cta: 'Comparer les voitures' },
      tours: { label: 'Visites et activités', desc: (c: string) => `Excursions à la journée et expériences ${inCountry(c)}.`, cta: 'Trouver une activité' },
      tickets: { label: 'Billets d’entrée', desc: (_c: string) => 'Billets mobiles instantanés pour les musées et les sites à voir.', cta: 'Obtenir des billets' },
      luggage: { label: 'Consigne à bagages', desc: (_c: string) => 'Déposez vos bagages et explorez les mains libres.', cta: 'Trouver une consigne' },
      esim: { label: 'Données mobiles eSIM', desc: (c: string) => `Internet mobile ${inCountry(c)}, sans frais d’itinérance.`, cta: 'Obtenir une eSIM' },
      insurance: { label: 'Assurance voyage', desc: (_c: string) => 'Une couverture médicale pour votre voyage, souscrite en ligne.', cta: 'Obtenir un devis' },
      delay: { label: 'Vol retardé ?', desc: (_c: string) => 'Vérifiez si un retard ou une annulation vous donne droit à une indemnisation.', cta: 'Vérifier mon vol' },
    },
  },
  roundup: {
    note: 'Classement de la rédaction. Les prix sont des fourchettes indicatives par nuit ; vérifiez les tarifs en temps réel. Certains liens sont affiliés :',
    disclosure: 'consultez notre page transparence.',
    compare: 'Le comparatif en un coup d’œil',
    th: { stay: 'Hébergement', where: 'Lieu', type: 'Type', price: 'Prix indicatif / nuit', bestFor: 'Idéal pour' },
    swipe: 'Faites glisser le tableau sur le côté pour voir toutes les colonnes.',
    // Le lieu reçu est le nom anglais du pays : on formule sans lui.
    more: (_place: string) => 'Envie d’autres options dans les environs ?',
    expedia: 'Comparer les hôtels sur Expedia',
    tours: 'Trouver visites et activités',
    keepExploring: 'Poursuivre l’exploration',
  },
  blog: {
    metaTitle: 'Guides de voyage : hôtels insolites et destinations',
    metaDescription: 'Les hôtels les plus insolites du monde (cabanes, grottes, hôtels de glace, lodges de safari), mais aussi des guides de destination et des conseils pratiques.',
    lead: 'Où dormir, quand partir, comment s’y rendre : pour des voyages pensés autour d’une nuit hors du commun.',
    readGuide: 'Lire le guide',
    filter: 'Filtrer les guides',
    kinds: { guide: 'Guide', listicle: 'Sélection', 'travel-tips': 'Conseils voyage', 'destination-guide': 'Guide de destination' } as Record<string, string>,
  },
  hotel: {
    metaTitle: (name: string, dest: string) => `${name} — ${dest} | StayAtNiche`,
    categories: 'Catégories',
    editorScore: 'note de la rédaction',
    save: 'Enregistrer',
    share: 'Partager',
    linkCopied: 'Lien copié',
    photoAlt: (name: string, n: number) => `${name}, photo ${n}`,
    noPhoto: 'Les photos de cet établissement sont visibles sur ses pages de réservation.',
    photo: 'Photo',
    viaCommons: 'via Wikimedia Commons',
    areaPhoto: 'Photo des environs',
    facts: { price: 'Prix indicatif', ratesVary: 'Tarifs variables : vérifiez les prix en temps réel', level: 'Gamme de prix', bestTime: 'Meilleure période', checkInOut: 'Arrivée / départ', bestFor: 'Idéal pour', score: 'Note de la rédaction' },
    why: 'Pourquoi nous l’avons retenu',
    included: 'Ce qui est inclus',
    goodToKnow: 'Bon à savoir',
    whereItIs: 'Où il se trouve',
    mapOf: (name: string) => `Carte : ${name}`,
    openMaps: 'Ouvrir dans Google Maps',
    ratesVary: 'Tarifs variables',
    typicalRange: (r: string) => `Fourchette habituelle : ${r}. Le prix en temps réel dépend de vos dates.`,
    checkPricesOn: (p: string) => `Voir les prix sur ${p}`,
    enterDates: 'Saisissez vos dates sur la page suivante pour afficher les tarifs en temps réel.',
    comparePrices: 'Comparer les prix',
    viewDeal: 'Voir l’offre',
    commission: 'Nous pouvons percevoir une commission si vous réservez, sans surcoût pour vous.',
    timingTip: 'Le bon moment',
    more: (cat: string) => (cat.trim() ? `D’autres ${noun(cat)}` : 'D’autres hébergements insolites'),
    seeAll: 'Tout voir',
    offers: { expedia: 'Prix membres, offres vol + hôtel', booking: 'Annulation gratuite sur de nombreuses chambres', officialName: 'Site officiel', official: 'Réservez en direct auprès de l’établissement' },
    faq: (h: HotelFaq) => [
      { q: `Où se trouve ${h.name} ?`, a: `Localisation : ${h.destination}, ${h.country}${h.address ? ` (${h.address})` : ''}. L’établissement figure dans notre sélection ${h.collection ? `« ${h.collection} »` : 'd’hébergements insolites'}.` },
      { q: `${h.name} : combien coûte une nuit ?`, a: h.fromOnly ? `Comptez ${lcFirst(h.priceRange)} la nuit ; les prix varient selon la saison et les disponibilités, vérifiez donc les tarifs en temps réel pour vos dates.` : h.hasPrice ? `Comptez généralement ${h.priceRange} la nuit${h.level ? ` (catégorie ${h.level.toLowerCase()})` : ''}. Les prix varient selon la saison et les disponibilités : vérifiez les tarifs en temps réel avant d’organiser votre séjour.` : 'Les tarifs varient selon la saison et le type de chambre ; vérifiez les prix en temps réel pour vos dates.' },
      ...(h.bestTime ? [{ q: `${h.name} : quelle est la meilleure période pour y séjourner ?`, a: `${h.bestTime.replace(/\.\s*$/, '')}.${h.seasonNotes ? ' ' + h.seasonNotes : ''}` }] : []),
      ...(h.bestFor.length ? [{ q: `${h.name} : pour quels voyageurs ?`, a: `Idéal pour : ${h.bestFor.join(', ').toLowerCase()}.` }] : []),
      ...(h.checkIn ? [{ q: `${h.name} : quels sont les horaires d’arrivée et de départ ?`, a: `Arrivée à partir de ${h.checkIn}, départ avant ${h.checkOut}. Confirmez ces horaires auprès de l’établissement au moment de réserver.` }] : []),
      ...(h.nearby.length ? [{ q: `Que faire autour de ${h.name} ?`, a: `À proximité : ${h.nearby.join(' ; ')}.` }] : []),
    ],
  },
  explore: {
    listName: 'Hôtels hors du commun : StayAtNiche',
    metaTitle: 'Tous les hôtels insolites : filtrez par type, prix et lieu',
    metaDescription: (n: number) => `${n} ${plural(n, 'hébergement hors du commun', 'hébergements hors du commun')} dans le monde : cabanes dans les arbres, hôtels troglodytes, lodges de safari, hôtels de glace… Filtrez par prix et destination.`,
    h1: 'Explorez tous nos hébergements',
    lead: 'Filtrez par type d’hébergement, budget et lieu. Par défaut, les adresses sont triées selon la note de la rédaction.',
    kind: 'Type d’hébergement',
    all: 'Tous',
    searchLabel: 'Rechercher par nom ou par lieu',
    searchPlaceholder: 'Nom, pays ou lieu',
    budget: 'Budget',
    sort: 'Trier',
    sorts: { top: 'Les mieux notés', low: 'Prix croissant', high: 'Prix décroissant', az: 'Nom de A à Z' },
    clearAll: 'Tout effacer',
    emptyTitle: 'Aucun hébergement ne correspond à ces filtres',
    emptyText: 'Élargissez votre budget ou essayez un autre type d’hébergement.',
    clearFilters: 'Réinitialiser les filtres',
  },
  categories: {
    metaTitle: 'Tous les types d’hébergements insolites | StayAtNiche',
    metaDescription: 'Toutes nos catégories d’hôtels hors du commun : cabanes dans les arbres, grottes, chambres sous-marines, châteaux, hôtels flottants et bulles transparentes.',
    count: (n: number) => `${n} ${plural(n, 'catégorie unique', 'catégories uniques')} dans le monde`,
    h1a: 'Chaque séjour est',
    h1b: 'extraordinaire',
    lead: 'Nous avons parcouru le globe pour dénicher les hébergements les plus remarquables. Chaque catégorie ouvre la porte à un séjour dont vous vous souviendrez.',
    editorsPicks: 'Coups de cœur de la rédaction',
    all: 'Toutes les catégories',
    ctaTitle: 'Vous hésitez ? Laissez-vous inspirer.',
    ctaText: 'Parcourez nos adresses coups de cœur, toutes catégories confondues, choisies pour leur effet waouh, leur rapport qualité-prix et leur singularité.',
    ctaButton: 'Voir la sélection',
  },
  category: {
    seeAll: (n: number) => (n > 1 ? `Voir les ${n} hébergements` : `Voir ${n} hébergement`),
    atAGlance: 'En un coup d’œil',
    total: 'Nombre d’adresses',
    median: 'Prix de départ médian',
    topSpot: 'Destination phare',
    allCategories: 'Toutes les catégories',
    everyWeList: (title: string) => `${g(title, 'Tous', 'Toutes')} les ${noun(title)} de notre sélection`,
    properties: (n: number) => `${n} ${plural(n, 'établissement', 'établissements')}`,
    about: (title: string) => `À propos des ${noun(title)}`,
    other: 'Autres types d’hébergement',
  },
  destinations: {
    metaTitle: 'Destinations : où trouver les hôtels les plus insolites',
    metaDescription: (n: number) => `${n} ${plural(n, 'guide de destination pensé', 'guides de destination pensés')} autour d’hébergements d’exception : quand partir, que voir, et les hôtels insolites qui valent le voyage.`,
    h1a: 'Et maintenant,',
    h1b: 'où partir ?',
    lead: (n: number) => `${n} ${plural(n, 'guide de destination', 'guides de destination')}, autour des adresses qui valent le voyage. Quand partir, que voir et où dormir.`,
    continents: 'Continents',
    morePlaces: 'Autres destinations',
    // Suivi de « : » dans la vue : l’espace fine est incluse ici.
    best: 'Quand partir ',
    unusualStays: (n: number) => `${n} ${plural(n, 'hébergement insolite', 'hébergements insolites')}`,
    types: { country: 'Pays', city: 'Ville', region: 'Région', island: 'Île' },
  },
  destination: {
    metaTitle: (name: string) => `${name} : guide et nuits insolites | StayAtNiche`,
    dontMiss: 'À ne pas manquer',
    tips: 'Conseils d’initiés',
    bestTime: 'Quand partir',
    essentials: 'L’essentiel avant de partir',
    currency: 'Monnaie',
    language: 'Langue',
    timezone: 'Fuseau horaire',
    plug: 'Type de prise',
    visa: 'Visa',
    bookTrip: 'Réserver le voyage',
    affiliate: 'Liens affiliés, sans surcoût pour vous.',
    placesToSleep: 'Où dormir',
    handPicked: (name: string) => `${name} : notre sélection d’hôtels insolites qui valent vraiment le voyage.`,
    browseCategories: 'Voir toutes les catégories',
    // Suivi du nom de la destination dans la vue.
    placesToStay: (n: string) => `Où dormir : ${n}`,
  },
  post: {
    team: 'L’équipe StayAtNiche',
    containsAffiliate: 'Contient des liens affiliés',
    planTrip: 'Préparez votre voyage',
    affiliate: 'Liens affiliés : nous percevons une commission, sans surcoût pour vous.',
    relatedA: 'Des adresses',
    relatedB: 'hors du commun à réserver',
  },
  countries: {
    metaTitle: 'Hôtels insolites par pays',
    metaDescription: 'Les hôtels les plus extraordinaires, pays par pays : cabanes dans les arbres, grottes, lodges de safari, villas sur pilotis et bien plus encore.',
    h1: 'Hôtels insolites par pays',
    lead: 'Choisissez un pays pour comparer ses hébergements les plus extraordinaires.',
  },
  countryPage: {
    title: (c: string, n: number) => `Hôtels insolites ${inCountry(c)} : ${n} ${plural(n, 'adresse qui vaut', 'adresses qui valent')} le voyage`,
    metaTitle: (c: string, n: number) => `${n} ${plural(n, 'hôtel insolite', 'hôtels insolites')} ${inCountry(c)} : comparatif`,
    metaDescription: (c: string, n: number, types: string[]) => `Comparez ${n} ${plural(n, 'hôtel d’exception', 'hôtels d’exception')} ${inCountry(c)} : ${types.map(noun).join(', ')} et bien plus. Prix indicatifs, profil idéal et où vérifier les tarifs.`,
    intro: (c: string, n: number, types: string[], from: string, cheapest: string, top: string) => `${n} ${plural(n, 'adresse triée', 'adresses triées')} sur le volet ${inCountry(c)}, entre ${listJoin(types.map(noun))}, et bien d’autres encore. Les prix démarrent autour de ${from} la nuit chez ${cheapest} ; notre adresse la mieux notée est ${top}.`,
    catWorldwide: (cat: string) => `${cat} à travers le monde`,
    guide: (name: string) => `Guide de voyage : ${name}`,
    faq: (f: { country: string; n: number; top: string; topWhere: string; types: string[]; cheapest: string; cheapestWhere: string; cheapestRange: string; seasons: string[] }) => [
      { q: `Quels sont les hôtels les plus insolites ${inCountry(f.country)} ?`, a: `Notre coup de cœur : ${f.top} (${f.topWhere}). Nous recensons ${f.n} ${plural(f.n, 'adresse remarquable', 'adresses remarquables')} ${inCountry(f.country)}, notamment : ${listJoin(f.types.map(noun))}.` },
      { q: `Quel est l’hôtel insolite le moins cher ${inCountry(f.country)} ?`, a: `${f.cheapest} (${f.cheapestWhere}) affiche le tarif habituel le plus bas de notre sélection : comptez ${lcFirst(f.cheapestRange)} la nuit. Les prix varient selon la saison, vérifiez donc les tarifs en temps réel.` },
      { q: `Quand partir ${inCountry(f.country)} pour profiter de ces adresses ?`, a: f.seasons.join(' ; ') || 'Tout dépend de l’établissement : consultez la fiche de chaque hôtel pour connaître la meilleure saison.' },
    ],
  },
  best: {
    slug: (cat: string, country: string) => `${cat}-${prep(country) === 'à' ? 'a' : prep(country)}-${country}`,
    title: (cat: string, c: string) => `Les plus ${g(cat, 'beaux', 'belles')} ${noun(cat)} ${inCountry(c)}`,
    metaTitle: (cat: string, c: string, n: number) => `${ucFirst(noun(cat))} ${inCountry(c)} : notre top ${n}`,
    metaDescription: (cat: string, c: string, names: string[]) => `Notre comparatif des plus ${g(cat, 'beaux', 'belles')} ${noun(cat)} ${inCountry(c)} : ${names.join(', ')}. Prix indicatifs et, pour chaque adresse, les voyageurs à qui elle convient.`,
    intro: (cat: string, c: string, n: number, top: string, topWhere: string, cheapest: string) => `${ucFirst(noun(cat))} ${inCountry(c)} : notre rédaction a classé ${plural(n, `l’adresse qui sort du lot`, `les ${n} adresses qui sortent du lot`)}. Commencez par ${top} (${topWhere}) ; la plus abordable est ${cheapest}.`,
    allCat: (cat: string) => `${g(cat, 'Tous', 'Toutes')} les ${noun(cat)}`,
    allIn: (c: string) => `Tous les hébergements ${inCountry(c)}`,
    faq: (f: { cat: string; country: string; names: string[]; top: string; topWhere: string; cheapFrom: string; cheapest: string }) => [
      { q: `${g(f.cat, 'Quels', 'Quelles')} sont les plus ${g(f.cat, 'beaux', 'belles')} ${noun(f.cat)} ${inCountry(f.country)} ?`, a: `${listJoin(f.names)}. L’adresse la mieux notée par notre rédaction : ${f.top} (${f.topWhere}).` },
      { q: `Quel budget prévoir pour les ${noun(f.cat)} ${inCountry(f.country)} ?`, a: `Comptez à partir d’environ ${f.cheapFrom} la nuit (${f.cheapest}). Vérifiez toujours les tarifs en temps réel pour vos dates.` },
    ],
  },
  static: {
    // Suivi de « : » dans la vue : l’espace fine est incluse ici.
    updated: 'Dernière mise à jour ',
    aboutCta: 'Envie de trouver votre séjour hors du commun ?',
    aboutCtaButton: 'Explorer tous les hébergements',
  },
  search: {
    metaTitle: 'Rechercher des hôtels insolites, destinations et guides',
    metaDescription: 'Recherchez sur StayAtNiche : cabanes dans les arbres, hôtels troglodytes, chambres sous-marines, lodges de safari, destinations et guides de voyage.',
    label: 'Rechercher des hôtels, destinations et guides',
    placeholder: 'Essayez « cabane », « Islande » ou « lune de miel »…',
    results: (n: number) => `${n} ${plural(n, 'résultat', 'résultats')}`,
    none: 'Aucun résultat. Essayez un terme plus général.',
    types: { hotel: 'Hôtel', category: 'Catégorie', destination: 'Destination', guide: 'Guide', experience: 'Expérience' },
  },
  saved: {
    metaTitle: 'Vos hébergements favoris',
    metaDescription: 'Les hébergements que vous avez ajoutés à vos favoris sur StayAtNiche.',
    h1: 'Mes favoris',
    lead: 'Enregistrés sur cet appareil uniquement. Touchez le cœur d’un hébergement pour l’ajouter ici.',
    emptyTitle: 'Aucun favori pour l’instant',
    emptyText: 'Trouvez l’adresse qui vous fait rêver et touchez le cœur.',
    explore: 'Explorer les hébergements',
  },
  contact: {
    metaTitle: 'Contactez-nous | StayAtNiche',
    metaDescription: 'Une question, une correction ou un établissement à nous suggérer ? Écrivez à l’équipe StayAtNiche.',
    h1: 'Parlons-en',
    lead: 'Une question, une correction, ou un lieu extraordinaire que nous devrions connaître ? Nous lisons chaque message.',
    topics: [
      { title: 'Questions générales', text: 'Sur le site, une fiche ou tout autre sujet.' },
      { title: 'Suggérer une adresse', text: 'Vous connaissez un lieu extraordinaire absent de notre sélection ? Dites-nous où il se trouve et ce qui le rend unique.' },
      { title: 'Corrections', text: 'Prix, saisons d’ouverture ou informations qui ont changé. Joignez le lien de la page si possible.' },
      { title: 'Partenariats', text: 'Programmes d’affiliation, médias et collaborations.' },
    ],
    formTitle: 'Envoyez-nous un message',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Adresse e-mail',
    subject: 'Objet',
    chooseTopic: 'Choisissez un sujet…',
    subjects: { general: 'Question générale', property: 'Suggérer une adresse', correction: 'Correction d’une fiche', partnership: 'Partenariat ou presse', other: 'Autre' } as Record<string, string>,
    message: 'Message',
    send: 'Envoyer le message',
    privacyNote: 'Vos coordonnées servent uniquement à vous répondre.',
  },
  newsletter: {
    metaTitle: 'Newsletter : une adresse insolite par semaine | StayAtNiche',
    metaDescription: 'Chaque semaine, gratuitement, un hôtel extraordinaire trié sur le volet, dont vous ignoriez sans doute l’existence. Zéro spam, désinscription à tout moment.',
    h1: 'Une adresse hors du commun, chaque vendredi',
    lead: 'Un lieu où dormir, trié sur le volet, dont vous ignoriez sans doute l’existence : cabanes dans les arbres, chambres sous la mer, igloos de verre, refuges au bord de la falaise. Court, utile, gratuit.',
    button: 'Je m’abonne, c’est gratuit',
    note: 'Zéro spam. Désinscription en un clic. Votre adresse e-mail n’est jamais partagée.',
    whatTitle: 'Ce que vous recevrez',
    what: [
      { title: 'L’adresse de la semaine', text: 'Un hébergement extraordinaire et vérifié : ce qui le rend unique, la chambre à demander, les prix habituels et la meilleure période.' },
      { title: 'Carnets de destination', text: 'De temps à autre, un guide express consacré à une destination où combiner plusieurs adresses insolites.' },
      { title: 'Conseils pratiques', text: 'Quand réserver, quoi emporter, et tous ces détails que les sites des hôtels passent souvent sous silence.' },
    ],
    successEyebrow: 'Inscription confirmée',
    successTitle: 'C’est fait. Merci !',
    successText: 'Votre première adresse hors du commun arrive avec la prochaine lettre du vendredi. D’ici là, vous avez de quoi explorer.',
    backHome: 'Retour à l’accueil',
  },
  notFound: {
    metaTitle: 'Page introuvable | StayAtNiche',
    h1: 'Cette page semble avoir libéré la chambre un peu tôt',
    text: 'La page que vous cherchez n’existe pas ou a été déplacée. Les hébergements les plus extraordinaires du monde ne sont qu’à un clic.',
    maybe: 'Vous cherchiez peut-être l’une de ces pages ?',
  },
  photoCredits: {
    metaTitle: 'Crédits photo',
    metaDescription: 'Crédits et licences des photographies utilisées sur StayAtNiche.',
    lead: 'Les photos d’hôtels et de destinations listées ci-dessous proviennent de Wikimedia Commons, sont utilisées sous licence libre et créditées à leurs auteurs. Les images de catégories et de couverture sont des illustrations originales créées pour StayAtNiche : elles ne représentent aucun établissement en particulier.',
    by: 'par',
  },
  experiences: {
    metaTitle: 'Expériences : visites, activités et aventures | StayAtNiche',
    metaDescription: 'Réservez des expériences inoubliables autour de votre séjour hors du commun : visites guidées, safaris, vols en montgolfière et bien plus encore.',
    h1a: 'Au-delà de la',
    h1b: 'chambre d’hôtel',
    lead: 'Visites, activités et aventures pour prolonger un séjour hors du commun, des vols en montgolfière en Cappadoce aux safaris en Afrique.',
    soon: 'Expériences bientôt disponibles',
    more: 'Autres expériences',
    types: { 'guided-tour': 'Visites guidées', adventure: 'Aventure', cultural: 'Culture', 'food-drink': 'Gastronomie', wellness: 'Bien-être', wildlife: 'Faune sauvage', 'water-activity': 'Sur l’eau', 'night-experience': 'À la nuit tombée', 'day-trip': 'Excursions à la journée' } as Record<string, string>,
  },
  experience: {
    details: 'Détails de l’expérience',
    duration: 'Durée',
    price: 'Prix à partir de',
    provider: 'Prestataire',
    location: 'Lieu',
    book: 'Réserver cette expérience',
    klook: 'Plus d’activités sur Klook',
    tiqets: 'Billets d’entrée sur Tiqets',
    all: 'Toutes les expériences',
    highlightsA: 'Les temps',
    highlightsB: 'forts',
    stayA: 'Où',
    stayB: 'dormir',
  },
  home: {
    metaTitle: 'StayAtNiche : les hébergements les plus insolites du monde',
    metaDescription: 'Des hôtels insolites qui valent le voyage : cabanes dans les arbres, hôtels troglodytes, chambres sous-marines, lodges de safari… Comparez et réservez sereinement.',
    heroAlt: 'Une cabane de verre sur une crête, au-dessus d’une mer de nuages au lever du soleil',
    eyebrow: (h: number, c: number, k: number) => `${h} ${plural(h, 'hébergement', 'hébergements')} · ${c} pays · ${k} ${plural(k, 'façon', 'façons')} de sortir de l’ordinaire`,
    h1a: 'Des hôtels qui valent',
    h1b: 'le voyage.',
    lead: 'Des cabanes perchées au-delà du cercle polaire, des chambres sous la mer, des châteaux, des grottes et des camps. Choisis pour leur histoire, comparés pour leur prix.',
    form: { kind: 'Type d’hébergement', anyKind: 'Tout l’insolite', where: 'Où', wherePlaceholder: 'Pays ou lieu', budget: 'Budget par nuit', anyBudget: 'Tous budgets', search: 'Rechercher' },
    bands: {
      low: { label: `Moins de ${usd('300')}`, note: 'Chambres troglodytes, bulles transparentes, maisons de gardien de phare' },
      mid: { label: `300–800 $`, note: 'Cabanes dans les arbres, camps dans le désert, lodges au design soigné' },
      high: { label: `${usd('800')} et plus`, note: 'Suites sous-marines, îles privées, camps de safari' },
    },
    shortlistEyebrow: 'La sélection',
    shortlistTitle: 'Des adresses qui font des envieux',
    allStays: (n: number) => `Tous nos hébergements (${n})`,
    collection: 'Collection',
    from: (price: string) => `à partir de ${price}`,
    seeAll: (n: number, title: string) => (n > 1 ? `Voir les ${n} ${noun(title)}` : 'Voir la sélection'),
    kindsTitle: 'L’insolite sous toutes ses formes',
    allKinds: (n: number) => `Tous les types (${n})`,
    budgetTitle: 'Par budget',
    perNightTypical: 'par nuit, prix indicatif',
    whereTitle: 'Où partir ?',
    guidesCount: (n: number) => `${n} ${plural(n, 'guide', 'guides')}`,
    countryQ: 'Vous cherchez un pays en particulier ?',
    countryLink: 'Hôtels insolites par pays.',
    latestGuides: 'Derniers guides',
    allGuides: 'Tous les guides',
    planTitle: 'Préparez le reste du voyage',
    planText: 'Des partenaires que nous utilisons nous-mêmes. Liens affiliés, sans surcoût pour vous.',
    howItWorks: 'Comment ça marche',
    partners: { hotels: 'Hôtels', tours: 'Activités', tickets: 'Billets', flights: 'Vols' },
    faq: (types: number, titles: string[]) => [
      { q: 'Quels sont les types d’hôtels les plus insolites au monde ?', a: `StayAtNiche recense ${types} ${plural(types, 'type', 'types')} d’hébergements insolites : ${listJoin(titles.map(noun))}.` },
      { q: 'Les hôtels insolites sont-ils plus chers que les hôtels classiques ?', a: 'Pas toujours. Les prix vont d’environ 100 $ la nuit pour une chambre troglodyte simple ou un dôme de glamping à plus de 1 000 $ pour une suite sous-marine ou une villa sur une île privée. Chaque fiche indique une fourchette de prix par nuit ; vérifiez toujours les tarifs en temps réel pour vos dates.' },
      { q: 'Quand réserver une cabane dans les arbres, un hôtel de glace ou une chambre sous-marine ?', a: 'Réservez 6 à 12 mois à l’avance pour la haute saison. Les hôtels de glace sont saisonniers (environ de décembre à avril), les séjours sous les aurores boréales affichent vite complet en hiver, et les petits établissements de quelques chambres sont souvent les premiers pris d’assaut.' },
      { q: 'Comment StayAtNiche gagne-t-il de l’argent ?', a: 'Nous percevons une commission lorsque vous réservez via certains de nos liens, sans surcoût pour vous. Ces liens sont signalés comme sponsorisés et nos notes relèvent de la seule rédaction. La liste complète de nos partenaires figure sur notre page transparence.' },
    ],
  },
};

export default fr;
