// Niche definitions used by discovery + verification.
// name: POSIX ERE (Overpass, case-insensitive) matched against the property name.
// site: JS regex matched against the official website's title/description/text.
// extra: optional additional Overpass selector lines (same lodging filter applied).
export const LODGING = 'hotel|guest_house|chalet|hostel|camp_site|apartment|motel|alpine_hut|wilderness_hut|resort';

export const CATEGORIES = {
  'treehouse-hotels': {
    name: 'tree ?house|treehotel|treetop|baumhaus|cabanes? (dans les|perch)|boomhut|trädkoja|trehytte|casa (en el|na) árvore|casa del árbol',
    site: /tree ?house (room|suite|cabin|villa|accommodation|stay)|treehouses|treetop (room|suite|cabin|lodge|villa)|rooms? (up )?in the trees|(built|perched|suspended) in(to)? the trees|baumhaus|cabane dans les arbres|cabanes perchées|trädkoja/i,
    exclude: /lemon tree|double ?tree|apple tree|bay tree|pear tree|olive tree|plum tree|rain ?tree|palm tree|portree|pine tree|oak tree|elm tree|yew tree|treehouse hotels?\b/i,
  },
  'cave-hotels': {
    name: 'cave|cueva|grotta|grotte|mağara|magara|troglo|höhle|caverna|sassi',
    site: /cave (hotel|room|suite|house)|carved (into|from|out of) (the )?(rock|stone|tuff)|cueva|grotta|troglodyt|mağara|cave dwelling/i,
  },
  'underwater-rooms': {
    name: 'underwater|undersea|under ?sea|submarine',
    site: /underwater (room|suite|bedroom|villa|residence)|below sea level|undersea (room|suite|bedroom)/i,
  },
  'castle-hotels': {
    name: '(^|[^a-z])(castle|castello|castillo|kasteel|zamek|schloss hotel|hotel schloss)([^a-z]|$)',
    site: /castle|castello|castillo|schloss|château|medieval (fortress|keep)|kasteel/i,
    extra: ['nwr["tourism"="hotel"]["historic"~"^(castle|fort|manor|palace)$"];'],
  },
  'floating-hotels': {
    name: 'floating|houseboat|boatel|botel|house ?boat|flydende|schwimmend',
    site: /floating (hotel|room|cabin|villa|suite|home)|houseboat|on the water.*(sleep|stay)|boatel/i,
  },
  'bubble-hotels': {
    // "dome" only as a whole word: Polish "domek/domki" (cottage) matched it before.
    name: 'bubble|bulle|glass igloo|glass dome|sphere|sphère|(^|[^a-z])domes?([^a-z]|$)',
    site: /bubble (room|tent|hotel|suite|dome)|transparent (dome|bubble)|glass igloo|geodesic dome|sleep under the stars/i,
    exclude: /\bdom(ek|ki|ku|eczek|ków)\b|champagne|bulles? de champagne/i,
  },
  'cliffside-hotels': {
    name: 'cliff|clifftop|cliffside|kayalık|falaise|acantilado|scogliera',
    site: /cliff(-| )?(side|top|edge|face)|carved into the cliff|perched on (a|the) cliff|suspended (above|over) the (valley|sea)/i,
  },
  'desert-camps': {
    name: 'desert camp|luxury camp|bedouin|wadi rum|sahara|erg chebbi|merzouga|dune camp|martian',
    site: /desert camp|luxury (tented )?camp|bedouin|dunes|sahara|wadi rum|desert (lodge|tent)/i,
  },
  'jungle-lodges': {
    name: 'jungle|rainforest|rain forest|canopy|selva|amazon lodge|eco ?lodge',
    site: /jungle|rainforest|rain forest|cloud forest|amazon|canopy walk/i,
  },
  'ice-hotels': {
    name: 'ice ?hotel|icehotel|snow ?hotel|snowhotel|snow ?castle|snowcastle|igloo|lumihotelli|snøhotell',
    site: /ice ?hotel|snow ?hotel|glass igloos?|igloo (hotel|village|suite|room|cabin|resort)s?|(aurora|arctic|glass|snow) igloos?|snow ?castle|ice (room|suite)s?|made (entirely )?(of|from) (ice|snow)/i,
    exclude: /igloolik|igloo (hostel|hybrid|creek)|campground|bike ?& ?snow/i,
  },
  'safari-lodges': {
    name: 'safari|game lodge|tented camp|bush camp|game reserve lodge',
    site: /safari|game drive|big five|game reserve|tented camp|wildlife (viewing|drive)/i,
  },
  'overwater-bungalows': {
    name: 'overwater|over water|water villa|water bungalow|stilt',
    site: /overwater (villa|bungalow|suite)|water villa|over-water|villas? (on stilts|over the lagoon)/i,
  },
  'lighthouse-hotels': {
    name: 'lighthouse|light house|fyr|phare|faro|leuchtturm|vuurtoren|majakka|fyrvokter',
    // Must describe the building itself (historic / keeper's quarters / light station), not a business named "Lighthouse".
    site: /(former(?!ly)|historic|restored|converted|working|active|decommissioned|original|victorian|(?<!\d)1[5-9]\d\d(?!\d)|century)[^.]{0,40}(lighthouse|light ?station)|lighthouse keeper|(light)?keeper'?s (house|cottage|quarters|dwelling)|light ?station|lighthouse (was )?(built|dating|dates|erected|constructed) (in|from|back to)|inside (the|a) lighthouse|lighthouse tower|lantern room/i,
    exclude: /museum|ruinas|ruins|motel|residence|golf|marina|reef|view|campground|camping|campsite|apartment|backpackers|farm|sunlight|hostel/i,
    extra: ['nwr["man_made"="lighthouse"]["tourism"~"^(hotel|guest_house|chalet|hostel|apartment|motel)$"];'],
  },
  'train-hotels': {
    name: 'train|railway|carriage|wagon|waggon|caboose|sleeper|pullman|eisenbahn|zug|vagón|vagone',
    site: /railway carriage|train (carriage|car|hotel|wagon)|sleeper (car|train)|converted (train|railway|carriage)|caboose|pullman/i,
  },
};
