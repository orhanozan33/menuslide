'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { logAdminActivity } from '@/lib/admin-activity';

interface ContentLibraryProps {
  onSelectContent: (content: any) => void;
  /** Açılışta seçili kategori (örn. 'video', 'all' - tüm kategoriler) */
  initialCategory?: string;
  /** Modal içinde kompakt görünüm: küçük resimler, daha fazla kolon */
  compact?: boolean;
  /** Resim sırası modalı: 4 sütun, 5 sıra görünür, biraz daha büyük kareler */
  imageModalLayout?: boolean;
  /** "Tümü" sekmesini göster — tüm kategorilerdeki resim, video vb. bir arada */
  showAllTab?: boolean;
  /** Değiştiğinde admin ile senkronize yeniden yükle (örn. panel açıldığında) */
  refreshTrigger?: number;
}

// Admin kütüphanesi ile aynı fallback kategoriler (API boş dönerse) - labelKey ile çeviri
const DEFAULT_CATEGORIES_FALLBACK = [
  { slug: 'food', labelKey: 'editor_category_food', icon: '🍕', display_order: 0 },
  { slug: 'pasta', labelKey: 'editor_category_pasta', icon: '🍝', display_order: 1 },
  { slug: 'drinks', labelKey: 'editor_category_drinks', icon: '🍹', display_order: 2 },
  { slug: 'icons', labelKey: 'editor_category_icons', icon: '🎨', display_order: 3 },
  { slug: 'badges', labelKey: 'editor_category_badges', icon: '🏷️', display_order: 4 },
  { slug: 'backgrounds', labelKey: 'editor_category_backgrounds', icon: '🖼️', display_order: 5 },
  { slug: 'text', labelKey: 'editor_category_text_templates', icon: '📝', display_order: 6 },
  { slug: 'video', labelKey: 'editor_category_video', icon: '🎬', display_order: 7 },
];

