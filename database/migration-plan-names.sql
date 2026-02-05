-- Paket isimleri: Starter, Growth, Pro, Business, Enterprise
UPDATE plans SET display_name = 'Starter'   WHERE max_screens = 3;
UPDATE plans SET display_name = 'Growth'    WHERE max_screens = 5;
UPDATE plans SET display_name = 'Pro'       WHERE max_screens = 7;
UPDATE plans SET display_name = 'Business'   WHERE max_screens = 10;
UPDATE plans SET display_name = 'Enterprise' WHERE max_screens = -1;
