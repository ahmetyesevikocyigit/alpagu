# Hostinger VPS yayını

Uygulama Hostinger VPS üzerinde systemd ile çalışır ve Nginx üzerinden yayınlanır.

## Yerleşim

- Sürümler: `/opt/alpagu/releases/`
- Aktif sürüm: `/opt/alpagu/current`
- Kalıcı CMS verisi ve yüklenen görseller: `/var/lib/alpagu/cms`
- Şifreli yönetim kimliği: `/etc/credstore.encrypted/alpagu-cms-password.cred`
- Servis: `alpagu.service`
- Yerel port: `127.0.0.1:3194`

## Dağıtım

Sunucuda root olarak:

```sh
git clone --depth 1 https://github.com/ahmetyesevikocyigit/alpagu.git /tmp/alpagu-bootstrap
SITE_HOST=alpagu.187.124.169.67.sslip.io \
SITE_INDEXABLE=false \
bash /tmp/alpagu-bootstrap/deploy/vps/deploy.sh
```

İlk kurulum güvenli bir yönetim şifresi üretip yalnız bir kez terminale yazdırır. Sunucuda yalnız scrypt hash'in systemd ile şifrelenmiş sürümü saklanır.

Alan adı bağlandıktan sonra `SITE_HOST=alpagudernegi.org` ve `SITE_INDEXABLE=true` ile yeniden dağıtım alınmalı, Nginx yapılandırması alan adına göre güncellenmeli ve Certbot sertifikası alınmalıdır.

## Doğrulama

```sh
systemctl status alpagu --no-pager
curl -fsS http://127.0.0.1:3194/api/health
journalctl -u alpagu -n 100 --no-pager
nginx -t
```

## Geri alma

```sh
bash /opt/alpagu/current/deploy/vps/rollback.sh
```

Komut bir önceki sürüme atomik olarak geçer, servisi yeniden başlatır ve sağlık kontrolünü bekler. CMS verisi sürüm dizininden bağımsız olduğu için kod geri alma içerik değişikliklerini silmez.
