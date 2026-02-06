-- Yerelden tam import öncesi: Tüm uygulama tablolarını temizler (FK sırasına uygun).
-- push-to-supabase.sh bu dosyayı kullanır; böylece kullanıcılar, resimler, videolar, super admin dahil her şey yerelden gelir.

TRUNCATE
  screen_edit_history,
  admin_activity_log,
  admin_permissions,
  payment_failures,
  display_viewers,
  screen_template_rotations,
  home_channels,
  contact_info,
  content_library,
  content_library_categories,
  screen_block_contents,
  template_block_contents,
  screen_blocks,
  template_blocks,
  screen_menu,
  menu_schedules,
  screens,
  menu_item_translations,
  menu_items,
  menus,
  payments,
  subscriptions,
  templates,
  plans,
  languages,
  users,
  businesses
RESTART IDENTITY CASCADE;
