-- Kullanıcı dil tercihi (sayfa başlangıç dili en; kullanıcı değiştirdiğinde saklanır)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'tr', 'fr'));

UPDATE users SET preferred_locale = 'en' WHERE preferred_locale IS NULL;
