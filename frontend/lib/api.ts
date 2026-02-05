const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get auth token - sessionStorage (impersonation) önce, sonra localStorage
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
    if (token) return token;
  }

  // Fallback to Supabase if available
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/** RequestInit with body that can be a plain object (will be JSON stringified) */
type ApiRequestInit = Omit<RequestInit, 'body'> & { body?: BodyInit | Record<string, unknown> | null };

/**
 * API client with authentication
 */
export async function apiClient(endpoint: string, options: ApiRequestInit = {}) {
  const token = await getAuthToken();

  try {
    // Body'yi stringify et (plain object ise)
    let body: BodyInit | null | undefined;
    const rawBody = options.body;
    if (rawBody && typeof rawBody === 'object' && !(rawBody instanceof FormData) && !(rawBody instanceof Blob) && !ArrayBuffer.isView(rawBody) && !(rawBody instanceof ArrayBuffer)) {
      body = JSON.stringify(rawBody);
    } else {
      body = rawBody as BodyInit | null | undefined;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: { message?: string; error?: string } = {};
      try {
        const text = await response.text();
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = text?.trim() ? { message: text } : {};
        }
      } catch {
        errorData = {};
      }
      // 401: Pasif kullanıcı veya geçersiz token - oturumu kapat, login'e yönlendir
      if (response.status === 401 && typeof window !== 'undefined') {
        sessionStorage.removeItem('impersonation_token');
        sessionStorage.removeItem('impersonation_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = `/${typeof window !== 'undefined' ? (window.location.pathname.split('/')[1] || 'en') : 'en'}/login`;
        throw new Error(errorData?.message || errorData?.error || 'Oturum sonlandı.');
      }
      const backendMsg = errorData?.message || errorData?.error;
      const fallback = response.status >= 500 ? 'Sunucu hatası.' : response.status === 404 ? 'Bulunamadı.' : 'İstek işlenemedi.';
      const errorMessage = backendMsg && !/\b(4\d{2}|5\d{2})\b/.test(String(backendMsg)) ? backendMsg : fallback;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    try {
      const text = await response.text();
      if (!text) {
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('Error parsing response:', e);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error: any) {
    // Handle network errors
    if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      throw new Error('Backend bağlantı hatası. Backend\'in çalıştığından emin olun.');
    }
    throw error;
  }
}

/** TV / public sayfalarında gösterilmeye uygun, hata kodu içermeyen mesaj */
function publicFriendlyMessage(status: number, backendMessage?: string): string {
  if (backendMessage && !/\d{3}/.test(backendMessage) && !backendMessage.toLowerCase().includes('status')) {
    return backendMessage;
  }
  if (status === 404) return 'İçerik bulunamadı.';
  if (status === 401 || status === 403) return 'Erişim sağlanamadı.';
  if (status >= 500) return 'Sunucu şu an yanıt vermiyor. Lütfen daha sonra tekrar deneyin.';
  if (status >= 400) return 'İstek işlenemedi.';
  return 'Bağlantı hatası.';
}

/**
 * Public API client (no authentication)
 * TV / display sayfalarında hata kodları gösterilmez; kullanıcı dostu mesaj kullanılır.
 */
export async function publicApiClient(endpoint: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.');
  }

  if (!response.ok) {
    let errorData: { message?: string; error?: string } = {};
    try {
      const text = await response.text();
      if (text?.trim()) {
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = {};
        }
      }
    } catch {
      errorData = {};
    }
    const backendMsg = errorData?.message || errorData?.error;
    const message = publicFriendlyMessage(response.status, backendMsg);
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  const text = await response.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