// Hazır içerik kategorileri (fallback - artık API kullanılıyor)
const contentCategories = {
  food: {
    name: 'Yiyecekler',
    icon: '🍕',
    items: [
      // Pizza
      { id: 'pizza-1', name: 'Pizza Margherita', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', type: 'image' },
      { id: 'pizza-2', name: 'Pepperoni Pizza', url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', type: 'image' },
      { id: 'pizza-3', name: 'Veggie Pizza', url: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', type: 'image' },
      { id: 'pizza-4', name: 'Four Cheese', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', type: 'image' },
      { id: 'pizza-5', name: 'Hawaiian Pizza', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', type: 'image' },
      // Burger
      { id: 'burger-1', name: 'Classic Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', type: 'image' },
      { id: 'burger-2', name: 'Cheese Burger', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', type: 'image' },
      { id: 'burger-3', name: 'Double Burger', url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', type: 'image' },
      { id: 'burger-4', name: 'Bacon Burger', url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80', type: 'image' },
      { id: 'burger-5', name: 'Veggie Burger', url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800&q=80', type: 'image' },
      // Pasta
      { id: 'pasta-1', name: 'Spaghetti', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'pasta-2', name: 'Penne Arrabiata', url: 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', type: 'image' },
      { id: 'pasta-3', name: 'Fettuccine Alfredo', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', type: 'image' },
      { id: 'pasta-4', name: 'Carbonara', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', type: 'image' },
      // Sandviç & Wrap
      { id: 'sandwich-1', name: 'Club Sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', type: 'image' },
      { id: 'sandwich-2', name: 'Chicken Wrap', url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', type: 'image' },
      // Chicken
      { id: 'chicken-1', name: 'Fried Chicken', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', type: 'image' },
      { id: 'chicken-2', name: 'Chicken Wings', url: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', type: 'image' },
      // Salata
      { id: 'salad-1', name: 'Caesar Salad', url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', type: 'image' },
      { id: 'salad-2', name: 'Greek Salad', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', type: 'image' },
      { id: 'salad-3', name: 'Cobb Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'salad-4', name: 'Caprese Salad', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', type: 'image' },
      { id: 'salad-5', name: 'Waldorf Salad', url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80', type: 'image' },
      { id: 'salad-6', name: 'Quinoa Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'salad-7', name: 'Mediterranean Salad', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', type: 'image' },
      { id: 'salad-8', name: 'Asian Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      // Makarnalar (Genişletilmiş)
      { id: 'pasta-5', name: 'Lasagna', url: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80', type: 'image' },
      { id: 'pasta-6', name: 'Ravioli', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'pasta-7', name: 'Gnocchi', url: 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', type: 'image' },
      { id: 'pasta-8', name: 'Linguine', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', type: 'image' },
      { id: 'pasta-9', name: 'Rigatoni', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', type: 'image' },
      { id: 'pasta-10', name: 'Fusilli', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'pasta-11', name: 'Macaroni', url: 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', type: 'image' },
      { id: 'pasta-12', name: 'Tagliatelle', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', type: 'image' },
      // Combo menus
      { id: 'combo-1', name: 'Pizza + Cola', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', type: 'image' },
      { id: 'combo-2', name: 'Kebab + Cola', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', type: 'image' },
      { id: 'combo-3', name: 'Kebab + Ayran', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', type: 'image' },
      { id: 'combo-4', name: 'Hamburger + Fries + Cola', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', type: 'image' },
      { id: 'combo-5', name: 'Burger Meal', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', type: 'image' },
      { id: 'combo-6', name: 'Pizza Meal', url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', type: 'image' },
      { id: 'combo-7', name: 'Doner + Ayran', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', type: 'image' },
      { id: 'combo-8', name: 'Lahmacun + Ayran', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', type: 'image' },
      { id: 'combo-9', name: 'Chicken + Cola', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', type: 'image' },
      { id: 'combo-10', name: 'Chicken + Fries + Cola', url: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', type: 'image' },
      { id: 'combo-11', name: 'Iskender + Ayran', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', type: 'image' },
      { id: 'combo-12', name: 'Adana Kebab + Ayran', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80', type: 'image' },
      { id: 'combo-13', name: 'Pide + Ayran', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', type: 'image' },
      { id: 'combo-14', name: 'Pasta + Cola', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'combo-15', name: 'Sandwich + Cola', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', type: 'image' },
      { id: 'combo-16', name: 'Wrap + Cola', url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', type: 'image' },
      { id: 'combo-17', name: 'Chicken Wings + Cola', url: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=800&q=80', type: 'image' },
      { id: 'combo-18', name: 'Fish & Chips + Kola', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', type: 'image' },
      { id: 'combo-19', name: 'Taco + Kola', url: 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=80', type: 'image' },
      { id: 'combo-20', name: 'Sushi + Cola', url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80', type: 'image' },
      // Çorbalar
      { id: 'soup-1', name: 'Mercimek Çorbası', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', type: 'image' },
      { id: 'soup-2', name: 'Ezogelin Çorba', url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=90', type: 'image' },
      { id: 'soup-3', name: 'Tarhana Çorbası', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', type: 'image' },
      { id: 'soup-4', name: 'Yayla Çorbası', url: 'https://images.unsplash.com/photo-1603105037880-880cd4edf0d0?w=800&q=90', type: 'image' },
      { id: 'soup-5', name: 'Tavuk Suyu Çorba', url: 'https://images.unsplash.com/photo-1603105037880-880cd4edf0d0?w=800&q=90', type: 'image' },
      { id: 'soup-6', name: 'Domates Çorbası', url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=90', type: 'image' },
      { id: 'soup-7', name: 'Balık Çorbası', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=90', type: 'image' },
      // Balıklar
      { id: 'fish-1', name: 'Izgara Somon', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', type: 'image' },
      { id: 'fish-2', name: 'Levrek', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', type: 'image' },
      { id: 'fish-3', name: 'Çupra', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', type: 'image' },
      { id: 'fish-4', name: 'Karides', url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=90', type: 'image' },
      { id: 'fish-5', name: 'Kalamar', url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=90', type: 'image' },
      { id: 'fish-6', name: 'Fish & Chips', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=90', type: 'image' },
      { id: 'fish-7', name: 'Somon Fileto', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=90', type: 'image' },
      // Dönerler / Kebap / Pide
      { id: 'doner-1', name: 'Döner', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=90', type: 'image' },
      { id: 'doner-2', name: 'İskender', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', type: 'image' },
      { id: 'doner-3', name: 'Adana Kebap', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=90', type: 'image' },
      { id: 'doner-4', name: 'Urfa Kebap', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', type: 'image' },
      { id: 'doner-5', name: 'Lahmacun', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=90', type: 'image' },
      { id: 'doner-6', name: 'Pide', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=90', type: 'image' },
      { id: 'doner-7', name: 'Dürüm', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=90', type: 'image' },
      { id: 'doner-8', name: 'Tavuk Döner', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', type: 'image' },
      { id: 'doner-9', name: 'Köfte', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=90', type: 'image' },
      { id: 'doner-10', name: 'Beyti', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', type: 'image' },
      // Kahvaltı
      { id: 'breakfast-1', name: 'Menemen', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=90', type: 'image' },
      { id: 'breakfast-2', name: 'Sucuklu Yumurta', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', type: 'image' },
      { id: 'breakfast-3', name: 'Serpme Kahvaltı', url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', type: 'image' },
      { id: 'breakfast-4', name: 'Omlet', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', type: 'image' },
      { id: 'breakfast-5', name: 'Eggs Benedict', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', type: 'image' },
      { id: 'breakfast-6', name: 'Avocado Toast', url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', type: 'image' },
      { id: 'breakfast-7', name: 'Pankek', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=90', type: 'image' },
      { id: 'breakfast-8', name: 'Waffle', url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=90', type: 'image' },
      { id: 'breakfast-9', name: 'Simit', url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=90', type: 'image' },
      { id: 'breakfast-10', name: 'Börek', url: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=90', type: 'image' },
      { id: 'breakfast-11', name: 'Gözleme', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=90', type: 'image' },
      { id: 'breakfast-12', name: 'Poğaça', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=90', type: 'image' },
      // Diğer yemekler
      { id: 'misc-1', name: 'Kuru Fasulye', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=90', type: 'image' },
      { id: 'misc-2', name: 'Pilav', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=90', type: 'image' },
      { id: 'misc-3', name: 'Izgara Köfte', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=90', type: 'image' },
      { id: 'misc-4', name: 'Tavuk Şiş', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=90', type: 'image' },
      { id: 'misc-5', name: 'Kuzu Tandır', url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=90', type: 'image' },
      { id: 'misc-6', name: 'Biftek', url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=90', type: 'image' },
      { id: 'misc-7', name: 'Falafel', url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=90', type: 'image' },
      { id: 'misc-8', name: 'Ramen', url: 'https://images.unsplash.com/photo-1569718212165-3a2858982b79?w=800&q=90', type: 'image' },
      { id: 'misc-9', name: 'Taco', url: 'https://images.unsplash.com/photo-1565299585323-38174c3d3b0c?w=800&q=90', type: 'image' },
      { id: 'misc-10', name: 'Sushi', url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=90', type: 'image' },
    ]
  },
  pasta: {
    name: 'Makarnalar',
    icon: '🍝',
    items: [
      { id: 'pasta-cat-1', name: 'Spaghetti Carbonara', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-2', name: 'Penne Arrabbiata', url: 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-3', name: 'Fettuccine Alfredo', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-4', name: 'Lasagna', url: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-5', name: 'Ravioli', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-6', name: 'Gnocchi', url: 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-7', name: 'Linguine', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-8', name: 'Rigatoni', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-9', name: 'Fusilli', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-10', name: 'Macaroni & Cheese', url: 'https://images.unsplash.com/photo-1611599537845-67e5c2d3c0c0?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-11', name: 'Tagliatelle', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80', type: 'image' },
      { id: 'pasta-cat-12', name: 'Pappardelle', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', type: 'image' },
    ]
  },
  salads: {
    name: 'Salatalar',
    icon: '🥗',
    items: [
      { id: 'salad-cat-1', name: 'Caesar Salad', url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', type: 'image' },
      { id: 'salad-cat-2', name: 'Greek Salad', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', type: 'image' },
      { id: 'salad-cat-3', name: 'Cobb Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'salad-cat-4', name: 'Caprese Salad', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', type: 'image' },
      { id: 'salad-cat-5', name: 'Waldorf Salad', url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80', type: 'image' },
      { id: 'salad-cat-6', name: 'Quinoa Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'salad-cat-7', name: 'Mediterranean Salad', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', type: 'image' },
      { id: 'salad-cat-8', name: 'Asian Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'salad-cat-9', name: 'Kale Salad', url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', type: 'image' },
      { id: 'salad-cat-10', name: 'Spinach Salad', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', type: 'image' },
      { id: 'salad-cat-11', name: 'Arugula Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'salad-cat-12', name: 'Coleslaw', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80', type: 'image' },
    ]
  },
  canadian: {
    name: 'Canadian Cuisine',
    icon: '🍁',
    items: [
      { id: 'canadian-1', name: 'Poutine', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=85', type: 'image' },
      { id: 'canadian-2', name: 'Maple Glazed Salmon', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=85', type: 'image' },
      { id: 'canadian-3', name: 'Butter Tarts', url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=85', type: 'image' },
      { id: 'canadian-4', name: 'Tourtière', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', type: 'image' },
      { id: 'canadian-5', name: 'Nanaimo Bars', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=85', type: 'image' },
      { id: 'canadian-6', name: 'Beaver Tails', url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=85', type: 'image' },
      { id: 'canadian-7', name: 'Montreal Smoked Meat', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=85', type: 'image' },
      { id: 'canadian-8', name: 'Bannock', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=85', type: 'image' },
      { id: 'canadian-9', name: 'Pea Soup', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=85', type: 'image' },
      { id: 'canadian-10', name: 'Canadian Bacon', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=85', type: 'image' },
    ]
  },
  european: {
    name: 'Avrupa Mutfağı',
    icon: '🇪🇺',
    items: [
      { id: 'european-1', name: 'Coq au Vin', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', type: 'image' },
      { id: 'european-2', name: 'Bouillabaisse', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', type: 'image' },
      { id: 'european-3', name: 'Ratatouille', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', type: 'image' },
      { id: 'european-4', name: 'Paella', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', type: 'image' },
      { id: 'european-5', name: 'Schnitzel', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', type: 'image' },
      { id: 'european-6', name: 'Goulash', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', type: 'image' },
      { id: 'european-7', name: 'Risotto', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', type: 'image' },
      { id: 'european-8', name: 'Osso Buco', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', type: 'image' },
      { id: 'european-9', name: 'Fish & Chips', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80', type: 'image' },
      { id: 'european-10', name: 'Shepherd\'s Pie', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=800&q=80', type: 'image' },
      { id: 'european-11', name: 'Moussaka', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', type: 'image' },
      { id: 'european-12', name: 'Wiener Schnitzel', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', type: 'image' },
    ]
  },
  drinks: {
    name: 'Drinks',
    icon: '🥤',
    items: [
      // Cold drinks
      { id: 'drink-1', name: 'Cola', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=85', type: 'image' },
      { id: 'drink-2', name: 'Lemonade', url: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=800&q=85', type: 'image' },
      { id: 'drink-3', name: 'Orange Juice', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=85', type: 'image' },
      { id: 'drink-4', name: 'Smoothie', url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=85', type: 'image' },
      { id: 'drink-5', name: 'Milkshake', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=85', type: 'image' },
      { id: 'drink-6', name: 'Iced Tea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=85', type: 'image' },
      { id: 'drink-7', name: 'Iced Coffee', url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', type: 'image' },
      { id: 'drink-8', name: 'Sparkling Water', url: 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=800&q=85', type: 'image' },
      // Alcoholic – bardakta
      { id: 'drink-9', name: 'Beer', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=85', type: 'image' },
      { id: 'drink-10', name: 'Wine', url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=85', type: 'image' },
      { id: 'drink-11', name: 'Whisky', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=90', type: 'image' },
      { id: 'drink-12', name: 'Vodka', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=90', type: 'image' },
      { id: 'drink-13', name: 'Tequila', url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=90', type: 'image' },
      { id: 'drink-14', name: 'Rum', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', type: 'image' },
      { id: 'drink-15', name: 'Gin', url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', type: 'image' },
      { id: 'drink-16', name: 'Martini', url: 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', type: 'image' },
      { id: 'drink-17', name: 'Margarita', url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=90', type: 'image' },
      { id: 'drink-18', name: 'Mojito', url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', type: 'image' },
      { id: 'drink-19', name: 'Cocktail', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', type: 'image' },
      { id: 'drink-20', name: 'Old Fashioned', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=90', type: 'image' },
      { id: 'drink-21', name: 'Negroni', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', type: 'image' },
      { id: 'drink-22', name: 'Champagne', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=90', type: 'image' },
      { id: 'drink-23', name: 'Aperol Spritz', url: 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', type: 'image' },
      { id: 'drink-24', name: 'Bloody Mary', url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=90', type: 'image' },
      { id: 'drink-25', name: 'Piña Colada', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=90', type: 'image' },
      { id: 'drink-26', name: 'Espresso Martini', url: 'https://images.unsplash.com/photo-1575023782549-62c0e1270490?w=800&q=90', type: 'image' },
      // Sıcak içecekler
      { id: 'drink-27', name: 'Espresso', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=85', type: 'image' },
      { id: 'drink-28', name: 'Cappuccino', url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=85', type: 'image' },
      { id: 'drink-29', name: 'Latte', url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=85', type: 'image' },
      { id: 'drink-30', name: 'Tea', url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=85', type: 'image' },
      { id: 'drink-31', name: 'Hot Chocolate', url: 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&q=85', type: 'image' },
    ]
  },
  desserts: {
    name: 'Desserts',
    icon: '🍰',
    items: [
      { id: 'dessert-1', name: 'Chocolate Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', type: 'image' },
      { id: 'dessert-2', name: 'Cheesecake', url: 'https://images.unsplash.com/photo-1533134242820-b4f3f2d8f7b3?w=800&q=80', type: 'image' },
      { id: 'dessert-3', name: 'Tiramisu', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80', type: 'image' },
      { id: 'dessert-4', name: 'Ice Cream', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', type: 'image' },
      { id: 'dessert-5', name: 'Waffle', url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80', type: 'image' },
      { id: 'dessert-6', name: 'Pancakes', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', type: 'image' },
      { id: 'dessert-7', name: 'Brownie', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', type: 'image' },
      { id: 'dessert-8', name: 'Cookies', url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80', type: 'image' },
      { id: 'dessert-9', name: 'Donut', url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80', type: 'image' },
      { id: 'dessert-10', name: 'Cupcake', url: 'https://images.unsplash.com/photo-1426869884541-df7117556757?w=800&q=80', type: 'image' },
      { id: 'dessert-11', name: 'Macaron', url: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=80', type: 'image' },
      { id: 'dessert-12', name: 'Profiterole', url: 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&q=80', type: 'image' },
    ]
  },
  icons: {
    name: 'İkonlar',
    icon: '⭐',
    items: [
      // Popüler İkonlar
      { id: 'icon-star', name: 'Yıldız', content: '⭐', type: 'icon', color: '#FFD700' },
      { id: 'icon-fire', name: 'Ateş', content: '🔥', type: 'icon', color: '#FF4500' },
      { id: 'icon-new', name: 'Yeni', content: '🆕', type: 'icon', color: '#00CED1' },
      { id: 'icon-hot', name: 'Acı', content: '🌶️', type: 'icon', color: '#DC143C' },
      { id: 'icon-heart', name: 'Kalp', content: '❤️', type: 'icon', color: '#FF1493' },
      { id: 'icon-check', name: 'Onay', content: '✅', type: 'icon', color: '#32CD32' },
      { id: 'icon-sparkle', name: 'Işıltı', content: '✨', type: 'icon', color: '#FFD700' },
      { id: 'icon-crown', name: 'Taç', content: '👑', type: 'icon', color: '#FFD700' },
      { id: 'icon-gift', name: 'Hediye', content: '🎁', type: 'icon', color: '#FF69B4' },
      { id: 'icon-trophy', name: 'Kupa', content: '🏆', type: 'icon', color: '#FFD700' },
      // Yemek İkonları
      { id: 'icon-pizza', name: 'Pizza', content: '🍕', type: 'icon', color: '#FF6B35' },
      { id: 'icon-burger', name: 'Burger', content: '🍔', type: 'icon', color: '#F4A261' },
      { id: 'icon-fries', name: 'Patates', content: '🍟', type: 'icon', color: '#E9C46A' },
      { id: 'icon-taco', name: 'Taco', content: '🌮', type: 'icon', color: '#F4A261' },
      { id: 'icon-sushi', name: 'Suşi', content: '🍣', type: 'icon', color: '#E76F51' },
      { id: 'icon-pasta', name: 'Makarna', content: '🍝', type: 'icon', color: '#E9C46A' },
      { id: 'icon-salad', name: 'Salata', content: '🥗', type: 'icon', color: '#52B788' },
      { id: 'icon-chicken', name: 'Tavuk', content: '🍗', type: 'icon', color: '#F4A261' },
      // İçecek İkonları - Kola ve Gazlı İçecekler (Emoji ile - URL yok, yeşil görselleri önlemek için)
      { id: 'icon-coca-cola', name: 'Coca Cola', content: '🥤', type: 'icon', color: '#8B0000' },
      { id: 'icon-pepsi', name: 'Pepsi', content: '🥤', type: 'icon', color: '#004B93' },
      { id: 'icon-sprite', name: 'Sprite', content: '🥤', type: 'icon', color: '#00A859' },
      { id: 'icon-fanta', name: 'Fanta', content: '🥤', type: 'icon', color: '#FF6600' },
      { id: 'icon-7up', name: '7UP', content: '🥤', type: 'icon', color: '#00A859' },
      { id: 'icon-mountain-dew', name: 'Mountain Dew', content: '🥤', type: 'icon', color: '#A4D65E' },
      { id: 'icon-dr-pepper', name: 'Dr. Pepper', content: '🥤', type: 'icon', color: '#8B0000' },
      { id: 'icon-fanta-orange', name: 'Fanta Portakal', content: '🥤', type: 'icon', color: '#FF6600' },
      { id: 'icon-fanta-lemon', name: 'Fanta Limon', content: '🥤', type: 'icon', color: '#FFD700' },
      { id: 'icon-coca-cola-zero', name: 'Coca Cola Zero', content: '🥤', type: 'icon', color: '#000000' },
      { id: 'icon-pepsi-max', name: 'Pepsi Max', content: '🥤', type: 'icon', color: '#000000' },
      { id: 'icon-schweppes', name: 'Schweppes', content: '🥤', type: 'icon', color: '#00A859' },
      { id: 'icon-red-bull', name: 'Red Bull', content: '⚡', type: 'icon', color: '#FF0000' },
      { id: 'icon-monster', name: 'Monster Energy', content: '⚡', type: 'icon', color: '#00FF00' },
      // Diğer İçecekler
      { id: 'icon-coffee', name: 'Kahve', content: '☕', type: 'icon', color: '#6F4E37' },
      { id: 'icon-iced-coffee', name: 'Buzlu Kahve', content: '🧊', type: 'icon', color: '#8B4513' },
      { id: 'icon-tea', name: 'Çay', content: '🍵', type: 'icon', color: '#228B22' },
      { id: 'icon-iced-tea', name: 'Buzlu Çay', content: '🧊', type: 'icon', color: '#228B22' },
      { id: 'icon-orange-juice', name: 'Portakal Suyu', content: '🧃', type: 'icon', color: '#FF8C00' },
      { id: 'icon-apple-juice', name: 'Elma Suyu', content: '🧃', type: 'icon', color: '#FF4500' },
      { id: 'icon-lemonade', name: 'Limonata', content: '🍋', type: 'icon', color: '#FFD700' },
      { id: 'icon-water', name: 'Su', content: '💧', type: 'icon', color: '#1E90FF' },
      { id: 'icon-milkshake', name: 'Milkshake', content: '🥛', type: 'icon', color: '#FFE4B5' },
      { id: 'icon-smoothie', name: 'Smoothie', content: '🥤', type: 'icon', color: '#32CD32' },
      { id: 'icon-beer', name: 'Bira', content: '🍺', type: 'icon', color: '#F4A261' },
      { id: 'icon-wine', name: 'Şarap', content: '🍷', type: 'icon', color: '#722F37' },
      { id: 'icon-cocktail', name: 'Kokteyl', content: '🍹', type: 'icon', color: '#E76F51' },
      // Tatlı İkonları
      { id: 'icon-cake', name: 'Pasta', content: '🍰', type: 'icon', color: '#E76F51' },
      { id: 'icon-icecream', name: 'Dondurma', content: '🍦', type: 'icon', color: '#E9C46A' },
      { id: 'icon-cookie', name: 'Kurabiye', content: '🍪', type: 'icon', color: '#8B4513' },
      { id: 'icon-donut', name: 'Donut', content: '🍩', type: 'icon', color: '#E76F51' },
      // Özel İkonlar
      { id: 'icon-vegan', name: 'Vegan', content: '🌱', type: 'icon', color: '#52B788' },
      { id: 'icon-halal', name: 'Helal', content: '☪️', type: 'icon', color: '#2A9D8F' },
      { id: 'icon-gluten', name: 'Glutensiz', content: '🌾', type: 'icon', color: '#E9C46A' },
      { id: 'icon-organic', name: 'Organik', content: '🍃', type: 'icon', color: '#52B788' },
      { id: 'icon-spicy', name: 'Baharatlı', content: '🔥', type: 'icon', color: '#FF4500' },
      { id: 'icon-chef', name: 'Şef Önerisi', content: '👨‍🍳', type: 'icon', color: '#264653' },
      { id: 'icon-clock', name: 'Hızlı', content: '⏱️', type: 'icon', color: '#2A9D8F' },
      { id: 'icon-discount', name: 'İndirim', content: '💰', type: 'icon', color: '#E9C46A' },
    ]
  },
  beverages: {
    name: 'Gazlı İçecekler',
    icon: '🥤',
    items: [
      { id: 'drink-coca-cola', name: 'Coca Cola', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-pepsi', name: 'Pepsi', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-sprite', name: 'Sprite', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-fanta', name: 'Fanta', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-7up', name: '7UP', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-mountain-dew', name: 'Mountain Dew', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-dr-pepper', name: 'Dr. Pepper', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-coca-cola-zero', name: 'Coca Cola Zero', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-pepsi-max', name: 'Pepsi Max', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-schweppes', name: 'Schweppes', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-red-bull', name: 'Red Bull', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-monster', name: 'Monster Energy', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', type: 'drink' },
      { id: 'drink-orange-juice', name: 'Portakal Suyu', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', type: 'drink' },
      { id: 'drink-apple-juice', name: 'Elma Suyu', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', type: 'drink' },
      { id: 'drink-lemonade', name: 'Limonata', url: 'https://images.unsplash.com/photo-1523677011783-c91d1bbe2fdc?w=400&q=80', type: 'drink' },
      { id: 'drink-iced-tea', name: 'Buzlu Çay', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', type: 'drink' },
      { id: 'drink-coffee', name: 'Kahve', url: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&q=80', type: 'drink' },
      { id: 'drink-water', name: 'Su', url: 'https://images.unsplash.com/photo-1548839140-5a941f94e0ea?w=400&q=80', type: 'drink' },
      { id: 'drink-smoothie', name: 'Smoothie', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', type: 'drink' },
      { id: 'drink-milkshake', name: 'Milkshake', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80', type: 'drink' },
    ]
  },
  badges: {
    name: 'Rozetler',
    icon: '🏷️',
    items: [
      // İndirim Rozetleri
      { id: 'badge-sale-50', name: '%50 İndirim', text: '%50 İNDİRİM', type: 'badge', bg: '#FF4444', color: '#FFFFFF' },
      { id: 'badge-sale-30', name: '%30 İndirim', text: '%30 İNDİRİM', type: 'badge', bg: '#FF5722', color: '#FFFFFF' },
      { id: 'badge-sale-20', name: '%20 İndirim', text: '%20 İNDİRİM', type: 'badge', bg: '#FF6B35', color: '#FFFFFF' },
      { id: 'badge-sale-10', name: '%10 İndirim', text: '%10 İNDİRİM', type: 'badge', bg: '#FF7F50', color: '#FFFFFF' },
      // Durum Rozetleri
      { id: 'badge-new', name: 'Yeni', text: 'YENİ', type: 'badge', bg: '#4CAF50', color: '#FFFFFF' },
      { id: 'badge-hot', name: 'Popüler', text: 'POPÜLER', type: 'badge', bg: '#FF9800', color: '#FFFFFF' },
      { id: 'badge-best', name: 'En İyi', text: 'EN İYİ', type: 'badge', bg: '#2196F3', color: '#FFFFFF' },
      { id: 'badge-special', name: 'Özel', text: 'ÖZEL', type: 'badge', bg: '#9C27B0', color: '#FFFFFF' },
      { id: 'badge-limited', name: 'Sınırlı', text: 'SINIRLI', type: 'badge', bg: '#F44336', color: '#FFFFFF' },
      { id: 'badge-sold-out', name: 'Tükendi', text: 'TÜKENDİ', type: 'badge', bg: '#757575', color: '#FFFFFF' },
      // Özellik Rozetleri
      { id: 'badge-vegan', name: 'Vegan', text: 'VEGAN', type: 'badge', bg: '#52B788', color: '#FFFFFF' },
      { id: 'badge-halal', name: 'Helal', text: 'HELAL', type: 'badge', bg: '#2A9D8F', color: '#FFFFFF' },
      { id: 'badge-organic', name: 'Organik', text: 'ORGANİK', type: 'badge', bg: '#52B788', color: '#FFFFFF' },
      { id: 'badge-gluten-free', name: 'Glutensiz', text: 'GLUTENSİZ', type: 'badge', bg: '#E9C46A', color: '#000000' },
      { id: 'badge-spicy', name: 'Acı', text: 'ACI', type: 'badge', bg: '#DC143C', color: '#FFFFFF' },
      { id: 'badge-chef', name: 'Şef Önerisi', text: 'ŞEF ÖNERİSİ', type: 'badge', bg: '#264653', color: '#FFFFFF' },
      // Kampanya Rozetleri
      { id: 'badge-1-1', name: '1+1', text: '1+1', type: 'badge', bg: '#E76F51', color: '#FFFFFF' },
      { id: 'badge-2-1', name: '2+1', text: '2 AL 1 ÖDE', type: 'badge', bg: '#E76F51', color: '#FFFFFF' },
      { id: 'badge-free-delivery', name: 'Ücretsiz Teslimat', text: 'ÜCRETSİZ TESLİMAT', type: 'badge', bg: '#2A9D8F', color: '#FFFFFF' },
      { id: 'badge-today', name: 'Bugünün Fırsatı', text: 'BUGÜNÜN FIRSATI', type: 'badge', bg: '#F4A261', color: '#000000' },
    ]
  },
  backgrounds: {
    name: 'Arka Planlar',
    icon: '🎨',
    items: [
      // HD Yemek Arka Planları
      { id: 'bg-food-1', name: 'Pizza Arka Plan', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&q=90', type: 'image' },
      { id: 'bg-food-2', name: 'Burger Arka Plan', url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1920&q=90', type: 'image' },
      { id: 'bg-food-3', name: 'Makarna Arka Plan', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1920&q=90', type: 'image' },
      { id: 'bg-food-4', name: 'Sushi Arka Plan', url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=1920&q=90', type: 'image' },
      { id: 'bg-food-5', name: 'Tavuk Arka Plan', url: 'https://images.unsplash.com/photo-1608039829574-b8c1cd81a1e1?w=1920&q=90', type: 'image' },
      { id: 'bg-food-6', name: 'Salata Arka Plan', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=90', type: 'image' },
      { id: 'bg-food-7', name: 'Kahvaltı Arka Plan', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1920&q=90', type: 'image' },
      { id: 'bg-food-8', name: 'Tatlı Arka Plan', url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1920&q=90', type: 'image' },
      { id: 'bg-food-9', name: 'Barbekü Arka Plan', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1920&q=90', type: 'image' },
      { id: 'bg-food-10', name: 'Deniz Ürünleri Arka Plan', url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1920&q=90', type: 'image' },
      // Gradient Arka Planlar
      { id: 'bg-gradient-1', name: 'Kırmızı Gradyan', type: 'background', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { id: 'bg-gradient-2', name: 'Mavi Gradyan', type: 'background', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { id: 'bg-gradient-3', name: 'Yeşil Gradyan', type: 'background', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
      { id: 'bg-gradient-4', name: 'Turuncu Gradyan', type: 'background', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
      // Solid Renkler
      { id: 'bg-solid-1', name: 'Koyu Mavi', type: 'background', color: '#1a237e' },
      { id: 'bg-solid-2', name: 'Koyu Kırmızı', type: 'background', color: '#b71c1c' },
      { id: 'bg-solid-3', name: 'Koyu Yeşil', type: 'background', color: '#1b5e20' },
    ]
  },
  text: {
    name: 'Metin Şablonları',
    icon: '📝',
    items: [
      { id: 'text-title', name: 'Başlık', type: 'text', template: 'title', sample: 'Başlık Metni' },
      { id: 'text-subtitle', name: 'Alt Başlık', type: 'text', template: 'subtitle', sample: 'Alt başlık metni' },
      { id: 'text-price', name: 'Fiyat', type: 'text', template: 'price', sample: '$99.99' },
      { id: 'text-description', name: 'Açıklama', type: 'text', template: 'description', sample: 'Ürün açıklaması...' },
    ]
  }
};

// Tek Menü: 3 sütun (Special FOOD MENU) – öğe tipi
interface RegionalMenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
}

interface RegionalMenuCategory {
  id: string;
  name: string;
  image_url: string;
  items: RegionalMenuItem[];
}

// Reference visuals: DRINKS (cold, hot, alcoholic), FOODS (Canadian-style), DESSERT + header + contact
const defaultSpecialFoodMenu = {
  header_special: 'Special',
  header_title: 'FOOD MENU',
  categories: [
    {
      id: 'cat-drinks',
      name: 'DRINKS',
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=85',
      items: [
        { id: 'd1', name: 'Cola & Lemonade', description: 'Cold soft drinks', price: '$$' },
        { id: 'd2', name: 'Iced Tea & Coffee', description: 'Chilled beverages', price: '$$' },
        { id: 'd3', name: 'Beer & Wine', description: 'Alcoholic drinks', price: '$$' },
        { id: 'd4', name: 'Espresso & Latte', description: 'Hot coffee', price: '$$' },
        { id: 'd5', name: 'Tea & Hot Chocolate', description: 'Hot drinks', price: '$$' },
        { id: 'd6', name: 'Smoothies & Juices', description: 'Fresh cold drinks', price: '$$' },
      ] as RegionalMenuItem[],
    },
    {
      id: 'cat-foods',
      name: 'FOODS',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=85',
      items: [
        { id: 'f1', name: 'Poutine', description: 'Canadian classic', price: '$$' },
        { id: 'f2', name: 'Maple Salmon', description: 'Canadian favourite', price: '$$' },
        { id: 'f3', name: 'Smoked Meat', description: 'Montreal style', price: '$$' },
        { id: 'f4', name: 'Butter Tarts', description: 'Sweet Canadian', price: '$$' },
        { id: 'f5', name: 'Tourtière', description: 'Savory pie', price: '$$' },
        { id: 'f6', name: 'Nanaimo Bars', description: 'West coast treat', price: '$$' },
      ] as RegionalMenuItem[],
    },
    {
      id: 'cat-dessert',
      name: 'DESSERT',
      image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=85',
      items: [
        { id: 's1', name: 'Chocolate Cake', description: 'Rich dessert', price: '$$' },
        { id: 's2', name: 'Cheesecake', description: 'Creamy classic', price: '$$' },
        { id: 's3', name: 'Tiramisu', description: 'Italian favourite', price: '$$' },
        { id: 's4', name: 'Ice Cream', description: 'Cold treat', price: '$$' },
        { id: 's5', name: 'Brownie', description: 'Chocolate square', price: '$$' },
        { id: 's6', name: 'Donut', description: 'Sweet pastry', price: '$$' },
      ] as RegionalMenuItem[],
    },
  ] as RegionalMenuCategory[],
  contact_info: 'Contact us: +1 234 567 8900',
};

// API'den gelen item'ı grid formatına çevir
function mapApiItemToGridItem(item: any): any {
  if (item.category === 'badges' && item.type === 'icon') {
    return { ...item, type: 'badge', text: item.content || item.name, bg: '#FF4444', color: '#FFFFFF' };
  }
  return item;
}

export default function ContentLibrary({ onSelectContent, initialCategory, compact = false, imageModalLayout = false, showAllTab = false, refreshTrigger }: ContentLibraryProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || (showAllTab ? 'all' : 'food'));
  const [searchQuery, setSearchQuery] = useState('');
  const [userLibrary, setUserLibrary] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [apiLibrary, setApiLibrary] = useState<Record<string, { name: string; icon: string; items: any[] }>>({});
  const [libraryLoading, setLibraryLoading] = useState(true);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Admin kütüphane ile senkronize - API'den yükle (yenile butonu ile de çağrılır)
  const loadFromAdminLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      let cats: any[] = [];
      let itemsGrouped: Record<string, any[]> = {};
      try {
        cats = await apiClient('/content-library/categories');
      } catch {
        cats = [];
      }
      // Sadece API'den gelen kategorileri kullan — silinen kategoriler düzenleme sayfasında görünmesin
      const apiCats = Array.isArray(cats) ? cats : [];
      try {
        const data = await apiClient('/content-library');
        if (typeof data === 'object' && !Array.isArray(data)) {
          itemsGrouped = data;
        }
      } catch {
        itemsGrouped = {};
      }
      const lib: Record<string, { name: string; icon: string; items: any[] }> = {};
      const sortedCats = [...apiCats].sort((a: any, b: any) => (a.display_order ?? 999) - (b.display_order ?? 999));
      const slugToLabelKey: Record<string, string> = {
        food: 'editor_category_food', pasta: 'editor_category_pasta', drinks: 'editor_category_drinks',
        icons: 'editor_category_icons', badges: 'editor_category_badges', backgrounds: 'editor_category_backgrounds',
        text: 'editor_category_text_templates', video: 'editor_category_video',
      };
      sortedCats.forEach((c: any) => {
        const slug = c.slug || c.id;
        if (slug === 'regional' || slug === 'tek-menu') return;
        const items = (itemsGrouped[slug] || []).map(mapApiItemToGridItem);
        const name = c.labelKey ? t(c.labelKey) : (slugToLabelKey[slug] ? t(slugToLabelKey[slug]) : (c.label || c.name || slug));
        lib[slug] = { name, icon: c.icon || '📦', items };
      });
      setApiLibrary(lib);
      const keys = Object.keys(lib);
      if (keys.length > 0) {
        setActiveCategory((prev) => {
          if (initialCategory === 'all' && showAllTab) return 'all';
          if (initialCategory && keys.includes(initialCategory)) return initialCategory;
          if (prev === 'user-library' || prev === 'all') return prev;
          if (prev === 'regional' || prev === 'tek-menu') return showAllTab ? 'all' : keys[0];
          return keys.includes(prev) ? prev : (showAllTab ? 'all' : keys[0]);
        });
      }
    } finally {
      setLibraryLoading(false);
    }
  }, [t, initialCategory, showAllTab]);

  useEffect(() => {
    loadFromAdminLibrary();
  }, [loadFromAdminLibrary]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) loadFromAdminLibrary();
  }, [refreshTrigger, loadFromAdminLibrary]);

  // Admin kütüphanesinde değişiklik olduğunda veya sekme görünür olduğunda senkronize et
  useEffect(() => {
    const onUpdate = () => loadFromAdminLibrary();
    window.addEventListener('content-library-updated', onUpdate);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onUpdate();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('content-library-updated', onUpdate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadFromAdminLibrary]);

  // localStorage'dan kullanıcı kütüphanesini yükle
  useEffect(() => {
    const saved = localStorage.getItem('userContentLibrary');
    if (saved) {
      try {
        setUserLibrary(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading user library:', e);
      }
    }
  }, []);

  // Kullanıcı kütüphanesini localStorage'a kaydet
  const saveUserLibrary = (library: any[]) => {
    localStorage.setItem('userContentLibrary', JSON.stringify(library));
    setUserLibrary(library);
  };

  // Resim optimize etme fonksiyonu - Full HD kalite koruma (1920x1080)
  const optimizeImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.98): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Full HD veya daha küçükse orijinal kaliteyi koru (yeniden sıkıştırma yok)
          if (width <= maxWidth && height <= maxHeight) {
            const base64 = e.target?.result as string;
            if (base64.length > 5000000) {
              reject(new Error('Resim çok büyük (maks 5MB). Lütfen daha küçük bir resim seçin.'));
              return;
            }
            resolve(base64);
            return;
          }

          // Full HD'den büyükse sadece ölçekle, yüksek kalitede
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          if (width < 100) width = 100;
          if (height < 100) height = 100;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context oluşturulamadı'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const usePng = file.type === 'image/png' || file.type === 'image/gif';
          const optimizedBase64 = usePng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', quality);

          if (optimizedBase64.length > 5000000) {
            if (!usePng) {
              const lowerBase64 = canvas.toDataURL('image/jpeg', 0.92);
              if (lowerBase64.length > 5000000) {
                reject(new Error('Resim çok büyük. Lütfen daha küçük bir resim seçin.'));
                return;
              }
              resolve(lowerBase64);
            } else {
              reject(new Error('PNG/GIF çok büyük. Lütfen daha küçük bir resim seçin.'));
            }
          } else {
            resolve(optimizedBase64);
          }
        };
        img.onerror = () => reject(new Error('Resim yüklenemedi'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });
  };

  // Dosya yükleme fonksiyonu
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: any[] = [];
    let loadedCount = 0;
    const totalFiles = Array.from(files).filter(f => f.type.startsWith('image/')).length;

    // Her dosyayı optimize et ve yükle
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} bir resim dosyası değil!`);
        loadedCount++;
        if (loadedCount === totalFiles) {
          setIsUploading(false);
          event.target.value = '';
        }
        continue;
      }

      try {
        // Resmi optimize et (Full HD: 1920x1080, kalite: %98 - HD koruma)
        const optimizedBase64 = await optimizeImage(file, 1920, 1080, 0.98);
        
        const newItem = {
          id: `user-${Date.now()}-${index}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: optimizedBase64,
          type: 'image',
          isUserUpload: true,
        };
        newItems.push(newItem);
        
        // Backend'e de kaydet (food kategorisinde)
        try {
          await apiClient('/content-library', {
            method: 'POST',
            body: {
              name: newItem.name,
              category: 'food',
              type: 'image',
              url: optimizedBase64,
              display_order: 0,
            },
          });
          window.dispatchEvent(new CustomEvent('content-library-updated'));
        } catch (backendError: any) {
          console.error(`Backend'e kaydedilirken hata (${file.name}):`, backendError);
          console.error('Hata detayları:', {
            message: backendError?.message,
            data: backendError?.data,
            status: backendError?.status,
          });
          // Backend hatası olsa bile localStorage'a kaydetmeye devam et
        }
        
        loadedCount++;
        
        if (loadedCount === totalFiles) {
          const updatedLibrary = [...userLibrary, ...newItems];
          saveUserLibrary(updatedLibrary);
          setIsUploading(false);
          // Input'u temizle
          event.target.value = '';
        }
      } catch (error) {
        console.error(`Error optimizing ${file.name}:`, error);
        alert(`${file.name} optimize edilirken hata oluştu!`);
        loadedCount++;
        if (loadedCount === totalFiles) {
          setIsUploading(false);
          event.target.value = '';
        }
      }
    }
  };

  // Kullanıcı içeriğini sil
  const handleDeleteUserContent = (id: string) => {
    if (confirm('Bu resmi silmek istediğinize emin misiniz?')) {
      const updatedLibrary = userLibrary.filter(item => item.id !== id);
      saveUserLibrary(updatedLibrary);
    }
  };

  const currentCategory = activeCategory === 'user-library' 
    ? { name: t('library_user_library'), icon: '📚', items: userLibrary }
    : activeCategory === 'all' && showAllTab
    ? { name: t('editor_filter_all'), icon: '📦', items: Object.values(apiLibrary).flatMap((c) => c.items) }
    : apiLibrary[activeCategory];
  
  const filteredItems = (currentCategory?.items || []).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isVideoCategory = activeCategory === 'video';
  const isAllCategory = activeCategory === 'all';
  const contentGridClass = isVideoCategory
    ? 'grid grid-cols-6 sm:grid-cols-8 gap-2'
    : isAllCategory
    ? 'grid grid-cols-5 gap-2'
    : imageModalLayout
    ? 'grid grid-cols-4 gap-3'
    : (compact ? 'grid grid-cols-5 sm:grid-cols-6 gap-2' : 'grid grid-cols-2 gap-4');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Arama + Yenile - Admin ile senkronize */}
      <div className="p-4 border-b flex gap-2">
        <input
          type="text"
          placeholder={t('library_search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => loadFromAdminLibrary()}
          disabled={libraryLoading}
          className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 disabled:opacity-50"
          title={t('library_update_from_admin')}
        >
          {libraryLoading ? '⋯' : '↻'}
        </button>
      </div>

      {/* Kategori Sekmeleri - Admin kütüphane sayfasındaki kategoriler */}
      <div className="flex overflow-x-auto border-b bg-gray-50">
        {libraryLoading ? (
          <div className="px-4 py-3 text-sm text-gray-500">{t('common_loading')}</div>
        ) : (
          <>
            {showAllTab && (
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">📦</span>
                {t('editor_filter_all')}
              </button>
            )}
            {Object.entries(apiLibrary).filter(([key]) => key !== 'regional' && key !== 'tek-menu').map(([key, category]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
            <button
              onClick={() => setActiveCategory('user-library')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                activeCategory === 'user-library'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">📚</span>
              {t('library_user_library')}
            </button>
          </>
        )}
      </div>

      {/* User library - File upload */}
      {activeCategory === 'user-library' && (
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{t('library_upload_your_images')}</h3>
              <p className="text-xs text-gray-600">{t('library_upload_images_hint')}</p>
            </div>
          </div>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common_loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('library_upload_image')}
                  </>
                )}
              </button>
            </div>
          </label>
          {userLibrary.length > 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {userLibrary.length} {t('library_images_uploaded')}
            </p>
          )}
        </div>
      )}

      {/* İçerik Grid veya Yöresel Tek Menü — sağda her zaman görünür kaydırma çubuğu */}
      <div className="content-library-scroll flex-1 min-h-0 overflow-y-scroll overflow-x-hidden p-4" style={{ scrollbarGutter: 'stable', WebkitOverflowScrolling: 'touch' }}>
        {activeCategory === 'user-library' && userLibrary.length === 0 && !isUploading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg font-semibold">{t('library_no_images_yet')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('library_upload_hint')}</p>
          </div>
        )}

        <div className={contentGridClass}>
          {!currentCategory && !libraryLoading && (
            <div className="col-span-2 text-center py-8 text-gray-500 text-sm">
              {t('library_category_empty')}
            </div>
          )}
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                logAdminActivity({ action_type: 'library_select', page_key: 'library', details: { name: item.name, type: item.type || 'image' } });
                onSelectContent(item);
              }}
              className={`group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg bg-white`}
            >
              {/* Resim İçeriği */}
              {item.type === 'image' && (
                <div className="w-full h-full relative overflow-hidden bg-gray-100">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EResim%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-semibold drop-shadow-lg">{item.name}</p>
                      <p className="text-white/80 text-xs mt-1">{t('library_click_to_add')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* İkon İçeriği */}
              {item.type === 'icon' && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-blue-50 group-hover:to-purple-50 transition-all relative overflow-hidden">
                  {/* Eğer URL varsa gerçekçi görsel göster, yoksa emoji */}
                  {item.url ? (
                    <div className="w-full h-full relative">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Hata durumunda emoji göster
                          e.currentTarget.style.display = 'none';
                          const emojiSpan = e.currentTarget.parentElement?.querySelector('.emoji-fallback');
                          if (emojiSpan) {
                            (emojiSpan as HTMLElement).style.display = 'block';
                          }
                        }}
                      />
                      <span className="emoji-fallback text-7xl group-hover:scale-125 transition-transform duration-300 drop-shadow-lg absolute inset-0 flex items-center justify-center" style={{ display: 'none' }}>
                        {item.content}
                      </span>
                    </div>
                  ) : (
                    <span className="text-7xl group-hover:scale-125 transition-transform duration-300 drop-shadow-lg">{item.content}</span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-semibold text-center drop-shadow">{item.name}</p>
                  </div>
                </div>
              )}

              {/* Rozet İçeriği */}
              {item.type === 'badge' && (
                <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                  <div
                    className="px-6 py-3 rounded-xl font-bold text-xs shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border-2 border-white/50"
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    {item.text}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-semibold text-center drop-shadow">{item.name}</p>
                  </div>
                </div>
              )}

              {/* İçecek İçeriği */}
              {item.type === 'drink' && (
                <div className="w-full h-full relative overflow-hidden bg-gray-100">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 p-4"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3Eİçecek%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-semibold drop-shadow-lg">{item.name}</p>
                      <p className="text-white/80 text-xs mt-1">{t('library_click_to_add')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video İçeriği - hover ile oynatılır */}
              {item.type === 'video' && item.url && (
                <div
                  className="w-full h-full relative overflow-hidden bg-slate-800"
                  onMouseEnter={() => videoRefs.current[item.id]?.play()}
                  onMouseLeave={() => {
                    const v = videoRefs.current[item.id];
                    if (v) {
                      v.pause();
                      v.currentTime = 0;
                    }
                  }}
                >
                  <video
                    ref={(el) => { videoRefs.current[item.id] = el; }}
                    src={item.url}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    muted
                    playsInline
                    preload="metadata"
                    loop
                    onLoadedData={(e) => {
                      const v = e.target as HTMLVideoElement;
                      if (v.duration > 0) v.currentTime = Math.min(0.5, v.duration * 0.1);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <span className="text-2xl text-white drop-shadow-lg opacity-80">▶</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-semibold drop-shadow-lg truncate">{item.name}</p>
                      <p className="text-white/80 text-[10px] mt-0.5">{t('library_click_to_add')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Arka Plan İçeriği */}
              {item.type === 'background' && (
                <div className="w-full h-full relative overflow-hidden">
                  {/* Resim Arka Plan */}
                  {item.url ? (
                    <div className="w-full h-full relative">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EArka Plan%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-semibold drop-shadow-lg">{item.name}</p>
                          <p className="text-white/80 text-xs mt-1">Arka plan olarak ekle</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Gradient/Solid Arka Plan */
                    <div className="w-full h-full">
                      <div
                        className="w-full h-full group-hover:scale-105 transition-transform"
                        style={{
                          background: item.gradient || item.color,
                        }}
                      />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-medium text-center drop-shadow-lg">{item.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metin İçeriği */}
              {item.type === 'text' && (
                <div className="w-full h-full flex items-center justify-center p-4 bg-gray-50 group-hover:bg-gray-100">
                  <div className="text-center">
                    <p className="text-gray-800 font-semibold mb-1">{item.sample}</p>
                    <p className="text-gray-500 text-xs">{item.name}</p>
                  </div>
                </div>
              )}

              {/* Ekle İkonu */}
              <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>

              {/* Kullanıcı yüklemeleri için sil butonu */}
              {item.isUserUpload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUserContent(item.id);
                  }}
                  className="absolute top-2 left-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  title={t('btn_delete')}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </button>
          ))}
        </div>

        {/* Sonuç Bulunamadı */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('library_content_not_found')}</p>
            <p className="text-gray-400 text-sm mt-2">Farklı bir arama terimi deneyin</p>
          </div>
        )}
      </div>

      {/* Alt Bilgi */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {filteredItems.length} {t('library_items_count')} • {t('library_hd_quality')} • {t('editor_free_usage')}
        </p>
      </div>
    </div>
  );
}
