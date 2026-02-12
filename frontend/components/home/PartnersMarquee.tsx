'use client';

import type { PartnerItem } from '@/app/api/home-partners/route';

function ItemBlock({ item }: { item: PartnerItem }) {
  const isLogo = item.kind === 'logo';
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center px-2 py-1.5 ${isLogo ? 'min-w-[140px] md:min-w-[160px]' : 'min-w-[80px] md:min-w-[100px]'}`}
    >
      {isLogo ? (
        <img
          src={item.value}
          alt=""
          className="max-h-14 md:max-h-20 w-auto max-w-full object-contain object-center opacity-80 hover:opacity-100 transition-opacity"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
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
      {/* Kayan marquee: iki kopya, az boşluk, 6+ partner aynı anda daha fazla görünsün */}
      <div className="overflow-hidden max-w-4xl mx-auto px-4 md:px-6">
        <div
          className={`flex items-stretch py-2 ${direction === 'left' ? 'partners-marquee-left' : 'partners-marquee-right'}`}
          style={{ width: 'calc(200% + 6rem)' }}
        >
          <div className="flex gap-4 md:gap-5 items-center flex-shrink-0 min-w-0 overflow-hidden justify-start pl-2 pr-2 md:pl-3 md:pr-3" style={{ width: 'calc(50% - 3rem)', boxSizing: 'border-box' }}>
            {items.map((item, i) => (
              <ItemBlock key={`a-${i}-${item.value}`} item={item} />
            ))}
          </div>
          <div className="flex-shrink-0 w-[6rem]" aria-hidden />
          <div className="flex gap-4 md:gap-5 items-center flex-shrink-0 min-w-0 overflow-hidden justify-start pl-2 pr-2 md:pl-3 md:pr-3" style={{ width: 'calc(50% - 3rem)', boxSizing: 'border-box' }}>
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
    <div className="w-full max-w-4xl mx-auto space-y-6 mt-6 sm:mt-8">
      {business_partners.length > 0 && (
        <PartnersRow title={titleBusinessPartners} items={business_partners} direction="left" />
      )}
      {partners.length > 0 && (
        <PartnersRow title={titlePartners} items={partners} direction="right" />
      )}
    </div>
  );
}
