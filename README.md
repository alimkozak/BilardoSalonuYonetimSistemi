# Bilardo Salonu Yönetim Sistemi (BSS)

Bu proje, bilardo salonlarının yönetimi için tasarlanmış bir veritabanı sistemidir. Sistem, masa yönetimi, müşteri takibi, ürün satışları, rezervasyonlar ve ödemeler gibi temel işlevleri içermektedir.

## Özellikler

- Masa yönetimi ve durum takibi
- Müşteri bilgileri ve ziyaret geçmişi
- Ürün stok ve satış takibi
- Rezervasyon sistemi
- Ödeme ve fatura yönetimi
- Bildirim sistemi

## Veritabanı Şeması

Sistem aşağıdaki temel varlıkları içermektedir:

- Masalar
- Müşteriler
- Ürünler
- Satışlar
- Siparişler
- Rezervasyonlar
- Ödemeler
- Bildirimler

Detaylı veritabanı şeması için `database_schema.txt` dosyasına bakınız.

## Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/[kullanici-adi]/bilardo-salonu-yonetim-sistemi.git
```

2. Veritabanını oluşturun:
```sql
CREATE DATABASE bilardo_salonu;
```

3. Veritabanı şemasını içe aktarın:
```sql
source database_schema.sql
```

## Katkıda Bulunma

1. Bu repository'yi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: X'`)
4. Branch'inizi push edin (`git push origin feature/yeniOzellik`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız. 