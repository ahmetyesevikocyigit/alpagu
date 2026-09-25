# Yönetim paneli

Panel: https://alpagu.187.124.169.67.sslip.io/admin

Tek yönetim şifresiyle giriş yapılır. **Kaydet**, ekrandaki tüm kaydedilmemiş içerik değişikliklerini hemen yayımlar. Ayrı taslak veya yayınlama adımı yoktur. İnternete açık site üzerinde değişiklik görmek için sayfayı yenileyin.

## İçerik düzenleme

- **Ana sayfa:** Hero, fotoğraflar, butonlar, tanıtım metinleri, dört istatistik ve katkı kartları.
- **Sayfalar:** Hakkımızda ve tarihçe, bağış, gönüllülük, iletişim, gizlilik, çalışmaların giriş alanı.
- **Çalışmalar:** Ekleme, sıralama, ayrıntı ve görsel düzenleme, yayından kaldırma. Ana sayfada en fazla üç yayımlanan çalışma seçilir. Sayfa adresi ilk kayıttan sonra değişmez. Yeni sayfalar yeniden dağıtım gerekmeden açılır; yayından kaldırılanlar 404 döner.
- **Haberler:** Başlık, kısa açıklama, fotoğraf ve yönlendirme bağlantısı. En fazla üç haber ana sayfada yayımlanır; diğerleri panelde saklanır.
- **Sık sorulan sorular:** Ekleme, düzenleme, sıralama, kaldırma.
- **Site bilgileri:** Ortak iletişim bilgileri, gönüllü formu, banka ve IBAN. IBAN biçimi ve kontrol basamakları doğrulanır; hesap sahipliği banka tarafından kontrol edilmelidir.
- **Görsel kitaplığı:** JPG/PNG/WebP, 10 MB kaynak ve 40 megapiksel sınırı. Tarayıcı boyutu küçültür; sunucu tekrar doğrular, EXIF bilgisini kaldırır ve en fazla 2400 × 2400 piksel WebP oluşturur. Kaydedilmeyen görsel özel depoda kalır. Yayımlanmış görseller değişmez adresler alır.
- **Kayıt geçmişi:** Son 20 önceki kayıt tutulur. Geri yükleme tüm içerik belgesine uygulanır; mevcut sürüm de geçmişe alınır. Görseller fiziksel olarak silinmediği için eski sürümler çalışmaya devam eder.

SEO ayarları ilgili sayfanın altındaki açılır alandadır. Tasarım, menü yapısı, fontlar ve geliştirici imzası içerik panelinden değiştirilmez. Çoklu kullanıcı, online ödeme ve Instagram’dan otomatik içerik çekme bulunmaz.

İki açık sekme aynı sürümü düzenlerse ilk kayıt başarılı olur; ikinci sekme 409 uyarısı alır. İkinci sekmede yapılan metinleri kopyalayıp sayfayı yenileyerek birleştirin. Oturum sona ererse açık formdaki değişiklikleri koruyup yeni bir sekmede tekrar giriş yapabilirsiniz.

