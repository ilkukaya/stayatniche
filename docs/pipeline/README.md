# Otel hattı: nasıl çalışır

Amaç: 14 niş kategoride dünyadaki gerçek otelleri bulmak, sizin onayınızla siteye eklemek.
Sizin tek işiniz **onay kuyruğu sayfasında karar vermek**:
https://claude.ai/artifact/WC5XfcRYrJmXf8aqCCfDz7

## Günlük döngü

| Saat (UTC) | Kim | Ne yapar | Dosya |
|---|---|---|---|
| Gece (fiilen ~07:00) | GitHub Actions, ücretsiz | Dünkü kararları kuyruğa işler, yeni aday bulur, ülke/konum doldurur, sıradaki 150 adayın resmi sitesini indirir | `.github/workflows/hotel-pipeline.yml` |
| ~10:15 | Claude Routine "classifier" | Onaylarınızı kuyruğa yazar; indirilen siteleri Haiku alt ajanlarına okutur; niş olanları onay kuyruğuna koyar | `docs/pipeline/CLASSIFIER.md` |
| Gün içinde | **Siz** | Onay kuyruğunda: Yayınla / Reddet / Emin değilim | onay kuyruğu sayfası |
| ~12:45 | Claude Routine "writer" | Onayladıklarınızın sayfasını yazar (İngilizce Sonnet, 5 dil Haiku), build + PR + merge; Netlify yayınlar | `docs/pipeline/WRITER.md` |

## Çalışma sırası: hücreler

Birim "hücre" = kategori × ülke (ör. Mağara × Türkiye). Bir hücrede 2 otel yayınlanınca site
otomatik olarak "Best cave hotels in Turkey" sayfasını 6 dilde üretir. Bu yüzden adaylar hücre
sırasıyla işlenir: `pipeline/priorities.mjs` içindeki liste önce, sonra en kalabalık hücreler.

## Aday durumları (`data/pipeline/candidates.json`)

`new` → `verified` / `weak` (eski anahtar kelime kontrolü) → site indirilir →
`classified` (Haiku niş buldu, onayınızı bekliyor) → `approved` (onayladınız) → `published`.
Elenenler: `rejected` (Haiku, siz ya da isim kuralı), `duplicate`.

## Kurallar

- Haiku sadece otelin kendi sitesindeki metinden karar verir; her iddia için birebir alıntı verir
  ve `pipeline/check-decisions.mjs` alıntıyı sitede bulamazsa o bilgiyi siler.
- Siz onaylamadan hiçbir otel yayınlanmaz.
- Fiyat sadece gözlenmişse yazılır, yoksa "Rates vary". Puan ve yorum sayısı uydurulmaz.

## Elle çalıştırma

- Gece işini hemen çalıştırmak: GitHub → Actions → "Hotel pipeline (nightly)" → Run workflow
  (`evidence_count` ile kaç site indirileceği seçilir).
- Durum özeti: `data/pipeline/STATUS.md`.
