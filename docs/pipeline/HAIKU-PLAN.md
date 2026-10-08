# Dünya çapında niş otel bulma ve zenginleştirme: Haiku planı

Amaç: 14 kategorinin hepsi için dünyadaki gerçek niş konaklamaları bulmak, her biri için doğrulanmış
bilgi toplamak ve siteye yayınlanabilir hale getirmek. Bu belge işin Claude Haiku ile nasıl yapılacağını,
neyin Haiku'ya verilip neyin verilmeyeceğini ve hangi alanların toplanacağını tanımlar.

## 1. Kısa cevap

**Evet, Haiku bu işin büyük kısmını yapabilir, ama "Haiku'ya dünyayı tara de" şeklinde değil.**

- Haiku (`claude-haiku-5-5`) bir **okuyucu ve karar verici** olarak çok iyi ve çok ucuz: bir otelin web
  sitesinden alınmış metni okuyup "bu gerçekten bir mağara oteli mi, açık mı, odaları nasıl, hangi
  olanaklar var" sorularını yapılandırılmış JSON olarak cevaplar. Fiyat: 1M girdi token'ı $0.10,
  1M çıktı token'ı $0.50 (100K token'a kadar olan istekler), Batch API ile %50 indirim.
- **Tarama işini (hangi otel var, sitesi ne, sayfayı indir) kod yapmalı**, Haiku değil. Serbest gezinen bir
  "web ajanı" olarak Haiku: kapsama ölçülemez, maliyeti kontrol edilemez, tekrar üretilemez ve kendi
  bilgisinden gerçek uydurma riski taşır. Ayrıca gelişmiş web arama aracı (`web_search_20260209`,
  dinamik filtreleme) Haiku'da yok.
- Doğru kurgu: **kod keşfeder ve kanıt toplar → Haiku sınıflandırır ve bilgi çıkarır → kod Haiku'nun
  çıktısını kaynak metne karşı doğrular → sınırda kalanlara Sonnet bakar → yazım ve yayın.**

### Bugünkü durum (neden asıl ihtiyaç bu)

Repoda keşif + doğrulama hattı zaten var (`pipeline/discover.mjs`, `pipeline/verify.mjs`, her gece
`hotel-pipeline.yml`). Kuyrukta (`data/pipeline/candidates.json`) **7.993 aday, 218 ülke** var:

