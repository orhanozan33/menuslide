/**
 * Admin activity log - Super admin için okunabilir etiketler ve detay formatı
 */

export const ACTIVITY_PAGE_LABELS: Record<string, string> = {
  editor: 'Editör',
  library: 'İçerik Kütüphanesi',
  menus: 'Menüler',
  templates: 'Şablonlar',
  screens: 'Ekranlar',
  users: 'Kullanıcılar',
  reports: 'Raporlar',
  registration_requests: 'Kayıt Talepleri',
  'registration-requests': 'Kayıt Talepleri',
  'user-uploads': 'Yüklemeler',
  settings: 'Ayarlar',
  stripe: 'Ödeme Ayarları',
};

/** İşlem türü → Super admin için anlaşılır açıklama (TR) */
export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  // Kütüphane
  library_delete: 'Kütüphaneden resim/görsel sildi',
  library_upload: 'Kütüphaneye resim/görsel yükledi',
  library_update: 'Kütüphane içeriğini güncelledi',
  library_remove_duplicates: 'Aynı isimdeki tekrarları sildi',
  library_select: 'Kütüphaneden içerik seçti',
  // Menü
  menu_create: 'Menü oluşturdu',
  menu_update: 'Menü güncelledi',
  menu_delete: 'Menü sildi',
  menu_item_create: 'Menü öğesi ekledi',
  menu_item_update: 'Menü öğesini güncelledi',
  menu_item_delete: 'Menü öğesini sildi',
  // Ekran
  screen_create: 'Ekran oluşturdu',
  screen_update: 'Ekran güncelledi',
  screen_delete: 'Ekran sildi',
  // Şablon
  template_create: 'Şablon oluşturdu',
  template_update: 'Şablon güncelledi',
  template_delete: 'Şablon sildi',
  template_save: 'Şablon kaydetti',
  template_apply: 'Şablonu ekrana uyguladı',
  template_duplicate: 'Şablon kopyaladı',
  template_copy_system: 'Sistem şablonunu kopyaladı',
  // Editör
  image_add: 'Resim ekledi',
  image_edit: 'Resim düzenledi',
  block_add: 'Blok ekledi',
  block_remove: 'Blok kaldırdı',
  // Kullanıcı / İşletme
  user_create: 'Kullanıcı oluşturdu',
  user_update: 'Kullanıcı güncelledi',
  user_delete: 'Kullanıcı sildi',
  user_edit: 'Kullanıcı düzenledi',
  business_create: 'İşletme oluşturdu',
  business_update: 'İşletme güncelledi',
  // Kayıt talepleri
  reg_approve: 'Kayıt talebini onayladı',
  reg_reject: 'Kayıt talebini reddetti',
  reg_delete: 'Kayıt talebini sildi',
  // Raporlar
  subscription_mark_paid: 'Aboneliği ödendi olarak işaretledi',
};

interface ActivityRow {
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
}

/**
 * Detay sütunu için açıklayıcı metin üretir.
 * Örn: "Kütüphaneden 'Fotoğraf.jpg' isimli görsel silindi"
 */
export function formatActivityDetail(row: ActivityRow): string {
  const action = row.action_type ?? '';
  const details = row.details ?? {};
  const name = typeof details.name === 'string' ? details.name : null;
  const resourceId = row.resource_id ? String(row.resource_id).slice(0, 8) : null;

  switch (action) {
    case 'library_delete':
      return name ? `"${name}" isimli görsel/resim silindi` : `İçerik silindi ${resourceId ? `(#${resourceId})` : ''}`;
    case 'library_upload':
      return name ? `"${name}" yüklendi` : `Yeni içerik eklendi ${resourceId ? `(#${resourceId})` : ''}`;
    case 'library_update':
      return name ? `"${name}" güncellendi` : `İçerik güncellendi ${resourceId ? `(#${resourceId})` : ''}`;
    case 'library_remove_duplicates':
      const deleted = typeof details.deleted === 'number' ? details.deleted : 0;
      return deleted > 0 ? `${deleted} adet tekrarlanan içerik silindi` : 'Tekrarlar temizlendi';
    case 'menu_create':
    case 'menu_update':
      return name ? `"${name}"` : resourceId ? `Menü #${resourceId}` : '-';
    case 'menu_item_create':
    case 'menu_item_update':
    case 'menu_item_delete':
      return name ? `"${name}"` : resourceId ? `Öğe #${resourceId}` : '-';
    case 'screen_create':
    case 'screen_update':
    case 'screen_delete':
      return name ? `"${name}"` : resourceId ? `Ekran #${resourceId}` : '-';
    case 'template_create':
    case 'template_update':
    case 'template_delete':
    case 'template_duplicate':
    case 'template_copy_system':
      return name ? `"${name}"` : resourceId ? `Şablon #${resourceId}` : '-';
    case 'template_apply':
      return details.screen_id ? `Ekrana uygulandı (ekran #${String(details.screen_id).slice(0, 8)})` : '-';
    case 'user_create':
    case 'user_update':
    case 'user_delete':
      return name ? `E-posta: ${name}` : resourceId ? `#${resourceId}` : '-';
    case 'business_create':
    case 'business_update':
      return name ? `"${name}"` : resourceId ? `#${resourceId}` : '-';
    case 'reg_approve':
    case 'reg_reject':
    case 'reg_delete':
      return resourceId ? `Kayıt talebi #${resourceId}` : '-';
    case 'subscription_mark_paid':
      return details.period_months ? `${details.period_months} aylık ödeme işaretlendi` : 'Ödeme işaretlendi';
    default:
      if (name) return String(name);
      if (row.resource_type && resourceId) return `${row.resource_type} #${resourceId}`;
      return '-';
  }
}
