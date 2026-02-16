'use client';

import { useState } from 'react';
import type { PartnerItem } from '@/app/api/home-partners/route';

function ItemBlock({ item }: { item: PartnerItem }) {
  const isLogo = item.kind === 'logo';
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center px-1 sm:px-2 py-1.5 ${isLogo ? 'min-w-[64px] xs:min-w-[72px] sm:min-w-[120px] md:min-w-[140px]' : 'min-w-[56px] xs:min-w-[64px] md:min-w-[100px]'}`}
    >
      {isLogo ? (
        imgError ? (
          <span className="text-white/70 text-sm font-medium truncate max-w-full">
            {/supabase/i.test(item.value) ? 'Supabase' : /roku/i.test(item.value) ? 'Roku' : 'Partner'}
          </span>
        ) : (
          <div className="flex items-center justify-center w-full min-h-[2.5rem] max-h-14 md:max-h-20 min-w-0">
            <img
              src={item.value}
              alt=""
              className="max-h-14 md:max-h-20 w-auto max-w-full min-w-0 object-contain object-center opacity-80 hover:opacity-100 transition-opacity"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        )
      ) : (
        <span className="text-white/70 text-sm md:text-base font-medium whitespace-nowrap">
          {item.value}
        </span>
      )}
    </div>
  );
}

function PartnersRow({
  title,
  items,
  direction = 'left',
}: {
  title: string;
  items: PartnerItem[];
  direction?: 'left' | 'right';
}) {
  if (items.length === 0) return null;
  return (
    <div className="w-full">
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 text-center">
        {title}
      </div>
      {/* Kayan marquee: iki kopya; mobilde daha az gap ile kırpılma azaltıldı */}
      <div className="overflow-hidden max-w-4xl mx-auto px-4 md:px-6">
        <div
          className={`flex items-stretch py-2 ${direction === 'left' ? 'partners-marquee-left' : 'partners-marquee-right'}`}
          style={{ width: 'calc(200% + 6rem)' }}
        >
          <div className="flex gap-2 sm:gap-4 md:gap-5 items-center flex-shrink-0 min-w-0 overflow-hidden justify-start pl-1 pr-1 sm:pl-2 sm:pr-2 md:pl-3 md:pr-3" style={{ width: 'calc(50% - 3rem)', boxSizing: 'border-box' }}>
            {items.map((item, i) => (
              <ItemBlock key={`a-${i}-${item.value}`} item={item} />
            ))}
          </div>
          <div className="flex-shrink-0 w-[6rem]" aria-hidden />
          <div className="flex gap-2 sm:gap-4 md:gap-5 items-center flex-shrink-0 min-w-0 overflow-hidden justify-start pl-1 pr-1 sm:pl-2 sm:pr-2 md:pl-3 md:pr-3" style={{ width: 'calc(50% - 3rem)', boxSizing: 'border-box' }}>
            {items.map((item, i) => (
              <ItemBlock key={`b-${i}-${item.value}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PartnersMarquee({
  titleBusinessPartners,
  titlePartners,
  business_partners,
  partners,
}: {
  titleBusinessPartners: string;
  titlePartners: string;
  business_partners: PartnerItem[];
  partners: PartnerItem[];
}) {
  const hasAny = business_partners.length > 0 || partners.length > 0;
  if (!hasAny) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 mt-6 sm:mt-8 overflow-hidden min-w-0">
      {business_partners.length > 0 && (
        <PartnersRow title={titleBusinessPartners} items={business_partners} direction="left" />
      )}
      {partners.length > 0 && (
        <PartnersRow title={titlePartners} items={partners} direction="right" />
      )}
    </div>
  );
}
