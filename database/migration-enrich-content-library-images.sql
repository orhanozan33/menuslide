-- Migration: Enrich content library with rich, diverse images across all categories

-- Food – main dishes, burgers, salads, breakfast (rich visuals)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Grilled Steak', 'food', 'image', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=90', 500),
  ('BBQ Ribs', 'food', 'image', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=90', 501),
  ('Fish Tacos', 'food', 'image', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=90', 502),
  ('Avocado Toast', 'food', 'image', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', 503),
  ('Eggs Benedict', 'food', 'image', 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', 504),
  ('Shrimp Bowl', 'food', 'image', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=90', 505),
  ('Grilled Salmon', 'food', 'image', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', 506),
  ('Caesar Wrap', 'food', 'image', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=90', 507),
  ('Falafel Plate', 'food', 'image', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=90', 508),
  ('Sushi Platter', 'food', 'image', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=90', 509),
  ('Ramen Bowl', 'food', 'image', 'https://images.unsplash.com/photo-1569718212165-3a2858982b79?w=800&q=90', 510),
  ('Taco Feast', 'food', 'image', 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=90', 511),
  ('Mediterranean Plate', 'food', 'image', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=90', 512),
  ('Buddha Bowl', 'food', 'image', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=90', 513),
  ('Grilled Chicken', 'food', 'image', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=90', 514);

-- Pasta – varied pasta dishes with distinct images
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Spaghetti Bolognese', 'pasta', 'image', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=90', 600),
  ('Penne Vodka', 'pasta', 'image', 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=90', 601),
  ('Lobster Linguine', 'pasta', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=90', 602),
  ('Mushroom Risotto', 'pasta', 'image', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=90', 603),
  ('Cacio e Pepe', 'pasta', 'image', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=90', 604),
  ('Stuffed Shells', 'pasta', 'image', 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=90', 605),
  ('Pesto Pasta', 'pasta', 'image', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=90', 606),
  ('Tomato Basil Pasta', 'pasta', 'image', 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=90', 607);

-- Drinks – cold, hot, cocktails (rich visuals)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Fresh Smoothie Bowl', 'drinks', 'drink', 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=90', 300),
  ('Matcha Latte', 'drinks', 'drink', 'https://images.unsplash.com/photo-1536256264052-4d01d838c98a?w=800&q=90', 301),
  ('Fresh Juice', 'drinks', 'drink', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=90', 302),
  ('Craft Cocktail', 'drinks', 'drink', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', 303),
  ('Iced Matcha', 'drinks', 'drink', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=90', 304),
  ('Milkshake', 'drinks', 'drink', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=90', 305),
  ('Espresso Shot', 'drinks', 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=90', 306),
  ('Herbal Tea', 'drinks', 'drink', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=90', 307),
  ('Sparkling Lemonade', 'drinks', 'drink', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=90', 308),
  ('Cold Brew', 'drinks', 'drink', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=90', 309);

-- Desserts – cakes, pastries, ice cream (rich visuals)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Chocolate Cake', 'desserts', 'image', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=90', 700),
  ('New York Cheesecake', 'desserts', 'image', 'https://images.unsplash.com/photo-1533134242820-b4f3f2d8f7b3?w=800&q=90', 701),
  ('Gelato', 'desserts', 'image', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=90', 702),
  ('Croissant', 'desserts', 'image', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=90', 703),
  ('Fruit Tart', 'desserts', 'image', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=90', 704),
  ('Panna Cotta', 'desserts', 'image', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=90', 705),
  ('Cinnamon Roll', 'desserts', 'image', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=90', 706),
  ('Macarons', 'desserts', 'image', 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=90', 707),
  ('Chocolate Mousse', 'desserts', 'image', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=90', 708),
  ('Berry Parfait', 'desserts', 'image', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=90', 709);

-- Backgrounds – HD food & ambiance (for templates)
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Coffee Shop Ambiance', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=90', 100),
  ('Restaurant Table', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=90', 101),
  ('Fresh Ingredients', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&q=90', 102),
  ('Gourmet Plating', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90', 103),
  ('Bar Counter', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=90', 104),
  ('Bakery Style', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=90', 105),
  ('Outdoor Dining', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=90', 106),
  ('Minimal Dark', 'backgrounds', 'background', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=90', 107);

-- Canadian – extra Canadian dishes with rich images
INSERT INTO content_library (name, category, type, url, display_order) VALUES
  ('Classic Poutine', 'canadian', 'image', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=90', 20),
  ('Saskatoon Berry Pie', 'canadian', 'image', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=90', 21),
  ('Cod au Gratin', 'canadian', 'image', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', 22);
