-- orhan@gmail.com kullanıcısının "5 Bloklu Şablon (Kopya)" şablon adını
-- düzgün görünen şablona uyumlu "5 Bloklu Şablon 1 (kopya)" olarak düzeltir.
UPDATE templates
SET display_name = '5 Bloklu Şablon 1 (kopya)',
    updated_at = COALESCE(updated_at, NOW())
WHERE display_name = '5 Bloklu Şablon (Kopya)'
  AND scope = 'user'
  AND created_by = (SELECT id FROM users WHERE email = 'orhan@gmail.com' LIMIT 1);
