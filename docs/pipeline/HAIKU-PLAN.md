# Dünya çapında niş otel bulma ve zenginleştirme: Haiku planı (API'siz)

> Güncel çalışan sistem için bkz. [README.md](README.md). Bu belge ilk planlama notlarıdır.

Amaç: 14 kategorinin hepsi için dünyadaki gerçek niş konaklamaları bulmak, her biri için doğrulanmış
bilgi toplamak ve siteye yayınlanabilir hale getirmek.

**Kısıt:** Anthropic API anahtarı veya ayrı bir bütçe yok. Model işi sadece **Claude Code
oturumlarında** (claude.ai/code, zamanlanmış Routine'ler) yapılır ve mevcut abonelik kullanım
limitinden düşer. İnternet işi ücretsiz olan **GitHub Actions**'ta yapılır.

## 1. Kısa cevap

**Evet, Claude Code içinde Haiku bu işi yapabilir, API gerekmez.**

- Claude Code'da bir oturum, işi **Haiku modelinde çalışan alt ajanlara** (subagent) dağıtabilir. Alt
  ajan `.claude/agents/<ad>.md` dosyasında `model: haiku` ile tanımlanır. Haiku, abonelik limitinden
  Sonnet/Opus'a göre çok daha az harcar; okuma ağırlıklı toplu iş için doğru model.
- Bu oturumlar zamanlanabilir. Hesabınızda zaten her gün 04:50 UTC'de çalışan bir
  **"StayAtNiche daily writer" Routine'i var**; aynı mekanizmayla ikinci bir "sınıflandırıcı" Routine kurulur.
- **Sohbet (claude.ai chat)**: tek tek otel araştırmak veya politika kararı tartışmak için olur. Ama
  repoya yazamaz, binlerce adayı işleyemez ve tekrar edilebilir değildir. Ana iş için uygun değil.

### Bugün tespit ettiklerim

1. **Yazar Routine'i her gün boşa çalışıyor.** 8 Ekim çalışması 1 dakikada bitti ve 0 otel yayınladı.
   Gerekçesi: "DirectBooker bağlantısı yok, kayıtlı kanıt sadece site başlığı + meta açıklama +
   kısa snippet; 250–450 kelime uydurmadan yazılamaz." Yani eksik olan şey **zengin kanıt**.
2. **Bulut oturumu otel sitelerini açamıyor.** Ortamın ağ politikası genel sitelere çıkışı engelliyor
   (`curl` ve WebFetch: 403 / EGRESS_BLOCKED). **WebSearch çalışıyor** ama arama özetleri ikincil
   kaynaklardan geliyor ve çelişebiliyor. Örneğin Inverlochy Castle'ın giriş saati bir kaynakta
   14:00, diğerinde 15:00. Bu yüzden arama sonuçları yayın gerçeği olarak kullanılmamalı.
3. **GitHub Actions'ın interneti açık ve ücretsiz.** Repo herkese açık (public) olduğu için standart
   runner dakikaları sınırsız. Gece işi her gün sorunsuz çalışıyor (~15–25 dk).
4. **Zamanlama kayıyor.** `hotel-pipeline.yml` 01:17 UTC'ye planlı, ama GitHub gecikmesiyle fiilen
   07:00–07:40 UTC'de başlıyor. Yazar 04:50'de çalıştığı için hep bir önceki günün verisini görüyor.
5. **Kuyrukta 218 ülkeden 7.993 aday var**, regex doğrulaması iki yönde hata yapıyor:
   - Yanlış pozitif: `Hotel Castello` (Mesagne) "kale oteli" diye onaylı, ama büyük olasılıkla sadece
     kalenin adını taşıyan meydandaki bir otel.
   - Yanlış negatif: başka dilde yazılmış gerçek niş oteller "weak" kalıyor.

| Durum | Sayı |
|---|---|
| new | 2.831 |
| verified | 794 |
| weak | 3.505 (1.824'ünün web sitesi yok) |
| rejected | 782 |
| duplicate | 81 |
| **published** | **0** |

## 2. Yeni işbölümü

| Katman | Nerede | Maliyet | Ne yapar |
|---|---|---|---|
| **İnternet işleri** | GitHub Actions (gece) | Ücretsiz | Keşif, otel sitelerini indirme, kanıt paketleri, kararları doğrulayıp kuyruğa işleme |
| **Okuma + karar** | Claude Code Routine "classifier", **Haiku alt ajanları** | Abonelik limiti | Kanıtı okuyup kategori/durum kararı verir, bilgileri JSON olarak çıkarır |
| **Yazım** | Mevcut "daily writer" Routine'i (revize) | Abonelik limiti | İngilizce sayfayı yazar; 5 çeviriyi Haiku alt ajanlarına yaptırır |
| **Kontrol** | Siz | Zaman | İlk haftalarda PR onayı, sonra örneklem kontrolü |

Temel kural: **Claude oturumları internete çıkmaz, sadece repodaki dosyaları okur ve yeni karar
dosyaları yazar.** Böylece ağ engeli sorun olmaz, her karar tekrar üretilebilir ve denetlenebilir.

## 3. Günlük akış

```
GitHub Actions (~07:00 UTC, ücretsiz)
  1. apply-decisions.mjs  dünkü Haiku kararlarını doğrula → candidates.json'a işle
  2. discover.mjs         yeni aday bul (OSM, Wikidata, listeler)
  3. verify.mjs           ucuz ön eleme (kapalı, tekrar, konaklama değil)
  4. evidence.mjs         sıradaki N aday için siteleri indir → "pipeline-inbox" dalına yaz
  5. status.mjs

Claude Code Routine "classifier" (~10:00 UTC, Haiku alt ajanları)
  6. pipeline-inbox dalındaki kanıt paketlerini oku
  7. 20'şerlik gruplar halinde hotel-classifier alt ajanlarına dağıt (paralel)
  8. kararları data/pipeline/decisions/<tarih>/*.json olarak commit + push
     (candidates.json'a dokunmaz → Actions ile çakışma olmaz)

Claude Code Routine "writer" (~12:00 UTC, mevcut Routine saati kaydırılır)
  9. accepted + bilgisi çıkarılmış adaylardan en fazla 8 tanesini yaz
 10. 5 çeviriyi Haiku alt ajanlarına yaptır, i18n-check + build, PR
```

### Neden ayrı bir `pipeline-inbox` dalı?

Kanıt paketleri büyüktür (aday başına 4–8 KB metin). Ana dalda tutulursa git geçmişi yılda yüzlerce
MB büyür. `pipeline-inbox` her gece sıfırdan oluşturulup üzerine yazılan (geçmişi tutulmayan) bir
daldır. Kararlar küçük olduğu için (aday başına ~1 KB) ana dalda saklanır. Ayrıca otel sitelerinden
alınan metinler herkese açık repoda kalıcı olarak birikmemiş olur.

## 4. Aşamaların ayrıntısı

### A. Keşif (Actions, kod): kapsamı genişletmek

Mevcut OSM (ad regex'i) + Wikidata (anahtar kelime) korunur, şunlar eklenir:

1. **OSM'de etikete göre arama.** Niş otellerin çoğunun adında kategori kelimesi geçmez.
   - Kale/saray: `tourism=hotel` + `historic~castle|palace|manor|fort` veya `building=castle`
   - Deniz feneri: `man_made=lighthouse` + konaklama etiketi (kısmen var)
   - Yüzen: `floating=yes`, `building=houseboat`
   - Mağara: konaklama + 50 m içinde `natural=cave_entrance`
   - Tren: `historic=railway_car` + konaklama
2. **Wikidata SPARQL:** "kullanımı otel olan kale/fener/vagon" gibi yapısal sorgular (metin aramasından çok daha kapsamlı).
3. **Küratörlü listeler.** Actions sayfayı indirip inbox'a koyar, **Haiku alt ajanı listeyi isim + şehir + URL olarak çıkarır**:
   - Wikipedia liste ve kategori sayfaları (çok dilli)
   - Paradores, Pousadas de Portugal, Historic Hotels of America / of Europe, Landmark Trust
   - Norveç ve İsveç fener kiralama listeleri, Relais & Châteaux kategori sayfaları
4. **Çok dilli terimler:** Bir Claude Code oturumunda bir kez, her kategori için 20+ dilde terim
   listesi hazırlanıp `pipeline/categories.mjs`'e eklenir (model sözlük önerir, insan onaylar).
5. **Bölgesel bölme:** Overpass sorguları kıta/ülke kutularına bölünür. Böylece zaman aşımı olmaz ve
   hangi bölgenin tarandığı izlenir.

Yapılmayacak: Booking, TripAdvisor, Google Maps kazıma (kullanım şartlarına aykırı).

### B. Kanıt paketi (Actions, `pipeline/evidence.mjs`)

Her aday için bir JSON:

- Resmi site ana sayfası + en fazla 3 alt sayfa. Alt sayfa bağlantı metnine göre seçilir:
  rooms/zimmer/camere/odalar, about/history/storia, location/getting here.
- HTML → temiz metin, sayfa başına ~1.500 kelime sınırı.
- Sayfadaki `schema.org` JSON-LD (Hotel/LodgingBusiness): adres, telefon, `checkinTime`, `amenityFeature`, koordinat.
- Wikipedia özeti (varsa, İngilizce + yerel dil), OSM etiketleri, Wikidata iddiaları.
- Kurallar: `robots.txt`, alan adı başına saniyede ≤1 istek, mevcut `StayAtNicheBot` User-Agent'ı.
- Sıralama: önce `verified`, sonra web sitesi olan `weak`, sonra `new`.

### C. Haiku sınıflandırıcı (Claude Code alt ajanı)

`.claude/agents/hotel-classifier.md` (taslak):

```markdown
---
name: hotel-classifier
description: Reads evidence packs for candidate niche hotels and writes a JSON decision per candidate.
model: haiku
tools: Read, Write, Glob
---
You classify candidate stays for stayatniche.com using ONLY the evidence files you are given.
Never use your own knowledge of a hotel, never browse.
For each candidate write one object following docs/pipeline/HAIKU-PLAN.md section 5.1 ...
Category rules: (section 6 table) ...
Every claim needs a verbatim quote from the evidence; if you can't quote it, leave the field null.
```

- Ana oturum (classifier Routine) kanıt paketlerini 20'şerli gruplara böler ve 4–5 alt ajanı paralel
  çalıştırır. Her alt ajan kendi karar dosyasını yazar. Ana oturum sadece koordinasyon yapar.
- **Uydurmaya karşı koruma kodda:** ertesi gece `apply-decisions.mjs` her alıntının kanıt metninde
  birebir geçtiğini kontrol eder. Geçmeyen alan silinir; kategori alıntısı tutmuyorsa aday `needs_review` olur.
- Sınırda kalanlar (güven < 0,8, `niche_scope` = `some_units`/`unclear`, regex ile çelişki)
  `needs_review` olur. Bunlara writer oturumu (Sonnet) yazmadan önce bakar, ya da siz karar verirsiniz.

### D. Web sitesi olmayan adaylar (1.824 "weak")

Bulut oturumunda WebSearch çalıştığı için:

- Classifier Routine her gün sınırlı sayıda (ör. 20) sitesiz aday için Haiku alt ajanına
  "<isim> <şehir> official website" araması yaptırır. Ajan, alan adı otelin adıyla uyuşan resmi site
  adayını önerir. Booking, TripAdvisor, Facebook gibi ilan siteleri kabul edilmez.
- Önerilen URL kuyruğa yazılır. **Siteyi ertesi gece Actions indirir** ve normal akışa girer.
- Arama sonuçlarındaki özetler hiçbir zaman yayın bilgisi olarak kullanılmaz; sadece site bulmaya yarar.

### E. Yazar Routine'inin revizyonu

`docs/pipeline/WRITER.md` ve Routine istemi şöyle değişir:

- Uygun aday: `status: accepted` + çıkarılmış bilgi alanları dolu (sadece `verified` değil).
- **DirectBooker zorunlu değil.** Yoksa fiyat "Rates vary", `priceIndicator` yok (kurallar bunu zaten
  izin veriyor), yazım çıkarılmış ve doğrulanmış bilgilerden yapılır.
- 5 çeviri, Haiku modelinde bir `hotel-translator` alt ajanına yaptırılır (abonelik limitini korur);
  `node scripts/i18n-check.mjs` hataları yakalar.
- Routine saati Actions + classifier sonrasına (ör. 12:00 UTC) alınır.

## 5. Toplanacak bilgiler

### 5.1 Haiku karar şeması (aday başına)

```jsonc
{
  "id": "osm:node/123",
  // Karar
  "is_lodging": true,                    // gece kalınabilen yer mi (restoran, müze, bar, etkinlik mekanı değil)
  "operating_status": "open",            // open | seasonal | closed | unknown
  "category": "cave-hotels",             // 14 slug'dan biri veya null
  "also_fits": [],
  "niche_scope": "whole_property",       // whole_property | some_units | name_only | unclear
  "niche_unit_count": 12,                // metinde yazıyorsa
  "niche_feature": "Rooms carved into volcanic tuff in Göreme",
  "category_quote": "...",               // kanıttan BİREBİR alıntı (kod doğrular)
  "confidence": 0.93,
  "red_flags": [],                       // listing_site | for_sale | event_venue_only | restaurant_only |
                                         // museum | private_residence | closed_hint | theme_only
  "other_niche_type": null,              // 14 kategoriye uymayan niş (yel değirmeni, silo, uçak...)

  // Kimlik
  "official_name": "Gamirasu Cave Hotel",
  "property_type": "boutique hotel",     // hotel | lodge | B&B | guesthouse | camp | glamping | villa | train | ship
  "address": "...",
  "official_website": "https://...",

  // Konaklama bilgileri (sadece metinde açıkça yazanlar, her biri alıntılı)
  "room_count": { "value": 23, "quote": "..." },
  "room_types": ["Cave suite", "Deluxe cave room"],
  "amenities": [ { "text": "Spa", "quote": "..." } ],
  "highlights": [ { "text": "Rooms in a former Byzantine monastery", "quote": "..." } ],
  "check_in": null, "check_out": null,
  "season": { "text": "Open April–October", "quote": "..." },
  "audience": "adults_only",             // adults_only | family_friendly | unknown
  "access": { "text": "45 min drive from Kayseri airport", "quote": "..." },
  "accessibility_notes": null,
  "price_on_site": null,                 // sadece sitede açıkça yazıyorsa {amount, currency, basis, quote}
  "best_for": ["Couples"]
}
```

Kural: metinde olmayan her alan `null` ya da boş dizi. Haiku hiçbir alanı kendi genel bilgisinden doldurmaz.

### 5.2 Kod tarafından eklenenler

| Alan | Kaynak |
|---|---|
| Koordinat | OSM / Wikidata / JSON-LD (birbirinden >1 km farklıysa işaretle) |
| Ülke, şehir, bölge, kıta | Nominatim (mevcut) |
| Wikidata ID, Wikipedia linkleri | Wikidata |
| Fotoğraf | Wikimedia Commons, lisans + yazar bilgisiyle (`fetch-wikimedia-photos.mjs`) |
| Yakındaki yerler + mesafe | OSM / `data/destination-landmarks.json` |
| Affiliate linkleri | `src/lib/affiliate.ts` (Travelpayouts marker'ı, ücretsiz) |
| Kaynak izi | `sourceId`, `officialWebsite`, `verifiedAt`, kanıt URL'leri, karar dosyası yolu |

### 5.3 Site frontmatter'ı ile eşleme (`src/content/config.ts`)

| Frontmatter | Nereden |
|---|---|
| `name` | `official_name` |
| `category` | `category` |
| `destination`, `country`, `continent`, `address` | Nominatim + `address` |
| `description` | Yazar, `niche_feature` + `highlights` temelli |
| `highlights`, `amenities` | Alıntısı doğrulanmış Haiku alanları (+ JSON-LD) |
| `bestFor`, `tags` | `best_for`, `audience`, `niche_scope` |
| `priceRange`, `priceIndicator` | Gözlenen fiyat yoksa "Rates vary", gösterge yok |
| `checkInOut`, `seasonalInfo` | `check_in`/`check_out`, `season` |
| `nearbyAttractions`, `coordinates`, `officialWebsite`, `sourceId`, `verifiedAt` | Kod |
| `rating` | Editör puanı (7,5–9,5 kuralı); başka sitelerin puanı kopyalanmaz |
| `reviewCount` | 0 (sahte yorum sayısı yok) |

## 6. Kategori kabul kuralları (alt ajan istemine girer)

| Kategori | Kabul | Sık görülen yanlış pozitif |
|---|---|---|
| treehouse-hotels | Uyunan birim ağaçta veya ağaçlar arasında yükseltilmiş yapı | "Lemon Tree", "Treehouse" adlı hostel/bar, ağaç evi yapan firma |
| cave-hotels | Odalar kayaya/tüfe oyulmuş veya doğal mağara içinde | Fransızca "cave" = şarap mahzeni, "Cave" adlı bar, sadece mağara turu |
| underwater-rooms | Yatak odası su seviyesinin altında | Su altı restoranı, akvaryum manzaralı lobi |
| castle-hotels | Tarihî kale, saray, şato binasında konaklama | Kaleye bakan / kalenin adını taşıyan otel, kale temalı yeni bina |
| floating-hotels | Uyunan birim yüzen yapı veya tekne | Suya bakan otel, günlük tekne turu |
| bubble-hotels | Şeffaf şişme balon veya cam kubbe | "Bubble" adlı hostel, opak jeodezik kubbe |
| cliffside-hotels | Odalar uçurum yüzeyinde/kenarında, uçuruma oyulmuş veya asılı | Adında "Cliff" geçen sıradan sahil oteli |
| desert-camps | Çölde çadır/kamp/lodge | Çöl şehrindeki şehir oteli |
| jungle-lodges | Yağmur/bulut ormanı içinde lodge | Şehirdeki "Jungle" adlı hostel |
| ice-hotels | Buzdan/kardan oda veya cam iglo | "Igloo" kamp alanı |
| safari-lodges | Rezerv/koruma alanında, oyun sürüşü sunan lodge/çadır kamp | Safari parkı otelleri, "Safari" adlı şehir oteli |
| overwater-bungalows | Su üzerinde kazıklı villa/bungalov | Havuzlu "water villa", deniz manzaralı oda |
| lighthouse-hotels | Fener binası veya fener bekçisi evi | "Lighthouse" adlı motel/marina |
| train-hotels | Vagonda konaklama veya yataklı lüks tren | "Station Hotel", demiryolu temalı otel |

Genel ret kuralları: `niche_scope = name_only`; konaklama değil; kapalı; satılık ilanı; sadece
etkinlik mekanı; niş özelliği sadece dekorasyon/tema.

## 7. Kalite ölçümü (API'siz)

1. Kuyruktan 100 aday seçilir (her kategoriden; verified/weak/rejected karışık; 10+ dil).
2. Bunlar için kanıt paketleri hazırlanır. Bir Claude Code oturumunda Sonnet/Opus ana oturum ve siz
   birlikte doğru cevapları belirlersiniz. Bu `pipeline/eval/golden.json` olur.
3. Aynı paketler `hotel-classifier` (Haiku) alt ajanına verilir; `pipeline/eval/score.mjs` sonuçları karşılaştırır.
4. Hedef: kabul edilenlerin **≥%95'i doğru** (yanlış yayın pahalı), gerçek niş otellerin ≥%85'i yakalanmış.
5. İstem her değiştiğinde aynı set yeniden çalıştırılır.

Haiku hedefi tutturamazsa: eşik yükseltilir, daha çok aday `needs_review`'a gider.

## 8. Kapasite (bütçe yerine abonelik limiti)

Para maliyeti yok; sınırlayıcı olan, aboneliğin kullanım limiti ve sizin kontrol zamanınız.

- Başlangıç: classifier her gün **100 aday**, writer günde 8 otel.
- İlk hafta her Routine çalışmasının limitten ne kadar yediğine bakılır, sayı buna göre artırılır
  (Haiku alt ajanları ana oturumdan çok daha az harcar).
- Kaba takvim: günde 100–200 adayla mevcut 7.993 aday 6–12 haftada değerlendirilir. Yeni kaynaklar
  bunun üstüne gelir. Keşif ve indirme tamamen Actions'ta olduğu için hiç limit yemez.
- Gün içinde siz de Claude Code kullanıyorsanız, Routine'leri gece saatlerine koymak çakışmayı azaltır.

## 9. Fiyat ve rezervasyon (API'siz)

- DirectBooker bağlantısı Routine'de yok; olmadan da yayın yapılır ("Rates vary").
- DirectBooker'ı claude.ai bağlayıcısı olarak ücretsiz ekleyebiliyorsanız Routine'e eklenir; fiyat o zaman gösterilir.
- Travelpayouts affiliate linkleri ücretsiz ve zaten çalışıyor; gelir için fiyat göstermek şart değil.

## 10. Repoda yapılacaklar

```
.claude/agents/hotel-classifier.md     Haiku alt ajanı (sınıflandırma + çıkarım)
.claude/agents/hotel-translator.md     Haiku alt ajanı (çeviri, TRANSLATING.md kuralları)
.claude/agents/list-extractor.md       Haiku alt ajanı (liste sayfasından aday çıkarma)
pipeline/evidence.mjs                  site + alt sayfa + JSON-LD → pipeline-inbox dalı
pipeline/apply-decisions.mjs           alıntı doğrulama + candidates.json güncelleme
pipeline/sources/osm-tags.mjs, wikidata-sparql.mjs, lists.mjs
pipeline/eval/golden.json, score.mjs
docs/pipeline/CLASSIFIER.md            classifier Routine runbook'u
docs/pipeline/WRITER.md                revize (accepted, DirectBooker opsiyonel, Haiku çeviri)
.github/workflows/hotel-pipeline.yml   apply → discover → verify → evidence → status
```

Routine'ler:

- **Yeni:** "StayAtNiche classifier", her gün ~10:00 UTC, `docs/pipeline/CLASSIFIER.md`'yi uygular.
- **Mevcut:** "StayAtNiche daily writer", 04:50 → ~12:00 UTC, istemi revize WRITER.md'ye göre güncellenir.

## 11. Yol haritası

| Faz | İş | Çıktı |
|---|---|---|
| 1 (1–2 gün) | `evidence.mjs` + `pipeline-inbox` dalı + classifier alt ajanı + `apply-decisions.mjs` | Zengin kanıt; yazarın "kanıt yetersiz" sorunu biter |
| 2 (2–3 gün) | 100 adaylık altın set, Haiku isabet ölçümü, istem ayarı | İsabet raporu |
| 3 | Classifier Routine'i aç, writer'ı revize et ve saatini kaydır | Günde ~8 otel yayını başlar |
| 4 (1–2 hafta) | OSM etiketleri, SPARQL, küratörlü listeler, çok dilli terimler, sitesiz adaylar için WebSearch | Kuyruk büyür, ülke × kategori kapsama haritası |
| 5 (sürekli) | 90 günde bir tazelik kontrolü (Actions: site çalışıyor mu, "kapandı" metni var mı) | Kapanan otel / kırık link yok |

## 12. Sizin karar vermeniz gerekenler

1. **Sınır vakalar:** Fransız şarap şatoları, opak glamping kubbeleri, nehir gemileri ve sadece
   birkaç odası niş olan oteller kabul edilsin mi?
2. **Yayın modu:** İlk dönemde writer'ın PR'larını siz mi onaylayacaksınız, yoksa CI yeşilse otomatik
   birleştirme (bugünkü kural) devam mı?
3. **Routine'ler:** Classifier Routine'inin eklenmesi ve writer'ın saatinin ~12:00 UTC'ye kaydırılması uygun mu?
4. **İsteğe bağlı:** Ortamın ağ erişimi genişletilirse Claude oturumları siteleri doğrudan da
   okuyabilir. Ama bu plan buna ihtiyaç duymaz; Actions yeterli.
