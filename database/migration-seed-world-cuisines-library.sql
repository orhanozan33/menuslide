-- Migration: Kütphaneye dünya mutfakları, meyve tabakları, içecekler, kokteyller, tatlılar, milkshakeler, kahveler

-- 1) Gerekli kategorileri ekle (yoksa)
INSERT INTO content_library_categories (slug, label, icon, display_order) VALUES
  ('fruits', 'Meyve Tabakları', '🍇', 8),
  ('cocktails', 'Kokteyller', '🍸', 9)
ON CONFLICT (slug) DO NOTHING;

-- 2) Dünya Mutfakları - Yiyecekler (food)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
-- İtalyan
('Risotto', 'food', 'image', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=85', 1000),
('Osso Buco', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 1001),
('Tiramisu', 'food', 'image', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=85', 1002),
('Prosciutto', 'food', 'image', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=85', 1003),
('Bruschetta', 'food', 'image', 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&q=85', 1004),
-- Meksika
('Tacos', 'food', 'image', 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=85', 1010),
('Nachos', 'food', 'image', 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&q=85', 1011),
('Guacamole', 'food', 'image', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&q=85', 1012),
('Quesadilla', 'food', 'image', 'https://images.unsplash.com/photo-1618040996337-6d0f9e0a6d0e?w=800&q=85', 1013),
('Enchiladas', 'food', 'image', 'https://images.unsplash.com/photo-1534352956576-aa98c60b2f30?w=800&q=85', 1014),
('Burrito', 'food', 'image', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=85', 1015),
-- Japon
('Sushi', 'food', 'image', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=85', 1020),
('Ramen', 'food', 'image', 'https://images.unsplash.com/photo-1569718212165-3a2443992c38?w=800&q=85', 1021),
('Tempura', 'food', 'image', 'https://images.unsplash.com/photo-1569058242567-7de24b70d18a?w=800&q=85', 1022),
('Teriyaki', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 1023),
('Udon', 'food', 'image', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=85', 1024),
('Dumplings', 'food', 'image', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=85', 1025),
-- Çin
('Kung Pao Chicken', 'food', 'image', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=85', 1030),
('Sweet & Sour', 'food', 'image', 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&q=85', 1031),
('Fried Rice', 'food', 'image', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=85', 1032),
('Peking Duck', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 1033),
-- Tay
('Pad Thai', 'food', 'image', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=85', 1040),
('Tom Yum', 'food', 'image', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=85', 1041),
('Green Curry', 'food', 'image', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=85', 1042),
('Mango Sticky Rice', 'food', 'image', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800&q=85', 1043),
-- Hint
('Butter Chicken', 'food', 'image', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=85', 1050),
('Tandoori', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 1051),
('Biryani', 'food', 'image', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=85', 1052),
('Naan Bread', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85', 1053),
('Samosa', 'food', 'image', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=85', 1054),
-- Akdeniz / Orta Doğu
('Hummus', 'food', 'image', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=85', 1060),
('Falafel', 'food', 'image', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=85', 1061),
('Greek Gyro', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=85', 1062),
('Baklava', 'food', 'image', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=85', 1063),
('Shawarma', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=85', 1064),
-- Amerikan
('BBQ Ribs', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=85', 1070),
('Hot Dog', 'food', 'image', 'https://images.unsplash.com/photo-1612392062422-ef19b42f74df?w=800&q=85', 1071),
('Mac & Cheese', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=85', 1072),
('Chicken Tenders', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', 1073),
('Onion Rings', 'food', 'image', 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=85', 1074),
-- Deniz ürünleri
('Grilled Salmon', 'food', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=85', 1080),
('Shrimp Scampi', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=85', 1081),
('Fish Tacos', 'food', 'image', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=85', 1082),
('Lobster', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=85', 1083)
;

-- 3) Meyve Tabakları (fruits)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Fresh Fruit Platter', 'fruits', 'image', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=85', 1),
('Tropical Fruit Bowl', 'fruits', 'image', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', 2),
('Berry Platter', 'fruits', 'image', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=85', 3),
('Watermelon Platter', 'fruits', 'image', 'https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=800&q=85', 4),
('Citrus Fruit Bowl', 'fruits', 'image', 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800&q=85', 5),
('Apple & Grape Platter', 'fruits', 'image', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=85', 6),
('Mango & Pineapple', 'fruits', 'image', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800&q=85', 7),
('Fruit Salad', 'fruits', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=85', 8),
('Melon Platter', 'fruits', 'image', 'https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=800&q=85', 9),
('Exotic Fruit Bowl', 'fruits', 'image', 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800&q=85', 10)
;

-- 4) İçecekler - Alkolsüz
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Coca-Cola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=85', 300),
('Pepsi', 'drinks', 'drink', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&q=85', 301),
('Sprite', 'drinks', 'drink', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&q=85', 302),
('Fanta', 'drinks', 'drink', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&q=85', 303),
('Orange Juice', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', 304),
('Apple Juice', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', 305),
('Lemonade', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011783-c91d1bbe2fdc?w=800&q=85', 306),
('Iced Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=85', 307),
('Sparkling Water', 'drinks', 'drink', 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=800&q=85', 308),
('Coconut Water', 'drinks', 'drink', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800&q=85', 309),
('Smoothie', 'drinks', 'drink', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=85', 310),
('Energy Drink', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=85', 311)
;

-- 5) Alkollü İçecekler & Kokteyller
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Whisky', 'drinks', 'drink', 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=90', 400),
('Vodka', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=90', 401),
('Tequila', 'drinks', 'drink', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=90', 402),
('Rum', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 403),
('Gin', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', 404),
('Champagne', 'drinks', 'drink', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=90', 405),
('Wine Red', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=90', 406),
('Wine White', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=90', 407),
('Beer', 'drinks', 'drink', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=90', 408),
('Craft Beer', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=90', 409),
('Margarita', 'drinks', 'drink', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=90', 410),
('Mojito', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', 411),
('Old Fashioned', 'drinks', 'drink', 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=90', 412),
('Piña Colada', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 413),
('Aperol Spritz', 'drinks', 'drink', 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', 414),
('Martini', 'drinks', 'drink', 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', 415),
('Bloody Mary', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', 416),
('Negroni', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 417),
('Espresso Martini', 'drinks', 'drink', 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', 418),
('Sangria', 'drinks', 'drink', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=90', 419)
;

-- 6) Tatlılar (desserts)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Chocolate Cake', 'desserts', 'image', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=85', 1),
('Cheesecake', 'desserts', 'image', 'https://images.unsplash.com/photo-1533134242820-b4f3f2d8f7b3?w=800&q=85', 2),
('Ice Cream', 'desserts', 'image', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=85', 3),
('Tiramisu', 'desserts', 'image', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=85', 4),
('Brownie', 'desserts', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=85', 5),
('Donut', 'desserts', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=85', 6),
('Macaron', 'desserts', 'image', 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=85', 7),
('Cupcake', 'desserts', 'image', 'https://images.unsplash.com/photo-1426869884541-df7117556757?w=800&q=85', 8),
('Cookie', 'desserts', 'image', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=85', 9),
('Waffle', 'desserts', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=85', 10),
('Pancakes', 'desserts', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85', 11),
('Profiterole', 'desserts', 'image', 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&q=85', 12),
('Creme Brulee', 'desserts', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=85', 13),
('Mousse', 'desserts', 'image', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=85', 14)
;

-- 7) Milkshakeler
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Chocolate Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=85', 500),
('Vanilla Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=85', 501),
('Strawberry Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=85', 502),
('Oreo Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=85', 503),
('Banana Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', 504),
('Caramel Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=85', 505)
;

-- 8) Kahveler
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Espresso', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=85', 600),
('Cappuccino', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=85', 601),
('Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', 602),
('Americano', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=85', 603),
('Mocha', 'drinks', 'drink', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=85', 604),
('Iced Coffee', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', 605),
('Cold Brew', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=85', 606),
('Flat White', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=85', 607),
('Turkish Coffee', 'drinks', 'drink', 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=800&q=85', 608),
('Matcha Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1536256262092-7d4532834961?w=800&q=85', 609),
('Chai Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=85', 610),
('Hot Chocolate', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&q=85', 611)
;