| Durum | Sayı |
|---|---|
| new (henüz kontrol edilmedi) | 2.831 |
| verified | 794 |
| weak | 3.505 (1.824'ünün web sitesi yok) |
| rejected | 782 |
| duplicate | 81 |
| **published** | **0** |

Yani darboğaz keşif değil; **adayı anlamlandırma ve bilgi çıkarma**. Mevcut doğrulama regex ile
yapılıyor ve iki yönde hata yapıyor:

- Yanlış pozitif: ör. `Hotel Castello` (Mesagne, İtalya) "verified castle-hotels" olarak işaretli, ama
  site metni "1922'den beri şehir merkezindeki tek otel" diyor; büyük olasılıkla kalenin adını taşıyan
  meydandaki bir otel, kale içinde değil. Regex "Castello" kelimesini görünce geçiriyor.
- Yanlış negatif: sitesi İtalyanca/Türkçe/Japonca olan veya kategori kelimesini farklı ifade eden
  gerçek niş oteller "weak" kalıyor.

Haiku tam bu boşluğu kapatır: anlamı okur, çok dilli çalışır, "adı kale ama kendisi kale değil" ayrımını yapar.

## 2. Görev dağılımı

| İş | Kim yapar | Neden |
|---|---|---|
| Aday keşfi (OSM, Wikidata, listeler) | Kod | Deterministik, ücretsiz, tekrar edilebilir, kapsam ölçülebilir |
| Web sitesi ve alt sayfaları indirme, metni temizleme, JSON-LD okuma | Kod | robots.txt, hız limiti, önbellek kontrolü bizde kalır |
| Tekilleştirme, koordinat → ülke/şehir | Kod (mevcut `lib.mjs`, Nominatim) | Kural tabanlı |
| **"Gerçekten bu kategoride mi, açık mı, konaklama mı?" kararı** | **Haiku (Batch)** | Ucuz, çok dilli, anlam okur |
| **Oda tipi, olanaklar, öne çıkanlar, sezon, ulaşım gibi bilgileri çıkarma** | **Haiku (Batch)** | Yapılandırılmış çıktı |
| Haiku'nun alıntılarının kaynak metinde birebir geçtiğini kontrol | Kod | Uydurmaya karşı ana koruma |
| Düşük güvenli / çelişkili / sınırda vakalar | Sonnet 5.5 (`claude-sonnet-5-5`) | Daha iyi muhakeme, sadece ~%10'luk dilim |
| Fiyat, müsaitlik | DirectBooker / Travelpayouts API | Model asla fiyat üretmez |
| Fotoğraf | Wikimedia Commons (mevcut script), lisanslı API görselleri | Telif |
| Otel sayfası metni + 5 çeviri | Sonnet 5.5 (pilotta Haiku ile karşılaştırılır) | Editoryal kalite, SEO |
| Yayın onayı (ilk aylarda) | İnsan, örneklem üzerinden | Güven ve Google kalite politikaları |

## 3. Hattın aşamaları

Her aday şu durumlardan geçer (mevcut durum alanı genişletilir):

```
new → evidence_ready → classified (accepted | rejected | needs_review) → enriched → drafted → published
                                                                                             ↘ stale (yeniden kontrol)
```

### A. Keşif: kapsamı genişletmek (kod)

Mevcut OSM (ad regex'i) + Wikidata (anahtar kelime arama) korunur, şunlar eklenir:

1. **OSM'de ada değil etikete göre arama.** Birçok niş otelin adında kategori kelimesi geçmez.
   - Kale/saray: `tourism=hotel` + `historic~castle|palace|manor|fort` veya `building=castle`
   - Deniz feneri: `man_made=lighthouse` + konaklama etiketi (kısmen var)
   - Yüzen: `floating=yes`, `building=houseboat`, `tourism=hotel` + `boat=yes`
   - Mağara: `tourism=*` + `natural=cave_entrance` 50 m içinde, Kapadokya/Matera/Guadix/Santorini çevresi
   - Tren: `railway=*` ile kesişen `tourism=hotel|guest_house`, `historic=railway_car`
   - Su üstü: `tourism=hotel|resort` + `man_made=pier` veya kıyı çizgisinin denizde kalan tarafı
2. **Wikidata SPARQL** (şu anki metin aramasından çok daha kapsamlı): ör. "P31 = otel ve P149 / P31
   kale, saray, deniz feneri" ya da "P366 (kullanım) = otel olan kale/fener/tren vagonu".
   Ayrıca her dildeki Wikipedia site bağlantıları kanıt toplamada kullanılır.
3. **Küratörlü listeler ve birlikler.** Kod sayfayı indirir, **Haiku listeyi isim + şehir + URL olarak çıkarır**:
   - Wikipedia liste ve kategori sayfaları (çok dilli: "Liste der Schlosshotels", "Paradores", "Kategori:Mağara otelleri" vb.)
   - Paradores (İspanya), Pousadas de Portugal, Historic Hotels of America / of Europe, Schlosshotels,
     Landmark Trust, Norveç ve İsveç fener kiralama listeleri, Relais & Châteaux ve Small Luxury Hotels'in
     kategori sayfaları, ulusal park lodge listeleri, safari koruma alanı konsesyon listeleri.
4. **Çok dilli terim listesi.** Haiku'ya bir kez, her kategori için 20+ dilde yerel terimleri ürettirip
   (ör. mağara: cueva, grotta, troglodyte, mağara, 洞窟, σπηλιά...) bir insanın gözden geçirdiği bir
   dosyaya koyun; OSM ve Wikidata sorguları bu listeyle zenginleşir. Model burada sadece sözlük
   önerisi yapar, gerçek üretmez.
5. **Bölgesel bölme.** Overpass sorguları kategori başına tüm dünya yerine kıta/ülke kutularına
   bölünür (zaman aşımını önler, hangi bölgenin tarandığı izlenir).

Yapılmayacaklar: Booking, TripAdvisor, Google Maps gibi siteleri kazımak (kullanım şartlarına aykırı,
IP engeli). Bunlar yerine affiliate API'leri (Travelpayouts/Hotellook, DirectBooker) kullanılır.

### B. Ön eleme (kod, ücretsiz)

- Tekilleştirme: `osm:` ↔ `wd:` eşleşmesi, aynı web sitesi host'u, 300 m içinde benzer isim (mevcut `matchesPublished` genişletilir).
- Kapalı / terk edilmiş etiketleri, Wikidata "dissolved" tarihi olanlar elenir (mevcut).
- Web sitesi olmayanlar ayrı kuyruğa: Wikidata/Wikipedia'dan site bulunmaya çalışılır, DirectBooker
  ile isim + koordinat araması yapılır; yine bulunamazsa beklemede kalır (yayınlanmaz).

### C. Kanıt toplama (kod)

Her aday için `data/pipeline/evidence/<id>.json` (git dışında, Actions cache veya artifact olarak saklanır):

- Resmi site ana sayfası + en fazla 3 alt sayfa. Alt sayfa, bağlantı metnine göre seçilir:
  rooms/zimmer/camere/odalar, about/history/storia/hakkımızda, location/getting here, faq.
- HTML → temiz metin; her sayfa ~2.500 token ile sınırlı, toplam ~10K token. Kırpılan yer not edilir.
- Sayfadaki `schema.org` JSON-LD (Hotel/LodgingBusiness): adres, telefon, `starRating`, `checkinTime`,
  `priceRange`, `amenityFeature`, koordinat. Bu alanlar varsa doğrudan kullanılır, Haiku'ya da verilir.
- Wikipedia özeti (varsa, İngilizce + yerel dil).
- OSM etiketleri, Wikidata iddiaları.
- Kurallar: `robots.txt`'e uy, alan adı başına saniyede ≤1 istek, mevcut `StayAtNicheBot` User-Agent'ı,
  15 sn zaman aşımı, sonuçları 30 gün önbellekle.

### D. Haiku: sınıflandırma + bilgi çıkarma (Batch API)

- Model: `claude-haiku-5-5`, **Message Batches API** (%50 ucuz, 24 saat içinde döner; gece işine uygun).
- `output_config.effort: "low"` (sınıflandırma/çıkarma için yeterli; pilotta `medium` ile karşılaştırılır).
- Yapılandırılmış çıktı (`output_config.format` ile JSON şeması): geçersiz JSON imkansız hale gelir.
- Sistem istemi sabit: kategori tanımları + kabul/ret kuralları (bölüm 5) + "sadece verilen metinden
  bilgi yaz, metinde yoksa null bırak". Sabit kısım prompt caching ile önbelleklenir.
- Her istek tek aday: aday meta verisi + kanıt metni.

**Uydurmaya karşı ana koruma:** her kritik iddia için Haiku kaynak metinden **birebir alıntı** verir;
kod bu alıntının kanıt metninde gerçekten geçtiğini kontrol eder. Alıntı bulunamazsa o alan silinir;
kategori alıntısı bulunamazsa aday `needs_review` olur.

### E. Hakem ve kalite ölçümü (Sonnet + kod)

Sonnet 5.5'e (yine Batch) gidenler:
- Haiku güveni < 0,8,
- Haiku kararı ile regex skoru çelişiyorsa (regex "verified", Haiku "reddet" veya tersi),
- `niche_scope = some_rooms` (otelin sadece bir kısmı niş) gibi politika gerektiren vakalar,
- Her gece rastgele %5 örneklem (Haiku'nun gerçek isabet oranını sürekli ölçmek için).

### F. Zenginleştirme (kod + API)

- Ülke, şehir, bölge, kıta: Nominatim (mevcut).
- Fiyat ve rezervasyon: DirectBooker eşleşmesi (`WRITER.md`'deki akış), Travelpayouts linki. **Gözlenmemiş fiyat yazılmaz.**
- Fotoğraf: `scripts/fetch-wikimedia-photos.mjs` (lisanslı). Otel sitesinden görsel indirilmez.
- Yakındaki yerler: `data/destination-landmarks.json` + OSM `tourism=attraction` mesafe hesabı (kod).

### G. Yazım

- Frontmatter alanlarının çoğu D ve F'den doğrudan gelir (bölüm 4'teki eşleme).
- Gövde metni (250–450 kelime) ve 5 dil çevirisi: Sonnet 5.5, sadece doğrulanmış alanlardan beslenir
  (`WRITER.md` kuralları aynen geçerli). Pilotta 20 otel Haiku ile de yazdırılıp karşılaştırılır; kalite
  yeterliyse çeviriler Haiku'ya kaydırılabilir.
- `node scripts/i18n-check.mjs` ve `npm run build && node scripts/check-build.mjs` yayın öncesi zorunlu.

### H. Yayın kapısı ve tazelik

- Günlük yayın limiti (ör. 10–20 otel). Toplu, ince içerik Google'ın "scaled content abuse" politikasına
  takılabilir; yavaş ve kaliteli yayın daha güvenli.
- İlk 4–6 hafta: her PR'da insan onayı. İsabet ölçümü ≥%95 kalırsa sadece örneklem kontrolüne geçilir.
- Tazelik: yayınlanan her otel 90 günde bir yeniden kontrol edilir (site çalışıyor mu, "kapandı" metni var
  mı, fiyat linki geçerli mi). Sorunluysa `stale` → insan kararı (arşiv / güncelle).

## 4. Toplanacak bilgiler

### 4.1 Haiku çıktı şeması (her aday için)

```jsonc
{
  // Karar
  "is_lodging": true,                       // gece kalınabilen bir yer mi (restoran, müze, bar, etkinlik mekanı değil)
  "operating_status": "open",               // open | seasonal | closed | unknown
  "category": "cave-hotels",                // 14 slug'dan biri veya null
  "also_fits": ["cliffside-hotels"],        // ikincil kategoriler
  "niche_scope": "whole_property",          // whole_property | some_units | name_only | unclear
  "niche_unit_count": 12,                   // niş birim sayısı (metinde varsa, yoksa null)
  "niche_feature": "Rooms carved into volcanic tuff in Göreme",   // niş olan şey tam olarak ne (kısa, İngilizce)
  "category_evidence_quote": "...",         // kaynak metinden BİREBİR alıntı (kod doğrular)
  "confidence": 0.93,                       // 0–1
  "red_flags": [],                          // listing_site | for_sale | event_venue_only | restaurant_only |
                                            // museum | private_residence | closed_hint | chain_generic | theme_only
  "other_niche_type": null,                 // 14 kategoriye uymayan ama niş bir şeyse (yel değirmeni, silo, uçak...)

  // Kimlik
  "official_name": "Gamirasu Cave Hotel",
  "property_type": "boutique hotel",        // hotel | lodge | B&B | guesthouse | camp | glamping | villa | train | ship | apartment
  "address": "...",
  "official_website": "https://...",
  "official_booking_url": "https://...",    // otelin kendi rezervasyon sayfası varsa

  // Konaklama gerçekleri (sadece metinde açıkça yazanlar)
  "room_count": 23,
  "room_types": ["Cave suite", "Deluxe cave room"],
  "amenities": ["Restaurant", "Spa", "Free Wi-Fi", "Airport transfer"],
  "highlights": [ { "text": "Rooms in a 1,000-year-old Byzantine monastery", "quote": "..." } ],
  "check_in": "14:00", "check_out": "12:00",
  "season": { "open_months": "Apr–Oct", "quote": "..." },
  "min_age_or_family": "adults only",       // adults_only | family_friendly | unknown
  "access": "45 min drive from Kayseri airport; transfer offered",
  "accessibility_notes": "Steep stairs to upper cave rooms",
  "sustainability": ["Solar power"],
  "price_on_site": { "amount": 180, "currency": "EUR", "basis": "per night, double", "quote": "..." },  // sadece sitede yazıyorsa
  "best_for": ["Couples", "Honeymoon"],     // çıkarım, kanıta dayanmalı
  "site_languages": ["en", "tr"]
}
```

Kural: metinde olmayan her alan `null`/boş dizi. Haiku hiçbir alanı kendi genel bilgisinden doldurmaz.

### 4.2 Kod/API'den gelenler

| Alan | Kaynak |
|---|---|
| Koordinat | OSM / Wikidata / JSON-LD (birbirinden >1 km farklıysa işaretle) |
| Ülke, şehir, bölge, kıta | Nominatim |
| Wikidata ID, Wikipedia linkleri | Wikidata |
| Fiyat aralığı, `priceIndicator` | DirectBooker / Travelpayouts (gözlenen fiyat) |
| Affiliate linkleri | `src/lib/affiliate.ts` + Travelpayouts |
| Fotoğraflar | Wikimedia Commons (lisans + yazar bilgisiyle) |
| Yakındaki yerler + mesafe | OSM / `destination-landmarks.json` |
| Kaynak izi | `sourceId`, `officialWebsite`, `verifiedAt`, kanıt URL'leri, model adı + istem sürümü |

### 4.3 Site frontmatter'ı ile eşleme (`src/content/config.ts`)

| Frontmatter | Nereden |
|---|---|
| `name` | `official_name` |
| `category` | `category` |
| `destination`, `country`, `continent`, `address` | Nominatim + `address` |
| `description` | Yazım aşaması, `niche_feature` + `highlights` temelli |
| `highlights` | Haiku `highlights[].text` (alıntısı doğrulanmışlar) |
| `amenities` | Haiku `amenities` + JSON-LD `amenityFeature` |
| `bestFor`, `tags` | Haiku `best_for`, `niche_scope`, `min_age_or_family` |
| `priceRange`, `pricePerNight`, `priceIndicator` | Sadece API'de gözlenen fiyat, yoksa "Rates vary" |
| `checkInOut` | `check_in` / `check_out` |
| `seasonalInfo` | `season` |
| `nearbyAttractions` | Kod |
| `coordinates`, `officialWebsite`, `sourceId`, `verifiedAt` | Kod |
| `bookingUrl`, `affiliateLinks` | Affiliate katmanı |
| `rating` | Editör puanı (mevcut 7,5–9,5 kuralı), başka sitelerin puanı kopyalanmaz |
| `reviewCount` | 0 (sahte yorum sayısı yok, ROADMAP'teki karar) |

## 5. Kategori kabul kuralları (Haiku sistem istemine girer)

| Kategori | Kabul | Sık görülen yanlış pozitif |
|---|---|---|
| treehouse-hotels | Uyunan birim ağaçta veya ağaçlar arasında yükseltilmiş yapı | "Lemon Tree", "Treehouse" adlı hostel/bar, ağaç evi yapan firma |
| cave-hotels | Odalar kayaya/tüfe oyulmuş veya doğal mağara içinde | Fransızca "cave" = şarap mahzeni, "Cave" adlı bar/restoran, sadece mağara turu |
| underwater-rooms | Yatak odası su seviyesinin altında, akvaryum camlı | Su altı restoranı, akvaryum manzaralı lobi |
| castle-hotels | Tarihî kale, saray, şato, kale içinde konaklama | Kaleye bakan / kalenin adını taşıyan otel, kale temalı yeni bina (Fransız "château" şarap çiftliği: politika kararı) |
| floating-hotels | Uyunan birim yüzen yapı veya tekne | Suya bakan otel, sadece günlük tekne turu (nehir kruvazörleri: politika kararı) |
| bubble-hotels | Şeffaf şişme balon veya cam kubbe | "Bubble" adlı hostel; opak jeodezik kubbe (politika kararı) |
| cliffside-hotels | Odalar uçurum yüzeyinde/kenarında, uçuruma oyulmuş veya asılı | Adında "Cliff" geçen sıradan sahil oteli |
| desert-camps | Çölde çadır/kamp/lodge | Çöl şehrindeki şehir oteli |
| jungle-lodges | Yağmur ormanı/bulut ormanı içinde lodge | Şehirdeki "Jungle" adlı hostel/bar |
| ice-hotels | Buzdan/kardan yapılmış oda veya cam iglo | "Igloo" kamp alanı, dondurma dükkanı |
| safari-lodges | Rezerv/koruma alanında, oyun sürüşü sunan lodge veya çadır kamp | Safari parkı otelleri, "Safari" adlı şehir oteli |
| overwater-bungalows | Su üzerinde kazıklı villa/bungalov | "Water villa" adı taşıyan havuzlu villa, deniz manzaralı oda |
| lighthouse-hotels | Fener binası veya fener bekçisi evi | "Lighthouse" adlı motel/marina/restoran |
| train-hotels | Vagonda konaklama veya yataklı lüks tren yolculuğu | "Station Hotel", demiryolu temalı otel |

Genel ret kuralları: `niche_scope = name_only`; konaklama değil; kapalı; satılık ilanı; sadece etkinlik mekanı;
niş özelliği sadece dekorasyon/tema.

## 6. Haiku'nun sınırları ve nasıl ölçeceğiz

Güçlü olduğu yerler: metinden sınıflandırma, çok dilli siteleri okuma, yapılandırılmış çıkarım, liste çıkarma.
Zayıf olduğu yerler: kendi bilgisinden gerçek söylemek (yasaklıyoruz), politika gerektiren sınır vakalar
(Sonnet'e gidiyor), uzun editoryal metin kalitesi (Sonnet'te kalıyor).

**Pilot (Faz 0):**
1. Kuyruktan 200 aday seçilir (her kategoriden, verified/weak/rejected karışık, 10+ dil).
2. İnsan etiketler: kategori doğru mu, scope, açık mı. Bu "altın set" `pipeline/eval/golden.json` olur.
3. Haiku (`low` ve `medium` effort) ve Sonnet 5.5 aynı sette çalıştırılır.
4. Ölçütler: kabul edilenlerde **isabet (precision) ≥ %95** (yanlış yayın pahalı), geri çağırma ≥ %85,
   alıntı doğrulama başarısızlık oranı, aday başına maliyet.
5. Haiku hedefi tutturursa ana model o olur; tutturamazsa eşik ve Sonnet'e yönlendirme oranı ayarlanır.

Altın set her istem değişikliğinde yeniden çalıştırılır (regresyon testi).

## 7. Maliyet tahmini

Varsayım: aday başına ~10K girdi + ~1,5K çıktı token'ı (düşünme dahil). Pilotta gerçek değerlerle güncellenecek.

| Kalem | Birim | 8.000 aday (bugünkü kuyruk) | 100.000 aday |
|---|---|---|---|
| Haiku 5.5, Batch | ~$0,001 / aday | ~$8 | ~$90 |
| Sonnet 5.5 hakem (%10), Batch | ~$0,018 / aday | ~$15 | ~$180 |
| Yazım + 5 çeviri, Sonnet 5.5 | ~$0,10 / yayınlanan otel | 1.000 otel ≈ $100 | 5.000 otel ≈ $500 |

Asıl maliyet modelde değil; tarama süresi (hız limitleri), API kotaları (DirectBooker, Nominatim) ve insan kontrol zamanında.

## 8. Repoda uygulama

```
pipeline/
  categories.mjs          (mevcut) + kabul kuralları metni, çok dilli terimler
  sources/osm-tags.mjs    etiket tabanlı OSM sorguları, bölgesel bölme
  sources/wikidata.mjs    SPARQL sorguları
  sources/lists.mjs       küratörlü liste sayfaları → Haiku ile isim çıkarma
  evidence.mjs            site + alt sayfa indirme, JSON-LD, temiz metin
  classify.mjs            Haiku Batch: gönder / durum sorgula / sonuçları topla, alıntı doğrulama
  review.mjs              Sonnet hakem Batch'i
  enrich.mjs              konum, fiyat, foto, yakın yerler
  eval/golden.json, eval/run.mjs
```

- Bağımlılık: `@anthropic-ai/sdk`. GitHub secret: `ANTHROPIC_API_KEY`.
- `candidates.json` şimdiden 5,4 MB; alanlar artınca kategori başına JSONL dosyalarına
  (`data/pipeline/candidates/<kategori>.jsonl`) bölünmeli ki git diff'leri okunabilir kalsın.
- `hotel-pipeline.yml` iki adımlı olur: (1) keşif + kanıt + batch gönder, (2) bir sonraki çalıştırmada
  batch sonuçlarını topla + hakem + durum raporu. `STATUS.md`'ye yeni durumlar ve Haiku/Sonnet oranları eklenir.
- Her Haiku kararı adayın kaydında saklanır: model, istem sürümü, tarih, alıntılar (denetlenebilirlik).

## 9. Yol haritası

| Faz | İş | Çıktı |
|---|---|---|
| 0 (2–3 gün) | Altın set (200), Haiku vs Sonnet pilotu, şema ve istem | İsabet raporu, kesin maliyet |
| 1 (1 hafta) | Mevcut 7.993 adayı Haiku ile yeniden değerlendir (`evidence` + `classify`) | Temiz "accepted" listesi; en hızlı değer buradan |
| 2 (1–2 hafta) | Yeni kaynaklar: OSM etiketleri, SPARQL, küratörlü listeler, çok dilli terimler | Kuyruk büyür, kapsama haritası (ülke × kategori) |
| 3 (sürekli) | Zenginleştirme + yazım + günlük sınırlı yayın, insan onaylı | Haftada 50–100 yeni otel |
| 4 (sürekli) | 90 günlük tazelik kontrolü, altın set regresyonu | Kapanan otel / kırık link yok |

## 10. Sizin karar vermeniz gerekenler

1. **Politika vakaları:** Fransız şarap şatoları, opak glamping kubbeleri, nehir kruvazörleri, otelin
   sadece birkaç odası niş olan yerler (`some_units`) kabul edilsin mi?
2. **Bütçe ve API anahtarı:** Anthropic API anahtarı GitHub secret olarak eklenmeli; aylık üst limit.
3. **Yayın modu:** İlk dönemde her PR'ı siz mi onaylayacaksınız, yoksa günlük limitle otomatik mi?
4. **Yeni kategoriler:** Haiku'nun `other_niche_type` alanı (yel değirmeni, silo, uçak, manastır, yurt...)
   yeni kategori fikirlerini de toplayacak; bunları açmak isteyip istemediğiniz.
