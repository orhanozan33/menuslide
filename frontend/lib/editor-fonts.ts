/** Ortak font ve simge sabitleri — tasarım editörü ve şablon editörü */

export const FONT_GROUPS: { label: string; fonts: string[] }[] = [
  { label: 'Klasik', fonts: ['Arial', 'Arial Black', 'Georgia', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Comic Sans MS', 'Courier New', 'Helvetica', 'system-ui', 'sans-serif', 'serif'] },
  { label: 'Modern', fonts: ['Poppins', 'Montserrat', 'Raleway', 'Open Sans', 'Roboto', 'Lato', 'Oswald', 'Source Sans 3', 'Nunito', 'Work Sans', 'Rubik', 'Inter', 'Urbanist', 'Manrope'] },
  { label: 'El yazısı', fonts: ['Dancing Script', 'Pacifico', 'Great Vibes', 'Caveat', 'Satisfy', 'Kalam', 'Patrick Hand', 'Indie Flower', 'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville'] },
  { label: 'Tebeşir / Marker', fonts: ['Permanent Marker', 'Caveat Brush', 'Caveat', 'Rock Salt', 'Shadows Into Light'] },
  { label: 'Dekoratif', fonts: ['Bebas Neue', 'Anton', 'Lobster', 'Bangers', 'Righteous', 'Black Ops One', 'Orbitron'] },
];

export const FONT_OPTIONS = FONT_GROUPS.flatMap((g) => g.fonts);

export const GOOGLE_FONT_FAMILIES = [
  'Poppins', 'Montserrat', 'Raleway', 'Open+Sans', 'Roboto', 'Lato', 'Oswald', 'Source+Sans+3',
  'Nunito', 'Work+Sans', 'Rubik', 'Inter', 'Urbanist', 'Manrope',
  'Dancing+Script', 'Pacifico', 'Great+Vibes', 'Caveat', 'Satisfy', 'Kalam', 'Patrick+Hand', 'Indie+Flower',
  'Playfair+Display', 'Cormorant+Garamond', 'Libre+Baskerville',
  'Permanent+Marker', 'Caveat+Brush', 'Rock+Salt', 'Shadows+Into+Light',
  'Bebas+Neue', 'Anton', 'Lobster', 'Bangers', 'Righteous', 'Black+Ops+One', 'Orbitron',
];

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
