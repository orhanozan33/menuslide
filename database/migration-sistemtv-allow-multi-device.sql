-- sistemtv@gmail.com işletmesine ait ekranlarda tek cihaz kısıtlamasını kaldır
-- Bu migration çalıştırıldığında sistemtv'nin işletmesindeki tüm ekranlara allow_multi_device = true atanır.
-- Supabase: Dashboard → SQL Editor → New query → bu dosyayı yapıştır → Run

-- allow_multi_device sütunu yoksa ekle
ALTER TABLE screens ADD COLUMN IF NOT EXISTS allow_multi_device BOOLEAN DEFAULT false;

-- sistemtv işletmesindeki ekranlara allow_multi_device = true
UPDATE screens s
SET allow_multi_device = true
FROM users u
WHERE u.email ILIKE 'sistemtv@gmail.com'
  AND s.business_id = u.business_id;
