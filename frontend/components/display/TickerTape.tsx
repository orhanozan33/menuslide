'use client';

export const TICKER_STYLES: Array<{ value: string; labelKey: string; font: string; weight: string; italic: boolean; letterSpacing?: string }> = [
  { value: 'default', labelKey: 'ticker_style_default', font: 'system-ui', weight: '500', italic: false },
  { value: 'bold', labelKey: 'ticker_style_bold', font: 'system-ui', weight: '700', italic: false },
  { value: 'elegant', labelKey: 'ticker_style_elegant', font: 'Georgia, serif', weight: '500', italic: true },
  { value: 'modern', labelKey: 'ticker_style_modern', font: 'system-ui', weight: '600', italic: false },
  { value: 'script', labelKey: 'ticker_style_script', font: 'cursive', weight: '500', italic: true },
  { value: 'condensed', labelKey: 'ticker_style_condensed', font: 'system-ui', weight: '600', italic: false, letterSpacing: '-0.03em' },
];

export const TICKER_SYMBOLS = [
  { key: 'coffee', symbol: '☕', label: 'Kahve' },
  { key: 'chef', symbol: '👨‍🍳', label: 'Şef' },
  { key: 'plate', symbol: '🍽️', label: 'Tabak' },
  { key: 'pizza', symbol: '🍕', label: 'Pizza' },
  { key: 'burger', symbol: '🍔', label: 'Burger' },
  { key: 'cake', symbol: '🍰', label: 'Pasta' },
  { key: 'salad', symbol: '🥗', label: 'Salata' },
  { key: 'icecream', symbol: '🍦', label: 'Dondurma' },
  { key: 'wine', symbol: '🍷', label: 'Şarap' },
  { key: 'beer', symbol: '🍺', label: 'Bira' },
  { key: 'fork', symbol: '🍴', label: 'Çatal' },
  { key: 'fire', symbol: '🔥', label: 'Sıcak' },
  { key: 'star', symbol: '⭐', label: 'Yıldız' },
  { key: 'heart', symbol: '❤️', label: 'Kalp' },
  { key: 'phone', symbol: '📞', label: 'Telefon' },
  { key: 'location', symbol: '📍', label: 'Konum' },
  { key: 'clock', symbol: '🕐', label: 'Saat' },
  { key: 'gift', symbol: '🎁', label: 'Hediye' },
];

interface TickerTapeProps {
  text: string;
  style?: string;
  className?: string;
}

export function TickerTape({ text, style = 'default', className = '' }: TickerTapeProps) {
  if (!text || text.trim() === '') return null;

  const styleConfig = TICKER_STYLES.find((s) => s.value === style) || TICKER_STYLES[0];

  return (
    <>
      <style>{`
        @keyframes ticker-tape-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
      <div
        className={`overflow-hidden bg-slate-800/90 border-t border-amber-500/30 py-2 ${className}`}
        style={{ minHeight: 40 }}
      >
        <div
          className="whitespace-nowrap flex shrink-0"
          style={{
            width: 'max-content',
            animation: 'ticker-tape-scroll 60s linear infinite',
            willChange: 'transform',
            fontFamily: styleConfig.font,
            fontWeight: styleConfig.weight,
            fontStyle: styleConfig.italic ? 'italic' : 'normal',
            fontSize: '1rem',
            color: '#fff',
            letterSpacing: styleConfig.letterSpacing || 'normal',
          }}
        >
          <span className="inline-block pr-24 shrink-0">{text}</span>
          <span className="inline-block pr-24 shrink-0" aria-hidden>{text}</span>
          <span className="inline-block pr-24 shrink-0" aria-hidden>{text}</span>
        </div>
      </div>
    </>
  );
}
