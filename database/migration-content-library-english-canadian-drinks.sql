-- Migration: English product names, Canadian cuisine category with rich images, and full drinks (cold, hot, alcoholic)

-- 1) Add Canadian Cuisine category if not exists
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('canadian', 'Canadian Cuisine', '🍁', 7)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon;

-- 2) Canadian food items – one rich image per dish (category: canadian)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Poutine', 'canadian', 'image', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=85', 1),
  ('Maple Glazed Salmon', 'canadian', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=85', 2),
  ('Butter Tarts', 'canadian', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=85', 3),
  ('Tourtière', 'canadian', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 4),
  ('Nanaimo Bars', 'canadian', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=85', 5),
  ('Beaver Tails', 'canadian', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=85', 6),
  ('Montreal Smoked Meat', 'canadian', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=85', 7),
  ('Bannock', 'canadian', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85', 8),
  ('Pea Soup', 'canadian', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=85', 9),
  ('Canadian Bacon', 'canadian', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 10);

-- 3) Drinks – cold, hot, alcoholic (English names, rich images)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Cola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=85', 200),
  ('Lemonade', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=85', 201),
  ('Orange Juice', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', 202),
  ('Iced Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=85', 203),
  ('Iced Coffee', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', 204),
  ('Sparkling Water', 'drinks', 'drink', 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=800&q=85', 205),
  ('Beer', 'drinks', 'drink', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=85', 206),
  ('Wine', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=85', 207),
  ('Caesar Cocktail', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=85', 208),
  ('Mojito', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=85', 209),
  ('Craft Beer', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=85', 210),
  ('Espresso', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=85', 211),
  ('Cappuccino', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=85', 212),
  ('Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', 213),
  ('Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=85', 214),
  ('Hot Chocolate', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&q=85', 215);

-- 4) Update common Turkish names to English (by exact name match)
UPDATE content_library SET name = 'Classic Burger' WHERE name = 'Klasik Burger';
UPDATE content_library SET name = 'Fried Chicken' WHERE name = 'Kızarmış Tavuk';
UPDATE content_library SET name = 'Chicken Wings' WHERE name = 'Tavuk Kanat';
UPDATE content_library SET name = 'Spaghetti' WHERE name = 'Spagetti';
UPDATE content_library SET name = 'Kebab' WHERE name = 'Kebap';
UPDATE content_library SET name = 'Adana Kebab' WHERE name = 'Adana Kebap';
UPDATE content_library SET name = 'Urfa Kebab' WHERE name = 'Urfa Kebap';
UPDATE content_library SET name = 'Doner' WHERE name = 'Döner';
UPDATE content_library SET name = 'Iskender' WHERE name = 'İskender';
UPDATE content_library SET name = 'Cig Kofte' WHERE name = 'Çiğ Köfte';
UPDATE content_library SET name = 'Borek' WHERE name = 'Börek';
UPDATE content_library SET name = 'Gozleme' WHERE name = 'Gözleme';
UPDATE content_library SET name = 'Cola' WHERE name = 'Kola';
UPDATE content_library SET name = 'Lemonade' WHERE name = 'Limonata';
UPDATE content_library SET name = 'Orange Juice' WHERE name = 'Portakal Suyu';
UPDATE content_library SET name = 'Iced Tea' WHERE name = 'Buzlu Çay';
UPDATE content_library SET name = 'Tea' WHERE name = 'Çay';
UPDATE content_library SET name = 'Hot Chocolate' WHERE name = 'Sıcak Çikolata';
UPDATE content_library SET name = 'Chocolate Cake' WHERE name = 'Çikolatalı Pasta';
UPDATE content_library SET name = 'Ice Cream' WHERE name = 'Dondurma';
UPDATE content_library SET name = 'Pancakes' WHERE name = 'Pankek';
UPDATE content_library SET name = 'Cookies' WHERE name = 'Kurabiye';
UPDATE content_library SET name = 'Profiterole' WHERE name = 'Profiterol';
UPDATE content_library SET name = 'Beaver Tails' WHERE name = 'BeaverTails';
