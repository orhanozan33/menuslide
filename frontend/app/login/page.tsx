'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { t, localePath } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Try local auth first (backend API)
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = t('login_failed');
        try {
          const errorData = await response.json();
          errorMessage = /deactivated|pasif|désactivé/i.test(errorData.message || errorData.error || '')
          ? t('login_account_deactivated')
          : (errorData.message || errorData.error || t('login_failed'));
        } catch {
          if (response.status === 0 || response.status >= 500) {
            errorMessage = t('login_backend_unreachable');
          } else if (response.status === 401) {
            errorMessage = t('login_invalid_credentials');
          } else {
            errorMessage = t('login_check_credentials');
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.user || !data.token) {
        throw new Error(t('login_invalid_response'));
      }

      const { user, token } = data;
      
      // Store token in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect based on user role
      const userRole = user.role;
      if (userRole === 'super_admin') {
        router.push(localePath('/users'));
      } else {
        router.push(localePath('/dashboard'));
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = err.message || t('login_check_credentials');
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = t('login_backend_unreachable_hint');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-6 overflow-x-hidden">
      <LanguageSwitcher fixed className="!top-4 !left-auto !right-4 z-50" />
      <div className="bg-white p-5 sm:p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6 text-center">{t('login_title')}</h1>
        <form onSubmit={handleLogin}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('login_email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('login_password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[48px] touch-manipulation"
          >
            {loading ? t('login_submitting') : t('login_submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
