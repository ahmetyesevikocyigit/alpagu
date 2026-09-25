# Alpagu Derneği

Next.js App Router ve TypeScript ile hazırlanmış kurumsal dernek sitesi.

Canlı adres: https://alpagudernegi.org
GitHub deposu: https://github.com/ahmetyesevikocyigit/alpagu
Sunucu: Hostinger VPS (`187.124.169.67`), systemd + Nginx + Let's Encrypt.

## Çalıştırma

Node.js 24.x ve pnpm 11.19.0 gerekir.

```sh
git clone https://github.com/ahmetyesevikocyigit/alpagu.git
cd alpagu
pnpm install --frozen-lockfile
pnpm dev
```

Üretim sürümü:

```sh
pnpm build
pnpm start
```

Adres: http://127.0.0.1:3000. Geliştirme sunucusu yalnızca yerel bilgisayara bağlıdır. Ortam değişkenleri için `.env.example` dosyasını `.env.local` olarak kopyalayabilirsiniz. Yerel site için ek servis gerekmez. Panel girişi için `pnpm admin:password` ile yönetim şifresini belirleyin.

## İçerik ve sayfalar

- Ana sayfa, hakkımızda, çalışmalar ve üç ayrı proje sayfası
- Havale/EFT bilgileri ve IBAN kopyalama
- Derneğin mevcut gönüllü başvuru formuna bağlantı
- İletişim, gizlilik ve özel 404 sayfası
- İçerik yönetimi: `/admin`; kullanım ve kurulum: [docs/ADMIN.md](docs/ADMIN.md)
- Başlangıç içerikleri: `src/lib/cms/seed.ts` ve `initial-pages.json`
- Temel stiller: `src/app/globals.css`
- Referansa göre yenilenen header, hero ve görsel düzen: `src/app/reference-theme.css`
- Alt bölüm tasarımı: `src/app/editorial.css`; açılan proje panelleri: `src/components/ProjectGallery.tsx`
- Responsive footer düzeni: `src/components/Footer.tsx` ve `Footer.module.css`
- Başlıklar: yerel Oswald; metinler: yerel Manrope (Türkçe karakter desteği)

Kurumsal içerikler dernek tarafından sağlanan bilgiler ve resmî Instagram hesabı esas alınarak hazırlanmıştır. Herkese açık görsel kaynakları [docs/ASSETS.md](docs/ASSETS.md) dosyasındadır.

## Görsel optimizasyonu

`sharp` doğrudan bağımlılık olarak kuruldu. Tüm fotoğraflar WebP'ye dönüştürüldü. `next/image`, farklı ekran boyutlarında uygun genişliği sunar; ilk büyük görsel öncelikli, aşağıdaki görseller tembel yüklenir. Başlangıç görselleri ve yazı tipleri yerelden; panelden yüklenen görseller VPS'teki kalıcı CMS veri dizininden sunulur.

```sh
pnpm optimize:images /tam/yol/orijinal-gorseller
```

Görseller depoda optimize edilmiş olarak bulunur. Yeni fotoğraflar için kaynak klasörünü yukarıdaki komuta parametre olarak verin. Dönüşüm özeti `image-optimization.json` dosyasına yazılır. Fotoğraf kaynakları [docs/ASSETS.md](docs/ASSETS.md) dosyasındadır. Haberlerde derneğin kendi Instagram duyuru görselleri kullanılır. Yeni duyurular 960 piksele ölçeklenir; mevcut WebP dosyaları yeniden kodlandığında daha büyük çıkarsa orijinal korunur.

## Tasarım tercihi

Bölüm başlıkları ortalanır; başlıkların yanına açıklama metni veya bağlantı yerleştirilmez. Bölüm bağlantıları ilgili içeriğin altında gösterilir.

## Etkileşim ve erişilebilirlik

