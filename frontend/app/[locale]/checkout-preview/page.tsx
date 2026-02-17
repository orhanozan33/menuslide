'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Stripe Checkout sol panel önizlemesi.
 * Checkout'ta görünen bizim tasarladığımız kısmı (başlık, açıklama, görsel) burada gösteriyoruz.
 */
export default function CheckoutPreviewPage() {
  const { localePath } = useTranslation();
  const screensLabel = 3;
  const planName = `Subscription (${screensLabel} screens)`;

  return (
    <div className="min-h-screen bg-[#06090f] text-white font-sans">
      <div className="max-w-2xl mx-auto p-6 sm:p-10">
        <Link href={localePath('/pricing')} className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8">
          ← Back to pricing
        </Link>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-6">Checkout left panel preview</p>

        <div className="rounded-xl overflow-hidden border border-white/10 mb-8">
          <Image
            src="/checkout-package-preview.png"
            alt="MenuSlide package preview"
            width={800}
            height={450}
            className="w-full h-auto object-cover"
          />
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">{planName}</h1>

        <div className="space-y-4 text-white/90 text-[15px] leading-relaxed">
          <p className="font-semibold text-white">MenuSlide by Findpoint</p>
          <p>Digital menu and signage platform trusted by businesses across Canada.</p>
          <p className="font-medium text-white/95">What you get:</p>
          <ul className="list-disc list-inside space-y-1 text-white/85">
            <li>{screensLabel} screen(s) for your TV displays</li>
            <li>Unlimited digital menus — create and manage as many as you need</li>
            <li>Instant updates — change your menu in seconds, it reflects immediately</li>
            <li>Templates and content library — ready-to-use designs</li>
            <li>Priority support — we help you get set up and keep running</li>
          </ul>
          <p className="font-medium text-white/95">Why MenuSlide?</p>
          <ul className="list-disc list-inside space-y-1 text-white/85">
            <li>No long-term contracts — cancel anytime</li>
            <li>Secure payments via Stripe</li>
            <li>Works on any TV or display with a browser</li>
            <li>Used by restaurants, cafés, and businesses across Canada</li>
          </ul>
          <p className="text-white/70 text-sm pt-4">
            Need help? Visit www.menuslide.com or contact us at www.findpoint.ca
          </p>
        </div>

        <div className="mt-12 p-6 rounded-xl border border-dashed border-white/20 bg-white/5">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Stripe area on the right</p>
          <p className="text-white/60 text-sm">
            This page only shows the left panel. In the real Checkout, the right side contains Stripe&apos;s card form, address field, and payment button. To see the full experience,{' '}
            <Link href={localePath('/pricing')} className="text-emerald-400 hover:underline">select a plan from the pricing page</Link> and click Subscribe.
          </p>
        </div>
      </div>
    </div>
  );
}
