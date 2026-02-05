-- Tüm fiyatlar .99 ile biter (aylık ve yıllık)

UPDATE plans SET price_monthly = 35.99,  price_yearly = 388.99  WHERE max_screens = 3;
UPDATE plans SET price_monthly = 59.99,  price_yearly = 647.99  WHERE max_screens = 5;
UPDATE plans SET price_monthly = 83.99,  price_yearly = 907.99  WHERE max_screens = 7;
UPDATE plans SET price_monthly = 119.99, price_yearly = 1294.99 WHERE max_screens = 10;
UPDATE plans SET price_monthly = 179.99, price_yearly = 1943.99 WHERE max_screens = -1;
