-- Migration: Import all remaining categories from ContentLibrary.tsx

-- Insert Pasta items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Spaghetti Carbonara', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 100),
('Penne Arrabbiata', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 101),
('Fettuccine Alfredo', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 102),
('Lasagna', 'food', 'image', 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80', 103),
('Ravioli', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 104),
('Gnocchi', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 105),
('Linguine', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 106),
('Rigatoni', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 107),
('Fusilli', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 108),
('Macaroni & Cheese', 'food', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', 109),
('Tagliatelle', 'food', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', 110),
('Pappardelle', 'food', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', 111)
ON CONFLICT DO NOTHING;

-- Insert Salad items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Caesar Salad', 'food', 'image', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', 200),
('Greek Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 201),
('Cobb Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 202),
('Caprese Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', 203),
('Waldorf Salad', 'food', 'image', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80', 204),
('Quinoa Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 205),
('Mediterranean Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 206),
('Asian Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 207),
('Kale Salad', 'food', 'image', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', 208),
('Spinach Salad', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', 209),
('Arugula Salad', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 210),
('Coleslaw', 'food', 'image', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', 211)
ON CONFLICT DO NOTHING;

-- Insert Canadian cuisine items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Poutine', 'food', 'image', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80', 300),
('Maple Glazed Salmon', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 301),
('Butter Tarts', 'food', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80', 302),
('Tourtière', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', 303),
('Nanaimo Bars', 'food', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', 304),
('BeaverTails', 'food', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80', 305),
('Montreal Smoked Meat', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 306),
('Bannock', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', 307),
('Caesar Cocktail', 'food', 'image', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80', 308),
('Split Pea Soup', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 309)
ON CONFLICT DO NOTHING;

-- Insert Regional/Turkish cuisine items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 400),
('Lahmacun', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 401),
('Mantı', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 402),
('Döner', 'food', 'image', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', 403),
('İskender', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 404),
('Adana Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', 405),
('Urfa Kebap', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 406),
('Çiğ Köfte', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 407),
('Börek', 'food', 'image', 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', 408),
('Gözleme', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', 409),
('Pide', 'food', 'image', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', 410),
('Menemen', 'food', 'image', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80', 411)
ON CONFLICT DO NOTHING;

-- Insert European cuisine items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Coq au Vin', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 500),
('Bouillabaisse', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 501),
('Ratatouille', 'food', 'image', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', 502),
('Paella', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 503),
('Schnitzel', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 504),
('Goulash', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 505),
('Risotto', 'food', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', 506),
('Osso Buco', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 507),
('Fish & Chips', 'food', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', 508),
('Shepherd''s Pie', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', 509),
('Moussaka', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 510),
('Wiener Schnitzel', 'food', 'image', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', 511)
ON CONFLICT DO NOTHING;

-- Insert Dessert items (as food category)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Çikolatalı Pasta', 'food', 'image', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', 600),
('Cheesecake', 'food', 'image', 'https://images.unsplash.com/photo-1533134242820-b4f3f2d8f7b3?w=800&q=80', 601),
('Tiramisu', 'food', 'image', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80', 602),
('Dondurma', 'food', 'image', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', 603),
('Waffle', 'food', 'image', 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80', 604),
('Pankek', 'food', 'image', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', 605),
('Brownie', 'food', 'image', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', 606),
('Kurabiye', 'food', 'image', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80', 607),
('Donut', 'food', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80', 608),
('Cupcake', 'food', 'image', 'https://images.unsplash.com/photo-1426869884541-df7117556757?w=800&q=80', 609),
('Macaron', 'food', 'image', 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=80', 610),
('Profiterol', 'food', 'image', 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&q=80', 611)
ON CONFLICT DO NOTHING;

-- Insert additional drink items (from drinks category in ContentLibrary.tsx)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
('Kola', 'drinks', 'drink', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80', 100),
('Limonata', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=80', 101),
('Portakal Suyu', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80', 102),
('Smoothie', 'drinks', 'drink', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80', 103),
('Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80', 104),
('Buzlu Çay', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', 105),
('Mojito', 'drinks', 'drink', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80', 106),
('Frappe', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80', 107),
('Espresso', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80', 108),
('Cappuccino', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80', 109),
('Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80', 110),
('Türk Kahvesi', 'drinks', 'drink', 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=800&q=80', 111),
('Çay', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80', 112),
('Sıcak Çikolata', 'drinks', 'drink', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&q=80', 113)
ON CONFLICT DO NOTHING;

-- Insert Badge items (as campaign_badge type - we need to add this type support)
-- Note: Badges will be stored with campaign_text field
INSERT INTO content_library (name, category, type, content, display_order) VALUES
('%50 İndirim', 'badges', 'icon', '%50 İNDİRİM', 1),
('%30 İndirim', 'badges', 'icon', '%30 İNDİRİM', 2),
('%20 İndirim', 'badges', 'icon', '%20 İNDİRİM', 3),
('%10 İndirim', 'badges', 'icon', '%10 İNDİRİM', 4),
('Yeni', 'badges', 'icon', 'YENİ', 5),
('Popüler', 'badges', 'icon', 'POPÜLER', 6),
('En İyi', 'badges', 'icon', 'EN İYİ', 7),
('Özel', 'badges', 'icon', 'ÖZEL', 8),
('Sınırlı', 'badges', 'icon', 'SINIRLI', 9),
('Tükendi', 'badges', 'icon', 'TÜKENDİ', 10),
('Vegan', 'badges', 'icon', 'VEGAN', 11),
('Helal', 'badges', 'icon', 'HELAL', 12),
('Organik', 'badges', 'icon', 'ORGANİK', 13),
('Glutensiz', 'badges', 'icon', 'GLUTENSİZ', 14),
('Acı', 'badges', 'icon', 'ACI', 15),
('Şef Önerisi', 'badges', 'icon', 'ŞEF ÖNERİSİ', 16),
('1+1', 'badges', 'icon', '1+1', 17),
('2+1', 'badges', 'icon', '2 AL 1 ÖDE', 18),
('Ücretsiz Teslimat', 'badges', 'icon', 'ÜCRETSİZ TESLİMAT', 19),
('Bugünün Fırsatı', 'badges', 'icon', 'BUGÜNÜN FIRSATI', 20)
ON CONFLICT DO NOTHING;
