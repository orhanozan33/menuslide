'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  const message = error?.message || 'Sayfa yüklenirken bir sorun oluştu.';
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Bir hata oluştu</h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1.5rem' }}>
            {message}
          </p>
          <button
            type="button"
            onClick={() => reset?.()}
            style={{ padding: '0.5rem 1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
