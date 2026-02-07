'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HOME_CHANNELS } from '@/lib/home-channels';
import { LoginModal } from './LoginModal';
import { LegalModal } from './LegalModal';

interface HomeChannel {
  slug: string;
  title: string;
  description?: string;
  link?: string;
  thumbnail?: string;
}

interface HomePageProps {
  localePath: (path: string) => string;
}

function TVFrame({
  previewUrl,
  title,
  onClick,
  thumbnail,
}: {
  previewUrl: string;
  title: string;
  onClick: () => void;
  thumbnail?: string;
}) {
  const [inView, setInView] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setInView(true);
      },
      { rootMargin: '100px', threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setLoadFailed(false);
  }, [previewUrl]);

  const showIframe = inView && previewUrl && !loadFailed;

  return (
    <div
      ref={containerRef}
      className="group flex flex-col items-center cursor-pointer touch-manipulation"
      onClick={onClick}
    >
      <div className="relative w-full max-w-[280px] sm:max-w-sm transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.99]">
        {/* Gerçekçi TV — belirgin çerçeve, ayaklı model */}
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            aspectRatio: '16/9',
            boxShadow:
              '0 0 0 1px rgba(0,0,0,0.5), 0 0 0 2px rgba(60,60,65,0.9), 0 8px 16px rgba(0,0,0,0.4), 0 20px 40px -10px rgba(0,0,0,0.5)',
          }}
        >
          {/* TV çerçevesi — kalın, mat siyah/gri bezel */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'linear-gradient(180deg, #2d2f33 0%, #1e2024 30%, #181a1e 70%, #1a1c20 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.03)',
            }}
          />
          {/* Ekran alanı — gerçek TV’deki gibi içeri çekik */}
          <div className="absolute inset-[8px] rounded overflow-hidden bg-black">
            {showIframe ? (
              <iframe
                src={previewUrl}
                title={title}
                className="w-full h-full pointer-events-none"
                loading="lazy"
                onError={() => setLoadFailed(true)}
              />
            ) : (
              <div className="w-full h-full bg-black">
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : null}
              </div>
            )}
          </div>
          <div className="absolute inset-0 pointer-events-none rounded-lg group-hover:ring-2 group-hover:ring-white/15 transition-all" />
        </div>
        {/* TV ayağı — merkezi pedastal, geniş taban */}
        <div className="flex justify-center -mt-px">
          <div
            className="relative flex flex-col items-center"
            style={{ width: '65%', minWidth: 80 }}
          >
            <div
              className="w-full h-3 rounded-t-sm"
              style={{
                background: 'linear-gradient(180deg, #25272b 0%, #1c1e22 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            />
            <div
              className="w-[85%] h-6 rounded-b-md"
              style={{
                background: 'linear-gradient(180deg, #1e2024 0%, #16181c 50%, #121418 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            />
          </div>
        </div>
        {/* Channel label */}
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
        </div>
      </div>
    </div>
  );
}

/** Token'ı link veya slug'dan çıkar; önizleme her zaman mevcut origin'de açılsın (iframe aynı sitede yüklensin). */
function getPreviewUrl(ch: HomeChannel, _localePath: (p: string) => string): string {
  const token = ch.link
    ? ch.link.replace(/^\/+/, '').replace(/^https?:\/\/[^/]+\/?/i, '').replace(/^[a-z]{2}\/display\/?/i, '').split('/').filter(Boolean).pop() || ch.slug
    : ch.slug;
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/display/${encodeURIComponent(token)}`;
}

export function HomePage({ localePath }: HomePageProps) {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<HomeChannel[]>(HOME_CHANNELS);
  const [previewChannel, setPreviewChannel] = useState<HomeChannel | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '', address: '', whatsapp: '' });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetch('/api/home-channels', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: unknown) => {
        const list = Array.isArray(data) && data.length > 0 ? data : HOME_CHANNELS;
        // Canlıda localhost linklerini kullanma: sadece path kalsın (getPreviewUrl zaten origin kullanır)
        setChannels(
          list.map((c: HomeChannel) => {
            if (!c.link || !/localhost|127\.0\.0\.1/i.test(c.link)) return c;
            const token = c.link.replace(/^\/+/, '').replace(/^https?:\/\/[^/]+\/?/i, '').replace(/^[a-z]{2}\/display\/?/i, '').split('/').filter(Boolean).pop() || c.slug || 'channel';
            return { ...c, link: `/display/${token}` };
          })
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/contact-info', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { email?: string; phone?: string; address?: string; whatsapp?: string }) =>
        setContactInfo({
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          whatsapp: data.whatsapp || '',
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!previewChannel) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewChannel(null);
    };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [previewChannel]);

  return (
    <div className="min-h-screen bg-[#06090f] text-white font-sans antialiased overflow-x-hidden">
      {/* Header: logo + nav + Giriş + Kayıt + dil */}
      <header className="fixed top-0 left-0 right-0 z-50 min-h-[4rem] h-16 flex items-center justify-between px-3 sm:px-6 md:px-12 pt-[env(safe-area-inset-top)] bg-[#06090f]/98 sm:bg-[#06090f]/95 backdrop-blur-md border-b border-white/5">
        <Link href={localePath('/')} className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0" onClick={() => setMobileNavOpen(false)}>
          <img src="/menuslide-logo.png" alt="MenuSlide" className="h-9 sm:h-10 w-auto object-contain" />
        </Link>
        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-4 md:gap-8">
          <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
            {t('home_features')}
          </a>
          <a href="#services" className="text-sm text-white/60 hover:text-white transition-colors">
            {t('home_services')}
          </a>
          <a href="#channels" className="text-sm text-white/60 hover:text-white transition-colors">
            {t('home_channels')}
          </a>
          <a href="https://www.findpoint.ca" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">
            {t('home_service_web')}
          </a>
          <Link href={localePath('/pricing')} className="text-sm text-white/60 hover:text-white transition-colors">
            {t('sidebar_pricing')}
          </Link>
          <a href="#contact" className="text-sm text-white/60 hover:text-white transition-colors">
            {t('home_contact')}
          </a>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/5 transition-colors"
            >
              {t('login_submit')}
            </button>
            <Link
              href={localePath('/register')}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 transition-all"
            >
              {t('home_register')}
            </Link>
            <LanguageSwitcher variant="bar" dark className="flex-shrink-0" />
          </div>
        </nav>
        {/* Mobile: Giriş + Kayıt + hamburger */}
        <div className="flex lg:hidden items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="text-xs font-medium px-2.5 py-1.5 min-h-[36px] inline-flex items-center justify-center rounded-md text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15 touch-manipulation"
          >
            {t('login_submit')}
          </button>
          <Link
            href={localePath('/register')}
            className="text-xs font-semibold px-3 py-1.5 min-h-[36px] inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white touch-manipulation"
          >
            {t('home_register')}
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-white/80 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
            <nav className="fixed top-16 left-0 right-0 z-50 lg:hidden py-3 px-3 bg-[#0a0f1a] border-b border-white/10 rounded-b-xl shadow-xl overflow-y-auto max-h-[calc(100dvh-4rem)]">
              <div className="flex flex-col gap-0.5 pb-[env(safe-area-inset-bottom)]">
                <a href="#features" className="px-4 py-3.5 min-h-[48px] flex items-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation" onClick={() => setMobileNavOpen(false)}>{t('home_features')}</a>
                <a href="#services" className="px-4 py-3.5 min-h-[48px] flex items-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation" onClick={() => setMobileNavOpen(false)}>{t('home_services')}</a>
                <a href="#channels" className="px-4 py-3.5 min-h-[48px] flex items-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation" onClick={() => setMobileNavOpen(false)}>{t('home_channels')}</a>
                <a href="https://www.findpoint.ca" target="_blank" rel="noopener noreferrer" className="px-4 py-3.5 min-h-[48px] flex items-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation" onClick={() => setMobileNavOpen(false)}>{t('home_service_web')}</a>
                <Link href={localePath('/pricing')} className="px-4 py-3.5 min-h-[48px] flex items-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation" onClick={() => setMobileNavOpen(false)}>{t('sidebar_pricing')}</Link>
                <a href="#contact" className="px-4 py-3.5 min-h-[48px] flex items-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15 touch-manipulation" onClick={() => setMobileNavOpen(false)}>{t('home_contact')}</a>
                <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between gap-3 px-4 py-3">
                  <LanguageSwitcher variant="bar" dark className="flex-shrink-0" />
                  <button type="button" onClick={() => { setShowLoginModal(true); setMobileNavOpen(false); }} className="text-sm font-medium px-4 py-3 min-h-[44px] rounded-xl bg-white/10 text-white touch-manipulation">
                    {t('login_submit')}
                  </button>
                </div>
              </div>
            </nav>
          </>
        )}
      </header>

      {/* Hero - Sistem tanıtımı */}
      <section className="relative pt-20 sm:pt-28 md:pt-32 pb-12 sm:pb-20 md:pb-24 px-3 sm:px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(6,182,212,0.08),transparent)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3 sm:mb-6 leading-[1.15] px-1">
            {t('home_hero_title')}
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed px-1">
            {t('home_hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link
              href={localePath('/register')}
              className="w-full sm:w-auto text-center font-semibold px-6 py-3.5 min-h-[48px] inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 transition-all touch-manipulation"
            >
              {t('home_get_started')}
            </Link>
            <a
              href="#channels"
              className="w-full sm:w-auto text-center font-medium px-6 py-3.5 min-h-[48px] inline-flex items-center justify-center rounded-xl border border-white/20 text-white/90 hover:bg-white/5 active:bg-white/10 hover:border-white/30 transition-all touch-manipulation"
            >
              {t('home_watch_demos')}
            </a>
          </div>
        </div>
      </section>

      {/* TV Kanalları - Önce gösteriliyor */}
      <section id="channels" className="py-10 sm:py-16 md:py-20 px-3 sm:px-6 md:px-12 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white text-center mb-2 sm:mb-4">
            {t('home_channels_title')}
          </h2>
          <p className="text-white/50 text-center mb-6 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-1">
            {t('home_channels_desc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 place-items-center">
            {channels.map((ch) => (
                <div key={ch.slug} className="flex justify-center w-full max-w-[280px] sm:max-w-sm">
                  <TVFrame
                    previewUrl={getPreviewUrl(ch, localePath)}
                    title={ch.title}
                    onClick={() => setPreviewChannel(ch)}
                    thumbnail={ch.thumbnail}
                  />
                </div>
            ))}
          </div>

          {previewChannel && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              onClick={() => setPreviewChannel(null)}
              role="dialog"
              aria-modal="true"
              aria-label={t('home_preview_modal_close')}
            >
              <div
                className="relative w-full max-w-5xl aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe
                  src={getPreviewUrl(previewChannel, localePath)}
                  title={previewChannel.title}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                />
                <button
                  type="button"
                  onClick={() => setPreviewChannel(null)}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center px-4 py-2 rounded-lg bg-black/70 hover:bg-black/90 active:bg-black text-white text-sm font-medium border border-white/20 touch-manipulation"
                >
                  {t('home_preview_modal_close')} ×
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Özellikler - İhtiyacınız olan her şey */}
      <section id="features" className="py-10 sm:py-16 md:py-20 px-3 sm:px-6 md:px-12 bg-white/[0.02] border-y border-white/5 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white text-center mb-2 sm:mb-4">
            {t('home_features_title')}
          </h2>
          <p className="text-white/50 text-center mb-8 sm:mb-16 max-w-2xl mx-auto text-sm sm:text-base px-1">
            {t('home_features_desc')}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-8 md:gap-8">
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://cdn.kwork.com/files/portfolio/t0_r/11/5ade4944a3774065d0a0c1f9490db11f39f7c4a1-1706550466.webp"
                  alt="Menu Slide"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_feature_screens')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_feature_screens_desc')}</p>
            </div>
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://nento.com/wp-content/uploads/2025/02/freepik__digital-signage-system-for-restaurants__58044.webp"
                  alt="Templates - Dijital Signage Sistemi"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_feature_templates')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_feature_templates_desc')}</p>
            </div>
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"
                  alt="Real-time updates"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_feature_realtime')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_feature_realtime_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hizmetlerimiz - Web, Kamera, TV Kurulum */}
      <section id="services" className="py-10 sm:py-16 md:py-20 px-3 sm:px-6 md:px-12 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white text-center mb-2 sm:mb-4">
            {t('home_services_title')}
          </h2>
          <p className="text-white/50 text-center mb-8 sm:mb-16 max-w-2xl mx-auto text-sm sm:text-base px-1">
            {t('home_services_desc')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
            <a
              href="https://www.findpoint.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="block cursor-pointer group"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 group-hover:border-cyan-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://media.istockphoto.com/id/2212360504/photo/holographic-ui-ux-display-icons-of-ux-ui-designer-creative-planning-data-visualization-web.jpg?s=1024x1024&w=is&k=20&c=skd_SMOtTMujQh9SX6oawwdSDeuPhmkxXmVqxUWLPrA="
                  alt="Web Tasarım - Web sitesi geliştirme"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_service_web')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_service_web_desc')}</p>
            </a>
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-amber-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://www.alkatek.net/myimages/unnamed.jpg"
                  alt="Güvenlik Kamera Sistemleri - CCTV"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_service_cctv')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_service_cctv_desc')}</p>
            </div>
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://www.tvmontaj.com.tr/wp-content/uploads/2025/02/tvmontaj-1-870x563.webp"
                  alt="TV Kurulumları - Dijital tabela"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_service_tv')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_service_tv_desc')}</p>
            </div>
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-violet-500/30 transition-colors bg-white/[0.03]">
                <img
                  src="https://eselbilisim.com/tema/genel/uploads/hizmetler/guvenlik-kamerasi-kurulumu1.png"
                  alt="Kamera Kurulumları - Profesyonel kamera"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2">{t('home_service_camera')}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{t('home_service_camera_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-10 sm:py-16 md:py-20 px-3 sm:px-6 md:px-12 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white text-center mb-2 sm:mb-4">
            {t('home_contact_title')}
          </h2>
          <p className="text-white/50 text-center mb-6 sm:mb-12 text-sm sm:text-base px-1">
            {t('home_contact_desc')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {contactInfo.email && (
              <div className="flex flex-col items-center text-center p-4 min-h-0 min-w-0 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
                <span className="text-xl sm:text-2xl mb-1.5 sm:mb-2 flex-shrink-0">✉</span>
                <h3 className="font-medium text-white text-xs sm:text-sm flex-shrink-0">{t('home_contact_email')}</h3>
                <a href={`mailto:${contactInfo.email}`} className="text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm break-all py-1 touch-manipulation overflow-hidden max-w-full">{contactInfo.email}</a>
              </div>
            )}
            {contactInfo.phone && (
              <div className="flex flex-col items-center text-center p-4 min-h-0 min-w-0 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
                <span className="text-xl sm:text-2xl mb-1.5 sm:mb-2 flex-shrink-0">📞</span>
                <h3 className="font-medium text-white text-xs sm:text-sm flex-shrink-0">{t('home_contact_phone')}</h3>
                <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm py-1 touch-manipulation truncate max-w-full">{contactInfo.phone}</a>
              </div>
            )}
            {contactInfo.address && (
              <div className="col-span-2 sm:col-span-1 max-w-[200px] sm:max-w-none mx-auto sm:mx-0 flex flex-col items-center text-center p-4 min-h-0 min-w-0 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
                <span className="text-xl sm:text-2xl mb-1.5 sm:mb-2 flex-shrink-0">📍</span>
                <h3 className="font-medium text-white text-xs sm:text-sm flex-shrink-0">{t('home_contact_address')}</h3>
                <p className="text-white/70 text-xs sm:text-sm break-words max-w-full">{contactInfo.address}</p>
              </div>
            )}
            {!contactInfo.email && !contactInfo.phone && !contactInfo.address && (
              <p className="col-span-full text-white/40 text-sm text-center py-4">{t('home_contact_empty')}</p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-10 sm:mt-12">
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-sm text-white/50 hover:text-emerald-400 active:text-emerald-300 py-2 px-1 min-h-[44px] flex items-center touch-manipulation"
            >
              {t('footer_terms')}
            </button>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="text-sm text-white/50 hover:text-emerald-400 active:text-emerald-300 py-2 px-1 min-h-[44px] flex items-center touch-manipulation"
            >
              {t('footer_privacy')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-10 px-3 sm:px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-white/5">
        <div className="max-w-6xl mx-auto flex justify-center">
          <p className="text-white/40 text-xs sm:text-sm text-center">
            © {new Date().getFullYear()} MenuSlide All rights reserved.{' '}
            <a href="https://www.findpoint.ca" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
              Findpoint
            </a>
          </p>
        </div>
      </footer>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        localePath={localePath}
      />
      <LegalModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        type="terms"
      />
      <LegalModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        type="privacy"
      />
    </div>
  );
}
