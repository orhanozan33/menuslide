import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">404 – Sayfa bulunamadı</h1>
      <p className="text-slate-600 mb-6 text-center">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}
