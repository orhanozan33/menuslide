import { apiClient } from '@/lib/api';

export type AdminActivityPayload = {
  action_type: string;
  page_key: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
};

/**
 * Admin hareket günlüğüne kayıt ekler (sadece admin/super_admin oturumunda çalışır).
 * Örnek: logAdminActivity({ action_type: 'template_save', page_key: 'editor', resource_id: templateId, details: { name: '...' } })
 */
export async function logAdminActivity(payload: AdminActivityPayload): Promise<void> {
  try {
    await apiClient('/reports/activity', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // Sessizce yoksay (yetkisiz kullanıcı veya ağ hatası)
  }
}
