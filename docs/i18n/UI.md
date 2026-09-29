# Translating the UI dictionary (src/i18n/ui/<lang>.ts)

`src/i18n/ui/en.ts` holds every interface string (menus, buttons, labels, FAQ templates, meta
titles). Each language file must export an object with EXACTLY the same shape:

```ts
import type en from './en';
const de: typeof en = { ... };
export default de;
```

Rules
- Same keys, same nesting, same array lengths, same function parameters. Keep `as Record<string, string>`
  maps' keys (slugs such as 'guided-tour', 'travel-tips') unchanged; translate only the values.
- Functions return natural sentences. Handle plurals properly for the language (write a small local
  `plural` helper). Never produce "1 Unterkünfte" or "1 hébergements".
- Country names arrive already translated (e.g. "Schweiz", "États-Unis", "Paesi Bassi").
  Prepositions/articles in front of them must be grammatical: write a small local helper
  (e.g. `inCountry(c)`) with the exceptions the language needs:
  de: in der Schweiz / in der Türkei / in den USA / in den Vereinigten Arabischen Emiraten / im Oman …;
  fr: en Suède / au Canada / aux États-Unis / aux Maldives / au Japon / à Sainte-Lucie …;
  it: in Svezia / negli Stati Uniti / nei Paesi Bassi / alle Maldive …;
  es and nl are mostly regular. Where a clean construction avoids the preposition, prefer it.
  Countries we list (English): Australia, Bahamas, Belgium, Belize, Botswana, Brazil, Cambodia,
  Canada, Chile, Ecuador, England, Finland, France, French Polynesia, Greece, Guatemala, Iceland,
  India, Indonesia, Ireland, Israel, Italy, Japan, Jordan, Kenya, Laos, Malaysia, Maldives, Morocco,
  Mozambique, Namibia, New Zealand, Nicaragua, Norway, Oman, Peru, Rwanda, Scotland, South Africa,
  Spain, St. Lucia, Sweden, Switzerland, Tanzania, Thailand, Turkey, UAE, USA, Uganda,
  United Kingdom, Vietnam, Zambia, Zimbabwe. Get their names in your language with
  `node -e 'const d=new Intl.DisplayNames(["de"],{type:"region"});console.log(d.of("CH"))'`
  (German uses "USA" for US).
- Category names arrive as the glossary names in docs/i18n/TRANSLATING.md (e.g. "Baumhaushotels").
  If a template lower-cases or singularises them, make sure the result is correct in your language
  (German nouns stay capitalised!).
- `fmt.usd(amount)` / `fmt.usdRange(a, b)`: write US-dollar amounts the local way (see the voice
  table in TRANSLATING.md): de "300 $", "300–600 $"; fr "300 $", "300–600 $" (narrow no-break space
  before $); es "300 US$", "300–600 US$"; it "300 $", "300–600 $"; nl "$ 300", "$ 300–600".
- `best.slug(cat, country)` builds a URL slug from the localized category slug and country slug:
  use the natural short form ("baumhaushotels-in-schweden", "cabanes-dans-les-arbres-en-suede",
  "hoteles-cueva-en-turquia", "case-sugli-alberi-in-svezia", "boomhutten-in-zweden"); lowercase ASCII.
- `home.bands.*.label` and similar price labels must use the local USD format.
- Meta titles ≤ 60 characters where the English one is; end with " | StayAtNiche" where the English does.
- Tone: the voice table in TRANSLATING.md (de Sie, fr vous, es tú, it tu, nl je). Short, confident,
  premium microcopy. Buttons are verbs.
- Type-check: `npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --types node --skipLibCheck src/i18n/ui/<lang>.ts`
