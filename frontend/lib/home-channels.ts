/**
 * Ana sayfada gösterilecek TV kanalları / yayın alanları.
 * Her kanal, display sayfasına link verir (public_slug veya public_token).
 *
 * Yeni ekran eklemek için: Admin panelinden ekran oluşturup public_slug değerini buraya ekleyin.
 */
export interface HomeChannel {
  /** Display URL'de kullanılacak slug veya token (örn: "ana-salon" veya UUID) */
  slug: string;
  /** Kanalla gösterilecek başlık */
  title: string;
  /** Kısa açıklama (isteğe bağlı) */
  description?: string;
  /** Yayın linki - display sayfası veya harici URL */
  link?: string;
  /** Küçük resim URL (isteğe bağlı - önizleme için) */
  thumbnail?: string;
}

export const HOME_CHANNELS: HomeChannel[] = [
  { slug: 'ana-salon', title: 'Ana Salon', description: 'Ana salon ekranı', link: '/display/ana-salon' },
  { slug: 'bar', title: 'Bar', description: 'Bar ekranı', link: '/display/bar' },
  { slug: 'teras', title: 'Teras', description: 'Teras ekranı', link: '/display/teras' },
];
