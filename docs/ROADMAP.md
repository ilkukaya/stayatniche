# StayAtNiche: Durum Raporu ve Yol Haritası

## 1. Mevcut durum (tespit)

**Var olanlar:** Astro 4 statik site, 298 sayfa (105 otel, 14 kategori, 90 destinasyon, 37 blog, 39 deneyim), Tailwind, Netlify'da canlı (stayatniche.com), Decap CMS (/admin), Travelpayouts marker `478307` (27 program), llms.txt, robots.txt, JSON-LD (Breadcrumb, ItemList, LodgingBusiness), GA4/GTM/Clarity/Plausible altyapısı (ID'ler boş).

**Bulunan kritik sorunlar (bu turda düzeltildi):**

| Sorun | Etki | Durum |
|---|---|---|
| Otel sayfası kutusundaki Expedia/Klook/Tiqets/Kiwi linkleri takipsizdi (marker yoktu) | Tıklamalar **sıfır komisyon** | ✅ Düzeltildi: tüm linkler `tp.media` üzerinden, sayfa bazlı `sub_id` ile |
| Blog içindeki ~80 markdown partner linki takipsiz | Sıfır komisyon | ✅ Rehype eklentisi otomatik sarıyor |
| `aggregateRating` + uydurma `reviewCount` (ör. "847 reviews") | Google'ın sahte/kendi-kendine yorum kuralı ihlali → manuel ceza riski, güven kaybı | ✅ Kaldırıldı, "Editor score" oldu |
| "Every stay personally reviewed" iddiası | Doğru değilse FTC/güven riski | ✅ "Hand-picked & editor-scored" |
| Ana sayfa istatistikleri şişirilmiş (`|| 400`, `min 40 ülke`) | Yanıltıcı | ✅ Gerçek sayılar |
| Sitemap'te her sayfa "lastmod = bugün" | Google lastmod'u yok sayar | ✅ Sadece gerçek tarih |
| `/rss.xml` linkleniyordu ama yoktu; SearchAction hedefi (`/categories/?q=`) çalışmıyordu | Hata / geçersiz schema | ✅ RSS + gerçek `/search/` sayfası |
| Kırık görsel ikonları (dış Unsplash bağımlılığı) | Kötü UX | ✅ Global yedek görsel; **asıl çözüm: gerçek fotoğraflar (bkz. 3)** |
| Header'da olmayan AdSense/CSP izinleri, OG görseli yok, PNG ikon yok | Reklam çalışmaz, paylaşımlar boş | ✅ |

## 2. Bu turda eklenenler

- **Gelir:** merkezi `withTracking()`; Booking.com `aid` desteği (ID gelince tek satır); AdSense hazır `<AdSlot>` (ID girilene kadar hiçbir şey göstermez, CLS güvenli).
- **SEO:** FAQPage schema (otel sayfaları + ana sayfa), Article schema iyileştirmesi, doğru `lastmod`, RSS, OG görseli, robots'a yeni AI botları.
- **AEO/GEO:** answer-first SSS blokları, `llms.txt` + `llms-full.txt` (tüm varlıkların tek satırlık özeti), temiz varlık verisi.
- **UX:** site içi arama (`/search/`), hero'da arama + hızlı çipler, mobilde önce başlık, PWA ikonları.
- **DevOps:** CI (build + regresyon kontrolü: takipsiz link, aggregateRating, eksik meta), Dependabot, CSP güncellemesi.

## 3. Sıradaki işler (ben yapabilirim)

