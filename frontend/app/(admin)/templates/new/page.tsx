'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { logAdminActivity } from '@/lib/admin-activity';
import { useTranslation } from '@/lib/i18n/useTranslation';

type GridOption = {
  id: string;
  labelKey: string;
  rows: number;
  cols: number;
  blocks: number;
  icon: string;
};

const gridOptions: GridOption[] = [
  { id: '1x1', labelKey: 'templates_grid_single', rows: 1, cols: 1, blocks: 1, icon: '■' },
  { id: '1x3', labelKey: 'templates_layout_3', rows: 1, cols: 3, blocks: 3, icon: '▬' },
  { id: '2x2', labelKey: 'templates_grid_2x2', rows: 2, cols: 2, blocks: 4, icon: '🔲' },
  { id: '2x3', labelKey: 'templates_grid_2x3', rows: 2, cols: 3, blocks: 6, icon: '▬' },
  { id: '4x2-7', labelKey: 'templates_layout_7', rows: 2, cols: 4, blocks: 7, icon: '▦' },
  { id: '4x2-8', labelKey: 'templates_layout_8', rows: 2, cols: 4, blocks: 8, icon: '▧' },
  { id: '3x3', labelKey: 'templates_grid_3x3', rows: 3, cols: 3, blocks: 9, icon: '⬛' },
  { id: '3x2', labelKey: 'templates_grid_3x2', rows: 3, cols: 2, blocks: 6, icon: '▮' },
  { id: '1x2', labelKey: 'templates_grid_1x2', rows: 1, cols: 2, blocks: 2, icon: '▭' },
  { id: '4x4', labelKey: 'templates_grid_4x4', rows: 4, cols: 4, blocks: 16, icon: '◼️' },
];

interface User {
  id: string;
  email: string;
  role: string;
  business_name?: string;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGrid, setSelectedGrid] = useState<GridOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    // Kullanıcı rolünü kontrol et
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
        
        // Admin ise kullanıcı listesini yükle
        if (user.role === 'super_admin' || user.role === 'admin') {
          loadUsers();
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiClient('/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleCreate = async () => {
    if (!templateName.trim()) {
      setError(t('templates_name_required_msg'));
      return;
    }

    if (!selectedGrid) {
      setError(t('templates_select_grid_required'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Template oluştur
      const requestBody: any = {
        name: `template_${Date.now()}`,
        display_name: templateName,
        description: description || undefined,
        block_count: selectedGrid.blocks,
      };

      // Admin başka bir kullanıcı adına template oluşturabilir
      if ((userRole === 'super_admin' || userRole === 'admin') && selectedUserId) {
        requestBody.target_user_id = selectedUserId;
      }

      const template = await apiClient('/templates', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      const templateId = (template as any)?.id;
      if (templateId) {
        logAdminActivity({ action_type: 'template_create', page_key: 'templates', resource_type: 'template', resource_id: templateId, details: { name: (requestBody as any).display_name } });
      }

      // Template düzenleme sayfasına yönlendir
      router.push(localePath(`/templates/${template.id}/edit`));
    } catch (err: any) {
      console.error('Error creating template:', err);
      setError(err.message || t('templates_create_failed_msg'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href={localePath('/dashboard')} className="text-xl font-bold text-gray-900">
                {t('login_title')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={localePath('/templates')} className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
            ← {t('templates_back')}
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🎨 {t('templates_new')}
            </h1>
            <p className="text-gray-600">
              {t('templates_new_subtitle')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Template Bilgileri */}
          <div className="mb-8 space-y-4">
            {/* Admin için kullanıcı seçimi */}
            {(userRole === 'super_admin' || userRole === 'admin') && (
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  {t('templates_select_user_optional')}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={loading}
                >
                  <option value="">{t('templates_for_my_account')}</option>
                  {users
                    .filter((user) => user.business_name) // Sadece firma ismi olan kullanıcıları göster
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.business_name} - {user.email}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('templates_empty_hint')}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                {t('templates_name_label')} *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t('templates_name_placeholder')}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                {t('templates_description_optional')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('templates_description_placeholder')}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
              />
            </div>
          </div>

          {/* Grid Seçimi */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('templates_select_grid')} *
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gridOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedGrid(option)}
                  disabled={loading}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedGrid?.id === option.id
                      ? 'border-blue-600 bg-blue-50 shadow-lg'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-4xl mb-3">{option.icon}</div>
                  <div className="font-bold text-gray-900 mb-1">{t(option.labelKey)}</div>
                  <div className="text-sm text-gray-600">{t('templates_block_count', { n: option.blocks })}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('templates_rows_cols', { rows: option.rows, cols: option.cols })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Önizleme */}
          {selectedGrid && (
            <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>👁️</span>
                {t('templates_preview_tv_size')}
              </h3>
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-4 border-gray-700 rounded-xl shadow-2xl mx-auto overflow-hidden"
                style={{
                  aspectRatio: '16/9',
                  width: '100%',
                  maxWidth: '1920px',
                  height: 'auto',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  className="w-full h-full grid"
                  style={{
                    gridTemplateColumns: `repeat(${selectedGrid.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${selectedGrid.rows}, 1fr)`,
                    gap: '2px',
                    padding: '20px',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  {Array.from({ length: selectedGrid.blocks }).map((_, idx) => {
                    // 7 blok için son blok (index 6) 2 sütunu kaplıyor
                    // 3 blok için son blok (index 2) 2 satır ve 2 sütunu kaplıyor
                    // 5 blok için 3. blok (index 2) 2 satırı kaplıyor
                    const is7BlockLast = selectedGrid.blocks === 7 && idx === 6;
                    const is3BlockLast = selectedGrid.blocks === 3 && idx === 2;
                    const is5BlockThird = selectedGrid.blocks === 5 && idx === 2;
                    const shouldSpanRows = is3BlockLast || is5BlockThird;
                    const shouldSpanCols = is3BlockLast || is7BlockLast;
                    
                    return (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center overflow-hidden"
                        style={{
                          gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                          gridRow: shouldSpanRows ? 'span 2' : 'auto',
                          minHeight: '0',
                          minWidth: '0',
                        }}
                      >
                        <span className="text-gray-600 font-semibold text-sm sm:text-base">{t('templates_block_n', { n: idx + 1 })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Aksiyonlar */}
          <div className="flex gap-4">
            <Link
              href={localePath('/templates')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-center"
            >
              {t('btn_cancel')}
            </Link>
            <button
              onClick={handleCreate}
              disabled={loading || !templateName.trim() || !selectedGrid}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ ' + t('templates_creating') : '✨ ' + t('templates_create_and_edit')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
