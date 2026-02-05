/**
 * Auth helpers - localStorage (normal) veya sessionStorage (impersonation)
 * Impersonation penceresinde sessionStorage kullanılır, ana pencere etkilenmez.
 */

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
}

export function getStoredUser(): { id: string; email: string; role: string; business_id?: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem('impersonation_token');
}

export function clearImpersonation(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('impersonation_token');
  sessionStorage.removeItem('impersonation_user');
}
