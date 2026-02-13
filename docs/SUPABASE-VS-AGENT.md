# Supabase vs Agent — Ne Ben Yaparım, Ne Sen Yaparsın

## Benim (Agent) yapabildiklerim

- **Kod:** Projedeki tüm dosyaları okumak, yazmak, düzenlemek (API, Roku, frontend).
- **SQL dosyası:** Migration veya sorgu dosyaları oluşturmak; sen bunları Supabase’de çalıştırırsın.
- **Doküman:** README, yol haritası, checklist yazmak.
- **Terminal:** Proje dizininde `npm run build`, `npm test`, script çalıştırmak (senin makinede).
- **Mantık:** Layout API’nin hangi tablolardan okuduğunu bilmek; `screens`, `screen_template_rotations` zaten kullanılıyor, ek tablo gerekmez.

## Benim yapamadıklarım (senin yapman gerekenler)

- **Supabase Dashboard’a giriş:** Hesabına ben giremem. Tabloları, veriyi, RLS’i sen görürsün.
- **Supabase’de SQL çalıştırmak:** Yazdığım `.sql` dosyasını Supabase SQL Editor’de **sen** çalıştırırsın.
- **Vercel / DigitalOcean’a giriş:** Env ekleme, deploy, Spaces’e dosya yükleme hep senin işin.
- **Spaces’e görsel yüklemek:** Hangi path’e hangi dosyayı koyacağını söyleyebilirim; yükleyen sen olacaksın (veya script yazıp sen çalıştırırsın).

---

## Özet tablo

| İş | Kim yapar |
|----|-----------|
| Layout API kodu, Roku kodu | Agent |
| Migration SQL dosyası üretmek | Agent |
| Supabase’de o SQL’i çalıştırmak | Sen |
| Supabase’de tablo/veri kontrolü | Sen |
| Vercel env, deploy | Sen |
| DO Spaces bucket, CDN, dosya yükleme | Sen |
| “Hangi screen/template id’lerine dosya atayım?” sorusuna cevap | Agent (sorgu/sayfa verebilirim) |

---

## Şu an projede durum

- **Layout API** zaten `screens` ve `screen_template_rotations` tablolarını kullanıyor. Yeni tablo gerekmiyor.
- Slide URL: `{NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL}/slides/{screen_id}/{template_id}.jpg`
- Senin yapacakların: Vercel env (yaptın), Spaces’e `slides/{screen_id}/{template_id}.jpg` yüklemek, gerekirse Supabase’den bu id’leri listeleyecek sorguyu çalıştırmak.

Aşağıda “Spaces’e hangi dosyaları yükleyeceğim?” sorusu için Supabase’de çalıştıracağın sorgu var.
