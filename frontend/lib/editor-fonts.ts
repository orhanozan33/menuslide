/** Ortak font ve simge sabitleri — tasarım editörü ve şablon editörü */

export const FONT_GROUPS: { label: string; fonts: string[] }[] = [
  { label: 'Klasik', fonts: ['Arial', 'Arial Black', 'Georgia', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Comic Sans MS', 'Courier New', 'Helvetica', 'system-ui', 'sans-serif', 'serif'] },
  { label: 'Modern', fonts: ['Poppins', 'Montserrat', 'Raleway', 'Open Sans', 'Roboto', 'Lato', 'Oswald', 'Source Sans 3', 'Nunito', 'Work Sans', 'Rubik', 'Inter', 'Urbanist', 'Manrope', 'Quicksand', 'Josefin Sans', 'Exo 2', 'Yanone Kaffeesatz', 'Archivo Black', 'Teko', 'Outfit', 'Plus Jakarta Sans'] },
  { label: 'El yazısı', fonts: ['Dancing Script', 'Pacifico', 'Great Vibes', 'Caveat', 'Satisfy', 'Kalam', 'Patrick Hand', 'Indie Flower', 'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Allura', 'Mr Dafoe', 'Cookie', 'Courgette', 'Parisienne', 'Alex Brush', 'Marck Script', 'Bad Script', 'Kristi', 'Homemade Apple', 'Covered By Your Grace', 'Gloria Hallelujah', 'Yellowtail', 'Damion', 'Lobster Two', 'Rouge Script', 'Tangerine', 'Italianno', 'Qwigley', 'Berkshire Swash', 'Niconne', 'Condiment'] },
  { label: 'Tebeşir / Tahta / Marker', fonts: ['Permanent Marker', 'Caveat Brush', 'Caveat', 'Rock Salt', 'Shadows Into Light', 'Schoolbell', 'Walter Turncoat', 'Coming Soon', 'Nothing You Could Do', 'Architects Daughter', 'Fredericka the Great', 'Sacramento', 'Reenie Beanie'] },
  { label: 'Sprey / Graffiti', fonts: ['Bungee', 'Bungee Shade', 'Monoton', 'Audiowide', 'Russo One', 'Staatliches', 'Creepster', 'Smokum', 'Freckle Face'] },
  { label: 'Başlık / Dekoratif', fonts: ['Bebas Neue', 'Anton', 'Lobster', 'Bangers', 'Righteous', 'Black Ops One', 'Orbitron', 'Sigmar One', 'Press Start 2P', 'Special Elite', 'Abril Fatface', 'Alfa Slab One', 'Passion One', 'Patua One', 'Stardos Stencil', 'Keania One', 'Ultra', 'Luckiest Guy', 'Titan One', 'Oregano'] },
];

export const FONT_OPTIONS = FONT_GROUPS.flatMap((g) => g.fonts);

/** Google Fonts API için aile adları (boşluk = +). URL uzunluk sınırı için parçalara bölünür. */
const GOOGLE_FONT_FAMILIES_FLAT = [
  'Poppins', 'Montserrat', 'Raleway', 'Open+Sans', 'Roboto', 'Lato', 'Oswald', 'Source+Sans+3',
  'Nunito', 'Work+Sans', 'Rubik', 'Inter', 'Urbanist', 'Manrope',
  'Quicksand', 'Josefin+Sans', 'Exo+2', 'Yanone+Kaffeesatz', 'Archivo+Black', 'Teko', 'Outfit', 'Plus+Jakarta+Sans',
  'Dancing+Script', 'Pacifico', 'Great+Vibes', 'Caveat', 'Satisfy', 'Kalam', 'Patrick+Hand', 'Indie+Flower',
  'Playfair+Display', 'Cormorant+Garamond', 'Libre+Baskerville',
  'Allura', 'Mr+Dafoe', 'Cookie', 'Courgette', 'Parisienne', 'Alex+Brush', 'Marck+Script', 'Bad+Script', 'Kristi', 'Homemade+Apple', 'Covered+By+Your+Grace', 'Gloria+Hallelujah', 'Yellowtail', 'Damion', 'Lobster+Two', 'Rouge+Script', 'Tangerine', 'Italianno', 'Qwigley', 'Berkshire+Swash', 'Niconne', 'Condiment',
  'Permanent+Marker', 'Caveat+Brush', 'Rock+Salt', 'Shadows+Into+Light',
  'Schoolbell', 'Walter+Turncoat', 'Coming+Soon', 'Nothing+You+Could+Do', 'Architects+Daughter', 'Fredericka+the+Great', 'Sacramento', 'Reenie+Beanie',
  'Bungee', 'Bungee+Shade', 'Monoton', 'Audiowide', 'Russo+One', 'Staatliches', 'Creepster', 'Smokum', 'Freckle+Face',
  'Bebas+Neue', 'Anton', 'Lobster', 'Bangers', 'Righteous', 'Black+Ops+One', 'Orbitron',
  'Sigmar+One', 'Press+Start+2P', 'Special+Elite', 'Abril+Fatface', 'Alfa+Slab+One', 'Passion+One', 'Patua+One',
  'Stardos+Stencil', 'Keania+One', 'Ultra', 'Luckiest+Guy', 'Titan+One', 'Oregano',
];

/** Eski API uyumluluğu: tek liste (parçalı yükleme için GOOGLE_FONT_CHUNKS kullanın) */
export const GOOGLE_FONT_FAMILIES = GOOGLE_FONT_FAMILIES_FLAT;

/** Sadece Google Fonts API'de olan aile adları (display: "Dancing Script"). Sistem/generic fontlar (Times New Roman, sans-serif, Impact) burada yok. */
const GOOGLE_FONT_DISPLAY_NAMES = new Set(
  GOOGLE_FONT_FAMILIES_FLAT.map((f) => f.replace(/\+/g, ' '))
);

const CHUNK_SIZE = 6;

/** Parçalara bölünmüş font listesi – her parça ayrı <link> ile yüklenir (URL uzunluk sınırı) */
export const GOOGLE_FONT_CHUNKS: string[][] = [];
for (let i = 0; i < GOOGLE_FONT_FAMILIES_FLAT.length; i += CHUNK_SIZE) {
  GOOGLE_FONT_CHUNKS.push(GOOGLE_FONT_FAMILIES_FLAT.slice(i, i + CHUNK_SIZE));
}

/** Tek bir Google Fonts CSS2 URL'i oluşturur (en fazla CHUNK_SIZE aile) */
export function getGoogleFontsUrl(families: string[]): string {
  if (families.length === 0) return '';
  const query = families.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

/** Şablonda kullanılan font aileleri (display adı, örn. "Dancing Script") → TV/display sayfasında yüklenecek Google Fonts URL’i. Sadece Google'da olan fontlar istenir; Times New Roman, sans-serif, Impact vb. sistem/generic fontlar atlanır (403/400 hataları önlenir). */
export function getGoogleFontsUrlForDisplayFamilies(displayFamilies: string[]): string {
  const unique = [...new Set(
    displayFamilies.filter(
      (f) => f && typeof f === 'string' && GOOGLE_FONT_DISPLAY_NAMES.has(f.trim())
    )
  )];
  if (unique.length === 0) return '';
  const forUrl = unique.slice(0, 20).map((f) => f.trim().replace(/\s+/g, '+'));
  return getGoogleFontsUrl(forUrl);
}

export const TEXT_ICON_OPTIONS = [
  '🔥', '⭐', '💰', '🏷️', '✨', '🎉', '❤️', '✓', '🎯', '💯',
  '🍕', '☕', '🍔', '🍟', '🌮', '🍝', '🥗', '🍰', '🧁', '🍩', '🥐',
  '🍷', '🍺', '🥤', '🍽️', '🍴', '🥂', '🍸', '🧋', '🍵', '🍖', '🍗',
  '📢', '📍', '⏰', '🆕', '💵', '🏆', '🎁', '',
];

/** Şablon editörü için optgroup formatında font listesi */
export const FONT_FAMILIES_FOR_SELECT = FONT_GROUPS.flatMap((g) =>
  g.fonts.map((f) => ({
    value: f.includes(' ') ? `"${f}"` : f,
    label: f,
    group: g.label,
  }))
);