1. Gerçek fotoğraf hattı: Unsplash API / oteller için Travelpayouts-Hotellook fotoğrafları (API anahtarı gerekir) → `public/images` + `sharp` ile AVIF/WebP.
2. Karşılaştırma tabloları ve "Best X in Y" programatik sayfalar (kategori × destinasyon) → uzun kuyruk trafik.
3. Fiyat/otel verisi doğrulaması: `bookingUrl` alanlarındaki Booking.com linklerinin çoğu doğrulanmamış (sandbox'ta internet yok, kontrol edemedim). Kırık link = kayıp gelir.
4. E-posta bülteni akışını canlıya alma (Beehiiv/Brevo anahtarı gerekir).
5. Pinterest/Instagram için otomatik pin görselleri.

## 4. SADECE SİZİN yapabileceğiniz adımlar (hesap/kimlik gerektirir)

Bunları yapmadan gelir gelmez; sırayla:

1. **Google Search Console**: `stayatniche.com` alan adını doğrulayın → sitemap: `https://stayatniche.com/sitemap.xml`. Doğrulama kodunu `src/content/settings/seo.json` → `googleVerification` alanına yazın (veya bana verin).
2. **Bing Webmaster Tools**: aynı şekilde (Bing = ChatGPT/Copilot aramasının kaynağı). `bingVerification`.
3. **GA4**: ölçüm ID'sini (`G-XXXX`) `analytics.json` → `ga4Id`.
4. **Google AdSense**: başvuru (site canlı + gizlilik/iletişim/hakkında sayfaları şart). Onaylanınca `adsenseClient` (`ca-pub-…`) ve `adsenseSlots` doldurulur. *Not: AdSense onayı için düzenli özgün içerik ve trafik gerekir; ilk haftalarda onay gelmeyebilir.*
5. **Booking.com ortaklığı** (Awin veya doğrudan): onay sonrası `BOOKING_AID` değerini `src/lib/affiliate.ts`'e yazın. Oteller için en yüksek komisyon buradan gelir.
6. **Travelpayouts panelinde** hangi programlara *onaylı* olduğunuzu kontrol edin; onaysız programın linki komisyon yazmaz.
7. **Sosyal hesaplar**: `social.json`'daki Instagram/Pinterest/X/Facebook/TikTok adresleri tahmindir; hesapları açın ya da boşaltın (Organization schema'da `sameAs` olarak yayınlanıyor).
8. **GitHub varsayılan dal**: şu an `claude/setup-stayatniche-project-xHSQk`. Repo Settings → Branches → default'u `main` yapın (önce `main` oluşturulmalı), sonra `netlify.toml`'daki production `branch` satırını güncelleyin.
9. **Netlify**: Domain settings → `www.stayatniche.com` → apex'e yönlendirme + HTTPS sertifikası; Forms bildirimi (bülten webhook'u); env değişkenleri (`NEWSLETTER_PROVIDER`, anahtarlar).

## 5. Sıfır bütçe güncellemesi (2. tur)

- **Fotoğrafsız da bitmiş görünen site:** 14 kategori + 7 kıta için özgün, lisans sorunu olmayan illüstrasyon posterleri (`public/images/art/`). Dış (Unsplash) bağımlılığı kaldırıldı.
- **ChatGPT görselleri için hazır sistem:** `docs/IMAGE-PROMPTS.md` (her sayfa için dosya adı + hazır prompt). Görseli `raw-images/<slug>.png` olarak koyup `npm run optimize-images` çalıştırın; site otomatik kullanır, içerik dosyası düzenlemek gerekmez. Yerel görsel her zaman illüstrasyonun önüne geçer.
- **Uydurma sosyal kanıt kaldırıldı** ("2.400+ abone", "4.9 puan").
- **Programatik SEO:** `/countries/*` (25 ülke) ve `/best/<tür>-in-<ülke>` (12 sayfa): karşılaştırma tablosu, SSS, ItemList schema, takipli affiliate CTA.
- Gerçek öncelik sırası: (1) kategori görselleri (14), (2) öne çıkan oteller, (3) diğerleri.

## 6. Tasarım yenilemesi (3. tur)
- Yeni ana sayfa: koyu hero + entegre arama paneli (tür / yer / bütçe), kategori şeridi, kaydırmalı öne çıkan stays, bütçe kartları, kıta kartları, "nasıl seçiyoruz", rehberler, bülten, SSS.
- `/hotels/` artık filtre + sıralama sayfası (tür, bütçe, isim/yer araması, URL ile paylaşılabilir).
- Airbnb tarzı yeni otel kartı: kalp ile kaydetme (`/saved/`, cihazda saklanır), fiyat, puan, "Check rates" bağlantısı.
- Mobilde alt gezinme çubuğu (Home / Explore / Search / Saved / Guides), otel sayfalarında gizli (kendi sabit rezervasyon çubuğu var).
- İçerik dosyalarındaki eski dış (Unsplash) görsel bağlantıları artık yok sayılıyor; görseller yerel dosya > çizim poster sırasıyla seçilir.
