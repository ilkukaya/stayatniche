# Translating StayAtNiche

Languages: **de, fr, es, it, nl** (English is the source). The bar is *native travel-magazine copy*:
a reader must never suspect the page was translated. We transcreate, not translate.

## 1. Files

One file per entry and language, mirroring the English file name:

```
src/content/translations/<lang>/<collection>/<slug>.md
```

`<collection>` is one of `hotels`, `categories`, `destinations`, `blog`, `experiences`.
Only published English entries are translated (skip files with `status: draft`).

Frontmatter always starts with `source: <english-slug>`; then only the **translatable** fields
listed below (never copy prices, URLs, coordinates, ratings, images, tags, dates). The body is the
full translated Markdown body.

| Collection | Translatable frontmatter fields |
|---|---|
| hotels | `destination`, `description`, `highlights`, `amenities`, `bestFor`, `prosAndCons` {pros, cons}, `seasonalInfo` {bestTime, peakSeason, lowSeason, notes}, `nearbyAttractions` [{name, distance}], `seo` {metaTitle, metaDescription} |
| categories | `title`, `tagline`, `description`, `stats` {topDestination}, `seo` {metaTitle, metaDescription} |
| destinations | `name`, `description`, `essentials` {currency, language, timezone, visaInfo, plugType}, `bestTimeToVisit` {summary, details}, `mustSee`, `travelTips`, `seo` {metaTitle, metaDescription} |
| blog | `title`, `excerpt`, `seo` {metaTitle, metaDescription} |
| experiences | `title`, `destination`, `description`, `booking` {price, duration}, `highlights`, `included`, `notIncluded`, `seo` {metaTitle, metaDescription} |

Include a field only if the English entry has it. Arrays keep the **same number of items in the
same order**. Hotel `name` is never translated (it is a proper name). Category `title` must be the
exact category name from the glossary below.

`seo` is always written fresh for the language (even if the English file has none):
- `metaTitle` ≤ 60 characters, ends with ` | StayAtNiche`, contains the term people search in that language.
- `metaDescription` 140–160 characters, concrete, no clickbait, no invented claims.

Quote YAML strings that contain `:` `#` or start with a special character. Use straight ASCII quotes
for YAML delimiters; typographic quotes inside text follow the language's rules.

## 2. Body rules

- Keep every fact: names, numbers, distances, dates, prices, opening seasons. Add nothing new, drop nothing.
- Keep Markdown structure: same headings (translated), lists, bold, tables, links.
- **Links:** translate only the anchor text. Keep internal URLs exactly as in English
  (e.g. `/categories/cave-hotels/`, `/hotels/treehotel-sweden/`), the site localizes them.
  Keep external URLs unchanged.
- Rewrite sentences so they sound natural: change word order, split or merge sentences, swap
  English idioms for native ones. Avoid calques (DE "macht Sinn", FR "faire du sens",
  ES/IT anglicisms where a native word exists, NL "dat maakt sense").
- Proper names stay in their usual form in the target language: use established exonyms
  (DE *Lappland*, FR *Laponie*, ES *Laponia*, IT *Lapponia*, NL *Lapland*; *Maldives*/*Malediven*/…),
  otherwise keep the original name. Hotel, room and restaurant names stay as they are.
- Units: metric; convert only if the English text already gives both. Temperatures °C.
- Prices: keep the amount and USD, written the local way (see style notes). Never convert currency.
- Months, seasons, number formats: local conventions (DE/NL/IT/ES/FR decimal comma, thin spacing where usual).
- Headings: sentence case in all five languages (not English Title Case).
- No machine-translation tells: no English quote marks in FR (« … ») and DE („…“), no untranslated
  English words unless they are genuinely used locally (e.g. *Lodge*, *Glamping*, *Safari*, *Check-in*).

## 3. Voice per language

| | Address | Notes |
|---|---|---|
| **de** | *Sie* (formal) | Clear, elegant, not stiff. Compound nouns where natural (*Baumhaushotel*). „…“ quotes. Prices: `300 $` or `300 US-Dollar`. |
| **fr** | *vous* | Magazine style (think *Condé Nast Traveller France*). « … » with non-breaking spaces; space before `: ; ! ?`. Prices: `300 $`. "insolite" is the key word for unusual stays. |
| **es** | *tú* | Neutral Spanish understandable in Spain and Latin America (avoid *vosotros* and strongly regional words; *coche* → prefer *auto/coche* neutral phrasing like *vehículo* only when natural). Prices: `300 US$`. Use ¿…? and ¡…!. |
| **it** | *tu* | Warm, evocative, precise. « … » or “…”. Prices: `300 $`. |
| **nl** | *je* | Direct, friendly, short sentences. Prices: `$ 300`. Compounds written together (*boomhut*, *vuurtorenhotel*). |

## 4. Glossary (use exactly)

| English | de | fr | es | it | nl |
|---|---|---|---|---|---|
| Treehouse Hotels | Baumhaushotels | Cabanes dans les arbres | Cabañas en los árboles | Case sugli alberi | Boomhutten |
| Cave Hotels | Höhlenhotels | Hôtels troglodytes | Hoteles cueva | Hotel in grotta | Grothotels |
| Underwater Rooms | Unterwasserzimmer | Chambres sous-marines | Habitaciones submarinas | Camere subacquee | Onderwaterkamers |
| Castle Hotels | Schlosshotels | Châteaux-hôtels | Hoteles castillo | Hotel nei castelli | Kasteelhotels |
| Floating Hotels | Schwimmende Hotels | Hôtels flottants | Hoteles flotantes | Hotel galleggianti | Drijvende hotels |
| Bubble Hotels | Bubble-Hotels | Bulles transparentes | Hoteles burbuja | Bolle trasparenti | Bubbelhotels |
| Cliffside Hotels | Klippenhotels | Hôtels à flanc de falaise | Hoteles en acantilados | Hotel a strapiombo | Klifhotels |
| Desert Camps | Wüstencamps | Camps dans le désert | Campamentos en el desierto | Campi nel deserto | Woestijnkampen |
| Jungle Lodges | Dschungel-Lodges | Lodges dans la jungle | Lodges en la selva | Lodge nella giungla | Junglelodges |
| Ice Hotels | Eishotels | Hôtels de glace | Hoteles de hielo | Hotel di ghiaccio | IJshotels |
| Safari Lodges | Safari-Lodges | Lodges de safari | Lodges de safari | Lodge per safari | Safarilodges |
| Overwater Bungalows | Wasserbungalows | Bungalows sur pilotis | Bungalós sobre el agua | Bungalow sull’acqua | Overwaterbungalows |
| Lighthouse Hotels | Leuchtturmhotels | Dormir dans un phare | Hoteles en faros | Hotel nei fari | Vuurtorenhotels |
| Train Hotels | Zughotels | Trains-hôtels | Hoteles en trenes | Hotel nei treni | Treinhotels |
| unusual / unique stays | außergewöhnliche Unterkünfte | hébergements insolites | alojamientos únicos | alloggi insoliti | bijzondere overnachtingen |
| northern lights | Polarlichter / Nordlichter | aurores boréales | auroras boreales | aurora boreale | noorderlicht |
| glass igloo | Glasiglu | igloo de verre | iglú de cristal | igloo di vetro | glazen iglo |
| guide (article) | Ratgeber | guide | guía | guida | gids |

## 5. Self-check before finishing a batch

```
node scripts/i18n-check.mjs <lang> [collection]
```

It verifies frontmatter keys, array lengths, link counts and flags English leftovers. Fix every
error it reports; read each warning and fix real problems.