“Dernekten haberler” kartları 700 piksel ve altındaki ekranlarda kaydırıldıkça sırasıyla üst üste gelir. Bu davranış CSS `position: sticky` ile sağlanır; ek JavaScript veya animasyon kütüphanesi kullanılmaz. Kartlar kısa ekranlara göre boyutlanır ve klavye odağı alan kart öne çıkar. Masaüstünde üç sütunlu haber düzeni korunur. Footer mobilde logo, iki sütunlu menü ve iletişim gruplarına ayrılır; yazılım imzası sağa hizalanır.

Proje vitrini fare, dokunma, klavye ve önceki/sonraki düğmeleriyle kullanılabilir. Mobilde dikey açılan panellere dönüşür. Bölümler doğrudan görünür; kaydırma sırasında dekoratif giriş animasyonu kullanılmaz. Panel geçişleri, hareket azaltma tercihine uyar. JavaScript olmadan sunucudan gelen metinler görünür kalır. Dekoratif üst başlık etiketleri site genelinden kaldırıldı. Site dış çerçeve olmadan ekranın tamamına yayılır; metin alanları okunabilir bir genişlikte tutulur.

Sık sorulan sorular aynı `name` değerine sahip yerel HTML `details` öğelerinden oluşur; yeni bir soru açılınca önceki kapanır. Artı/çarpı göstergeleri yazı karakteri yerine ortalanmış SVG ikonlarıdır. Klavye ile açma/kapama desteklenir.

## Teknik SEO ve yayına hazırlık

- Türkçe `lang`, UTF-8, sayfaya özgü başlık ve açıklamalar
- Canonical, Open Graph ve Twitter metadata
- NGO yapılandırılmış verisi; proje sayfalarında BreadcrumbList
- Statik üretim, responsive görseller, yerel fontlar, güvenlik başlıkları
- `robots.txt`, `sitemap.xml`, favicon ve sosyal paylaşım görseli

Canlı derlemede `NEXT_PUBLIC_SITE_URL=https://alpagudernegi.org` ve `SITE_INDEXABLE=true` kullanılır. Sitemap yayımlanan çalışma sayfalarıyla otomatik güncellenir.

GitHub'da Linux yayın paketini üretip Hostinger VPS'e dağıtmak için:

```sh
gh workflow run vps-build.yml --repo ahmetyesevikocyigit/alpagu
# İndirilen alpagu-vps paketi deploy/vps/deploy.sh ile VPS'e kurulur.
```

Canlı sürümün sayfa, bağlantı, SEO, 404 ve WebP kontrolü:

```sh
TEST_BASE_URL=https://alpagudernegi.org TEST_CANONICAL_URL=https://alpagudernegi.org TEST_INDEXABLE=true TEST_REPORT=verification-vps.json node scripts/verify-site.mjs
```

Kaynak kod GitHub'da tutulur. GitHub Actions tip kontrolü ve 12 uçtan uca testi geçtikten sonra bağımsız Linux paketini üretir; VPS yalnız bu hazır paketi çalıştırır.

## Tamamlanmayı bekleyen entegrasyonlar

Kartla online bağış / İş Bankası sanal POS entegrasyonu etkin değildir. Banka tarafından sağlanacak satıcı ve entegrasyon bilgileri olmadan kart bilgisi toplanmaz, örnek ödeme veya başarılı bağış kaydı oluşturulmaz. Mevcut bağış sayfası doğrulanmış havale/EFT bilgilerini sunar.

Türkçe yönetim paneli `/admin` adresindedir. Metinler, görseller, çalışmalar, haberler, sorular, iletişim ve bağış bilgileri panelden yönetilir. [Yönetim paneli rehberi](docs/ADMIN.md).

25 Eylül 2026 tarihinde GitHub'dan Hostinger VPS yayını, özel alan adı, HTTPS ve Google Search Console kurulumu tamamlandı.

Hostinger VPS dağıtım dosyaları ve geri alma adımları için [docs/VPS.md](docs/VPS.md) belgesine bakın.
