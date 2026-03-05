/**
 * Image Optimizer — StayAtNiche
 * ─────────────────────────────
 * Kullanım:
 *   npm run optimize-images
 *
 * Görselleri `raw-images/` klasörüne at, script çalıştır.
 * Optimize edilmiş WebP dosyaları `public/images/` klasörüne kaydedilir.
 *
 * Boyut hedefleri:
 *   hero   → max 1200px geniş, WebP q80  (~150-250 KB)
 *   card   → max 800px geniş,  WebP q80  (~60-120 KB)
 *   thumb  → max 400px geniş,  WebP q75  (~20-50 KB)
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const INPUT_DIR  = './raw-images';
const OUTPUT_DIR = './public/images';

// ─── Konfigürasyon ────────────────────────────────────────────────────────────
const PRESETS = {
  hero:  { maxWidth: 1200, maxHeight: 800,  quality: 80 },  // hotel detail, blog cover
  card:  { maxWidth: 800,  maxHeight: 600,  quality: 80 },  // hotel/category kartları
  thumb: { maxWidth: 400,  maxHeight: 300,  quality: 75 },  // küçük thumbnaillar
};

const SUPPORTED = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff'];

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function getFileSize(filePath) {
  const s = await stat(filePath);
  return s.size;
}

async function processImage(inputPath, filename, preset, presetName) {
  const baseName   = path.parse(filename).name;
  const outputName = `${baseName}-${presetName}.webp`;
  const outputPath = path.join(OUTPUT_DIR, outputName);

  const { maxWidth, maxHeight, quality } = PRESETS[presetName];

  await sharp(inputPath)
    .rotate()                            // EXIF rotation düzelt
    .resize(maxWidth, maxHeight, {
      fit: 'inside',                     // oranı koru, kırpma yok
      withoutEnlargement: true,          // küçük görseli büyütme
    })
    .webp({ quality, effort: 4 })        // effort 4 = hız/kalite dengesi
    .toFile(outputPath);

  const inSize  = await getFileSize(inputPath);
  const outSize = await getFileSize(outputPath);
  const saving  = ((1 - outSize / inSize) * 100).toFixed(1);

  return { outputName, inSize, outSize, saving };
}

// ─── Ana fonksiyon ────────────────────────────────────────────────────────────
async function main() {
  // Klasörleri oluştur
  if (!existsSync(INPUT_DIR))  await mkdir(INPUT_DIR,  { recursive: true });
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const files = await readdir(INPUT_DIR);
  const images = files.filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()));

  if (images.length === 0) {
    console.log(`\n⚠️  raw-images/ klasörü boş veya görsel yok.`);
    console.log(`   Desteklenen formatlar: ${SUPPORTED.join(', ')}`);
    console.log(`   Firefly görsellerini raw-images/ klasörüne at ve tekrar çalıştır.\n`);
    return;
  }

  console.log(`\n🖼  ${images.length} görsel bulundu — optimize ediliyor...\n`);

  let totalIn = 0;
  let totalOut = 0;
  const results = [];

  for (const filename of images) {
    const inputPath = path.join(INPUT_DIR, filename);
    const inSize = await getFileSize(inputPath);
    console.log(`📂 ${filename} (${formatBytes(inSize)})`);

    // Her görsel için 3 boyut üret
    for (const presetName of Object.keys(PRESETS)) {
      try {
        const result = await processImage(inputPath, filename, presetName, presetName);
        console.log(
          `   ✅ ${result.outputName.padEnd(45)} ${formatBytes(result.inSize).padStart(9)} → ${formatBytes(result.outSize).padStart(8)}  (-${result.saving}%)`
        );
        totalIn  += result.inSize;
        totalOut += result.outSize;
        results.push(result);
      } catch (err) {
        console.log(`   ❌ ${presetName}: ${err.message}`);
      }
    }
    console.log('');
  }

  // Özet
  const totalSaving = ((1 - totalOut / totalIn) * 100).toFixed(1);
  console.log('─'.repeat(70));
  console.log(`✨ Toplam: ${formatBytes(totalIn)} → ${formatBytes(totalOut)}  (${totalSaving}% tasarruf)`);
  console.log(`📁 Dosyalar kaydedildi: ${OUTPUT_DIR}/`);
  console.log('\n💡 CMS\'de nasıl kullan:');
  console.log('   hero  → /images/gorsel-adi-hero.webp   (hotel detay, blog kapak)');
  console.log('   card  → /images/gorsel-adi-card.webp   (hotel/kategori kartları)');
  console.log('   thumb → /images/gorsel-adi-thumb.webp  (mini görseller)\n');
}

main().catch(console.error);