## Yerel geliştirme

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm admin:password
pnpm dev
```

Şifre terminalde görünmeden alınır ve scrypt hash olarak `.env.local` ile `.cms/password-hash` dosyasına yazılır. Gerçek şifre kaynak koda yazılmaz. Yerel içerikler `.cms/` altında atomik dosya yazımı ve kilitle kaydedilir. Bu dizin, ortam dosyaları ve test çıktıları Git'e dahil edilmez.

## Hostinger VPS yapılandırması

Uygulama `alpagu.service` ile çalışır ve yalnız `127.0.0.1:3194` üzerinden Nginx'e bağlanır. Kalıcı içerik, oturum ve görseller `/var/lib/alpagu/cms` altında tutulur. Kod sürümleri `/opt/alpagu/releases` altındadır; yeni dağıtımlar kalıcı veriyi değiştirmez.

Başlangıç yönetim hash'i `/etc/credstore.encrypted/alpagu-cms-password.cred` içinde systemd tarafından şifrelenmiş kimlik olarak saklanır. Uygulama kullanıcısı düz parolaya veya kimlik dosyasının şifrelenmemiş haline erişmez.

İçerik `content/published.json`, oturum ve giriş sınırı `auth/state.json`, görsel envanteri `media/index.json` olarak tutulur. Kayıtlar atomik dosya yazımı ve kilitlemeyle korunur. Next.js sunucu önbelleği başarılı kayıt sonrası derhal geçersizleştirilir.

## Şifre değiştirme

Panel menüsündeki **Şifre değiştir** bölümünde mevcut şifreyi, yeni şifreyi ve tekrarını girin. Yeni şifre 8–256 karakter olmalıdır. Bu işlem içerik kaydından bağımsızdır ve anında uygulanır. Mevcut oturum yeni çerez ve CSRF değeriyle yenilenir; diğer tüm oturumlar kapatılır. Beş hatalı mevcut şifre denemesinden sonra o oturum için 15 dakika bekleme uygulanır.

Yeni şifre, rastgele tuzla Argon2id (19 MiB, 2 tur, 1 paralellik) hash olarak yalnız özel `auth/state.json` kaydında saklanır. Düz şifre, API yanıtına, içerik geçmişine veya loglara yazılmaz. Mevcut başlangıç scrypt hash’leriyle giriş desteklenir. İçeriği geri yüklemek şifreyi değiştirmez. Eşzamanlı şifre değişikliklerinde yalnız bir işlem başarılı olur.

Şifreler ve oturum iptali aynı atomik kayıtta tutulur; dağıtımlar panelden belirlenen şifreyi korur. Bu özelliği içermeyen eski uygulama sürümüne geri dönmeyin: o sürüm yalnız başlangıç şifresini okur.

## Unutulan şifreyi sıfırlama

Paneldeki **Şifre değiştir** alanı tercih edilir. Başlangıç kimliğiyle kurtarma gerekiyorsa geliştirici yeni scrypt hash'ini systemd kimlik deposuna şifreleyip `alpagu.service` birimini yeniden başlatmalıdır. Düz şifreyi komut satırı argümanına, Git'e veya loglara yazmayın.

Oturumlar 12 saattir; HttpOnly, SameSite=Strict ve canlıda Secure çerez kullanılır. Tüm yönetim API’leri oturum kontrolü yapar; yazma işlemleri CSRF ve origin doğrulaması gerektirir. Beş başarısız girişten sonra ilgili adres için 15 dakika bekleme uygulanır. Panel noindex ve no-store ile sunulur.

## Doğrulama ve dağıtım

Next.js uygulaması Hostinger VPS'te systemd kaynak sınırları altında çalışır. Giriş yanıtı, doğrulama tamamlandıktan sonra düzenleyici içeriğini de taşır; tarayıcı ikinci bir içerik isteğini beklemez. Çerez yoksa giriş formu doğrudan sunucu HTML’inde gösterilir. Çerez varlığı yalnız ilk görünümü seçer; her yönetim API’si gerçek oturum kontrolünü yapar.

Kayıt sırasında okunan içerik ve ETag birlikte kullanılır; fazladan okuma kaldırılırken eşzamanlı yazma koruması korunur. Yalnız hazır site görselleri kullanılıyorsa görsel envanteri okunmaz. Oturumlar paylaşılan bellekte veya CDN’de önbelleğe alınmaz; çıkış ve şifre değişikliği geçerliliğini korur.

```sh
pnpm typecheck
pnpm test
gh workflow run vps-build.yml --repo ahmetyesevikocyigit/alpagu
```

`pnpm test` üretim derlemesi alır ve `127.0.0.1:3100` üzerinde rastgele geçici içerik diziniyle test sunucusu çalıştırır. Test şifresi yalnız bu yerel sunucu içindir. Gerçek CMS depoları kullanılmaz. Testler yetkisiz erişim, CSRF, oturum iptali, giriş sınırı, eşzamanlı kayıt, doğrulama, geri alma, proje adresleri, WebP yükleme, masaüstü ve mobil akışları kapsar.

Kod geri alma içerik geçmişinden bağımsızdır. Kod için `deploy/vps/rollback.sh`, içerik için paneldeki geri yükleme özelliği kullanılır.
