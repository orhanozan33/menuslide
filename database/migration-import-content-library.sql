-- Migration: Import existing content library items from ContentLibrary.tsx

-- First, clear existing data (optional - comment out if you want to keep existing)
-- TRUNCATE TABLE content_library;

-- Insert Food items
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Pizza Margherita', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 1),
('Pepperoni Pizza', 'food', 'image', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', 2),
('Veggie Pizza', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', 3),
('Four Cheese', 'food', 'image', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', 4),
('Hawaiian Pizza', 'food', 'image', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', 5),
('Klasik Burger', 'food', 'image', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 6),
('Cheese Burger', 'food', 'image', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', 7),
('Double Burger', 'food', 'image', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', 8),
('Bacon Burger', 'food', 'image', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80', 9),
('Veggie Burger', 'food', 'image', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800&q=80', 10),
('Spagetti', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 11),
('Penne Arrabiata', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 12),
('Fettuccine Alfredo', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 13),
('Carbonara', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 14),
('Club Sandwich', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 15),
('Chicken Wrap', 'food', 'image', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', 16),
('Kızarmış Tavuk', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 17),
('Tavuk Kanat', 'food', 'image', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', 18),
('Caesar Salad', 'food', 'image', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', 19),
('Greek Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 20),
('Pizza + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', 21),
('Kebap + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 22),
('Kebap + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 23),
('Hamburger + Kola + Patates', 'food', 'image', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', 24),
('Burger Menü', 'food', 'image', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', 25),
('Pizza Menü', 'food', 'image', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', 26),
('Döner + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 27),
('Lahmacun + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 28),
('Tavuk + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 29),
('Tavuk + Patates + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', 30),
('İskender + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 31),
('Adana Kebap + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 32),
('Pide + Ayran', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 33),
('Makarna + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 34),
('Sandwich + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 35),
('Wrap + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', 36),
('Tavuk Kanat + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', 37),
('Fish & Chips + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 38),
('Taco + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=80', 39),
('Sushi + Kola', 'food', 'image', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80', 40)
ON CONFLICT DO NOTHING;

-- Insert Drink items
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Coca Cola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 1),
('Pepsi', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 2),
('Sprite', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 3),
('Fanta', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 4),
('7UP', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 5),
('Mountain Dew', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 6),
('Dr. Pepper', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 7),
('Coca Cola Zero', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 8),
('Pepsi Max', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 9),
('Schweppes', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 10),
('Red Bull', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 11),
('Monster Energy', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 12),
('Portakal Suyu', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 13),
('Elma Suyu', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 14),
('Limonata', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011783-c91d1bbe2fdc?w=400&q=80', 15),
('Buzlu Çay', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', 16),
('Kahve', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&q=80', 17),
('Su', 'drinks', 'drink', 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=400&q=80', 18),
('Smoothie', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 19),
('Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80', 20)
ON CONFLICT DO NOTHING;

-- Insert Icon items (with emoji content)
INSERT INTO content_library (name, category, type, content, display_order) VALUES
('Yıldız', 'icons', 'icon', '⭐', 1),
('Ateş', 'icons', 'icon', '🔥', 2),
('Yeni', 'icons', 'icon', '🆕', 3),
('Acı', 'icons', 'icon', '🌶️', 4),
('Kalp', 'icons', 'icon', '❤️', 5),
('Onay', 'icons', 'icon', '✅', 6),
('Işıltı', 'icons', 'icon', '✨', 7),
('Taç', 'icons', 'icon', '👑', 8),
('Hediye', 'icons', 'icon', '🎁', 9),
('Kupa', 'icons', 'icon', '🏆', 10),
('Pizza', 'icons', 'icon', '🍕', 11),
('Burger', 'icons', 'icon', '🍔', 12),
('Patates', 'icons', 'icon', '🍟', 13),
('Taco', 'icons', 'icon', '🌮', 14),
('Suşi', 'icons', 'icon', '🍣', 15),
('Makarna', 'icons', 'icon', '🍝', 16),
('Salata', 'icons', 'icon', '🥗', 17),
('Tavuk', 'icons', 'icon', '🍗', 18),
('Coca Cola', 'icons', 'icon', '🥤', 19),
('Pepsi', 'icons', 'icon', '🥤', 20),
('Sprite', 'icons', 'icon', '🥤', 21),
('Kahve', 'icons', 'icon', '☕', 22),
('Çay', 'icons', 'icon', '🍵', 23),
('Portakal Suyu', 'icons', 'icon', '🧃', 24),
('Limonata', 'icons', 'icon', '🍋', 25),
('Su', 'icons', 'icon', '💧', 26),
('Milkshake', 'icons', 'icon', '🥛', 27),
('Pasta', 'icons', 'icon', '🍰', 28),
('Dondurma', 'icons', 'icon', '🍦', 29),
('Kurabiye', 'icons', 'icon', '🍪', 30),
('Donut', 'icons', 'icon', '🍩', 31),
('Vegan', 'icons', 'icon', '🌱', 32),
('Helal', 'icons', 'icon', '☪️', 33),
('Glutensiz', 'icons', 'icon', '🌾', 34),
('Organik', 'icons', 'icon', '🍃', 35),
('Baharatlı', 'icons', 'icon', '🔥', 36),
('Şef Önerisi', 'icons', 'icon', '👨‍🍳', 37),
('Hızlı', 'icons', 'icon', '⏱️', 38),
('İndirim', 'icons', 'icon', '💰', 39)
ON CONFLICT DO NOTHING;

-- Insert Background items
INSERT INTO content_library (name, category, type, url, gradient, color, display_order) VALUES
('Pizza Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&q=90', NULL, NULL, 1),
('Burger Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1920&q=90', NULL, NULL, 2),
('Makarna Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1920&q=90', NULL, NULL, 3),
('Sushi Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=1920&q=90', NULL, NULL, 4),
('Tavuk Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=1920&q=90', NULL, NULL, 5),
('Salata Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=90', NULL, NULL, 6),
('Kahvaltı Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1920&q=90', NULL, NULL, 7),
('Tatlı Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1920&q=90', NULL, NULL, 8),
('Barbekü Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1920&q=90', NULL, NULL, 9),
('Deniz Ürünleri Arka Plan', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1920&q=90', NULL, NULL, 10),
('Kırmızı Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', NULL, 11),
('Mavi Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', NULL, 12),
('Yeşil Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', NULL, 13),
('Turuncu Gradyan', 'backgrounds', 'background', NULL, 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', NULL, 14),
('Koyu Mavi', 'backgrounds', 'background', NULL, NULL, '#1a237e', 15),
('Koyu Kırmızı', 'backgrounds', 'background', NULL, NULL, '#b71c1c', 16),
('Koyu Yeşil', 'backgrounds', 'background', NULL, NULL, '#1b5e20', 17)
ON CONFLICT DO NOTHING;

-- Insert Text template items
INSERT INTO content_library (name, category, type, template, sample, display_order) VALUES
('Başlık', 'text', 'text', 'title', 'Başlık Metni', 1),
('Alt Başlık', 'text', 'text', 'subtitle', 'Alt başlık metni', 2),
('Fiyat', 'text', 'text', 'price', '₺99.99', 3),
('Açıklama', 'text', 'text', 'description', 'Ürün açıklaması...', 4)
ON CONFLICT DO NOTHING;
