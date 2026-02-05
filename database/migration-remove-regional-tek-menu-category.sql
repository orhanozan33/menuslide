-- Tek Menü / regional kategorisini kaldır (frontend ve API’de artık kullanılmıyor)
DELETE FROM content_library_categories WHERE slug IN ('regional', 'tek-menu', 'tek_menu');
