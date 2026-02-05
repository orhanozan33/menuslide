import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GenerateTemplateDto } from './dto/generate-template.dto';

interface MenuCategory {
  id: string;
  name_tr: string;
  name_en: string;
  name_fr: string;
  products: Array<{
    product_id: string;
    name_tr: string;
    name_en: string;
    name_fr: string;
    description_tr: string;
    description_en: string;
    description_fr: string;
    price: number;
    tags: string[];
    upsell: string[];
    variants: Array<{ name: string; price_modifier: number }>;
    time_slots: string[];
    tv_featured: boolean;
    image_url?: string;
  }>;
}

interface MenuIntelligenceOutput {
  menu_id: string;
  categories: MenuCategory[];
}

@Injectable()
export class AITemplateGeneratorService {
  constructor(private database: DatabaseService) {}

  async generateTemplate(dto: GenerateTemplateDto, userId: string) {
    if (!userId) {
      console.error('[AI Template] User ID is missing');
      throw new Error('User ID is required');
    }

    // Rule-based AI logic (no paid image generation)
    // For restaurant/cafe/pizza/burger/bakery, use special 2-block menu layout
    const restaurantTypes = ['pizza', 'cafe', 'burger', 'bakery', 'restaurant'];
    const isRestaurantType = restaurantTypes.includes(dto.business_type || '');
    
    let blockCount: number;
    let useMenuLayout = false;
    
    if (isRestaurantType && (dto.content_type === 'menu-heavy' || !dto.content_type)) {
      // Special 2-block menu layout: left = branding, right = menu grid
      blockCount = 2;
      useMenuLayout = true;
    } else {
      const layoutMapping: Record<string, number> = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
      };
      blockCount = layoutMapping[dto.screen_count || '1'] || 1;
    }

    // Color palettes based on style
    const colorPalettes: Record<string, string[]> = {
      modern: ['#1e40af', '#3b82f6', '#60a5fa'],
      classic: ['#92400e', '#b45309', '#d97706'],
      minimal: ['#374151', '#6b7280', '#9ca3af'],
      colorful: ['#7c3aed', '#ec4899', '#f59e0b'],
    };

    const colors = colorPalettes[dto.preferred_style || 'modern'] || colorPalettes.modern;

    // Content type configuration
    const contentTypeConfig: Record<string, any> = {
      'menu-heavy': {
        font_size: 'large',
        image_ratio: 0.3,
        text_ratio: 0.7,
      },
      'image-heavy': {
        font_size: 'medium',
        image_ratio: 0.7,
        text_ratio: 0.3,
      },
      'campaign-focused': {
        font_size: 'x-large',
        image_ratio: 0.5,
        text_ratio: 0.5,
      },
    };

    const config = contentTypeConfig[dto.content_type || 'menu-heavy'] || contentTypeConfig['menu-heavy'];

    // Generate template name with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const templateName = `ai_${dto.business_type || 'business'}_${dto.preferred_style || 'modern'}_${timestamp}`;
    const displayName = `AI Generated - ${dto.business_type || 'Business'} (${dto.preferred_style || 'modern'})`;

    try {
      // Create template
      const templateResult = await this.database.query(
        `INSERT INTO templates (name, display_name, description, block_count, scope, created_by, business_id, ai_generated, ai_generation_params)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          templateName,
          displayName,
          `AI-generated template for ${dto.business_type || 'business'} with ${dto.preferred_style || 'modern'} style`,
          blockCount,
          'user',
          userId,
          dto.business_id || null,
          true,
          JSON.stringify(dto),
        ],
      );

      if (!templateResult.rows || templateResult.rows.length === 0) {
        throw new Error('Template oluşturulamadı');
      }

      const template = templateResult.rows[0];

      // Generate blocks based on layout
      const blockPositions = useMenuLayout 
        ? this.getMenuLayoutPositions() 
        : this.getBlockPositions(blockCount);
      for (let i = 0; i < blockCount; i++) {
        const pos = blockPositions[i];
        let styleConfig: any;
        
        if (useMenuLayout) {
          // Special styling for restaurant menu layout
          if (i === 0) {
            // Left block: Branding panel (green)
            styleConfig = {
              background_color: '#16a34a', // Green
              background_gradient: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
              font_size: 'x-large',
              image_ratio: 0.6,
              text_ratio: 0.4,
              layout_type: 'branding',
              show_logo: true,
              show_title: true,
              show_feature_image: true,
              text_color: '#ffffff',
              title_color: '#fbbf24', // Gold for title
            };
          } else {
            // Right block: Menu grid panel (dark)
            styleConfig = {
              background_color: '#0f172a', // Dark slate
              background_gradient: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              font_size: 'large',
              image_ratio: 0.4,
              text_ratio: 0.6,
              layout_type: 'menu_grid',
              grid_columns: 4,
              grid_rows: 3,
              card_style: 'circular_image',
              price_badge_color: '#16a34a',
              text_color: '#ffffff',
              card_background: 'rgba(255, 255, 255, 0.05)',
            };
          }
        } else {
          // Standard block styling
          styleConfig = {
            background_color: colors[i % colors.length],
            font_size: config.font_size,
            image_ratio: config.image_ratio,
            text_ratio: config.text_ratio,
          };
        }
        
        try {
          await this.database.query(
            `INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height, z_index, animation_type, style_config)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              template.id,
              i,
              pos.x,
              pos.y,
              pos.width,
              pos.height,
              i,
              'fade',
              JSON.stringify(styleConfig),
            ],
          );
        } catch (blockError: any) {
          throw new Error(`Block ${i} oluşturulamadı: ${blockError.message}`);
        }
      }

      // Generate menu content if business_id is provided
      let menu = null;
      let menuItems: any[] = [];
      let screenBlocks: any[] = [];
      
      if (dto.business_id) {
        const menuIntelligence = this.generateMenuContent(dto);
        
        // Create menu (use first category TR name as menu name)
        const menuName = menuIntelligence.categories.length > 0 
          ? `${menuIntelligence.categories[0].name_tr} Menüsü` 
          : 'AI Menü';
        const menuResult = await this.database.query(
          `INSERT INTO menus (business_id, name, description, slide_duration, is_active)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            dto.business_id,
            menuName,
            'AI ile oluşturulmuş akıllı menü içeriği',
            5,
            true,
          ]
        );
        menu = menuResult.rows[0];
        menuIntelligence.menu_id = menu.id;

        // Create menu items with all intelligence data
        let displayOrder = 0;
        for (const category of menuIntelligence.categories) {
          for (const product of category.products) {
            // Create menu item with TR as default
            const itemResult = await this.database.query(
              `INSERT INTO menu_items (
                menu_id, name, description, price, image_url, display_order, is_active,
                tags, upsell_items, variants, time_slots, tv_featured, category_name
              )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               RETURNING *`,
              [
                menu.id,
                product.name_tr,
                product.description_tr,
                product.price,
                product.image_url || null,
                displayOrder++,
                true,
                JSON.stringify(product.tags),
                JSON.stringify(product.upsell),
                JSON.stringify(product.variants),
                JSON.stringify(product.time_slots),
                product.tv_featured,
                category.name_tr,
              ]
            );
            const menuItem = itemResult.rows[0];
            menuItems.push(menuItem);

            // Create translations for EN and FR
            if (product.name_en) {
              await this.database.query(
                `INSERT INTO menu_item_translations (menu_item_id, language_code, name, description)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (menu_item_id, language_code) DO UPDATE SET name = $3, description = $4`,
                [menuItem.id, 'en', product.name_en, product.description_en || product.description_tr]
              );
            }
            if (product.name_fr) {
              await this.database.query(
                `INSERT INTO menu_item_translations (menu_item_id, language_code, name, description)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (menu_item_id, language_code) DO UPDATE SET name = $3, description = $4`,
                [menuItem.id, 'fr', product.name_fr, product.description_fr || product.description_tr]
              );
            }
          }
        }

        // If screen_id is provided, create screen blocks and link content
        if (dto.screen_id) {
          // Get template blocks
          const templateBlocksResult = await this.database.query(
            'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index ASC',
            [template.id]
          );
          const templateBlocks = templateBlocksResult.rows;

          // Create screen blocks
          for (const templateBlock of templateBlocks) {
            const screenBlockResult = await this.database.query(
              `INSERT INTO screen_blocks (
                screen_id, template_block_id, display_order, is_active,
                position_x, position_y, width, height,
                z_index, animation_type, animation_duration, animation_delay
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING *`,
              [
                dto.screen_id,
                templateBlock.id,
                templateBlock.block_index,
                true,
                templateBlock.position_x,
                templateBlock.position_y,
                templateBlock.width,
                templateBlock.height,
                templateBlock.z_index || templateBlock.block_index,
                templateBlock.animation_type || 'fade',
                500,
                0,
              ]
            );
            const screenBlock = screenBlockResult.rows[0];
            screenBlocks.push(screenBlock);

            // Create screen block contents based on block type
            if (templateBlock.style_config) {
              const styleConfig = typeof templateBlock.style_config === 'string' 
                ? JSON.parse(templateBlock.style_config) 
                : templateBlock.style_config;

              if (styleConfig.layout_type === 'menu_grid' && menuItems.length > 0) {
                // Create product list content for menu grid block
                const itemsPerBlock = Math.min(12, menuItems.length); // Max 12 items per block
                for (let i = 0; i < itemsPerBlock; i++) {
                  const menuItem = menuItems[i];
                  await this.database.query(
                    `INSERT INTO screen_block_contents (
                      screen_block_id, content_type, title, description, price,
                      image_url, menu_item_id, menu_id, display_order, is_active
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                      screenBlock.id,
                      'single_product',
                      menuItem.name,
                      menuItem.description,
                      menuItem.price,
                      menuItem.image_url || null,
                      menuItem.id,
                      menu.id,
                      i,
                      true,
                    ]
                  );
                }
              } else if (styleConfig.layout_type === 'branding') {
                // Create branding content
                const brandingTitle = menuIntelligence.categories.length > 0 
                  ? `${menuIntelligence.categories[0].name_tr} Menüsü`
                  : 'Menü';
                await this.database.query(
                  `INSERT INTO screen_block_contents (
                    screen_block_id, content_type, title, description,
                    display_order, is_active
                  )
                  VALUES ($1, $2, $3, $4, $5, $6)`,
                  [
                    screenBlock.id,
                    'text',
                    brandingTitle,
                    'AI ile oluşturulmuş akıllı menü içeriği',
                    0,
                    true,
                  ]
                );
              }
            }
          }
        }
      }

      return { 
        template,
        menu: menu ? {
          id: menu.id,
          name: menu.name,
          description: menu.description,
          item_count: menuItems.length,
        } : null,
        menu_items_count: menuItems.length,
      };
    } catch (error: any) {
      console.error('[AI Template] Error in generateTemplate:', error);
      console.error('[AI Template] Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
      });
      throw error;
    }
  }

  private generateMenuContent(dto: GenerateTemplateDto): MenuIntelligenceOutput {
    const businessType = dto.business_type || 'restaurant';
    const priceLevel = dto.price_level || 'medium';
    const menuPurpose = dto.menu_purpose || 'main-menu';
    const targetCustomer = dto.content_type === 'campaign-focused' ? 'premium' : 'family';

    // Price multipliers based on level
    const priceMultipliers: Record<string, number> = {
      low: 0.7,
      medium: 1.0,
      premium: 1.5,
    };
    const multiplier = priceMultipliers[priceLevel] || 1.0;

    // Generate intelligent menu content (NO design/layout/styling)
    const menuContent = this.generateIntelligentMenuContent(businessType, priceLevel, targetCustomer, multiplier);
    return menuContent;
  }

  private generateIntelligentMenuContent(
    businessType: string,
    priceLevel: string,
    targetCustomer: string,
    priceMultiplier: number
  ): MenuIntelligenceOutput {

    // Business type specific intelligent menu content (CONTENT ONLY, NO DESIGN)
    const menuData: Record<string, () => MenuIntelligenceOutput> = {
      pizza: () => ({
        menu_id: '',
        categories: [
          {
            id: 'cat_pizza_classic',
            name_tr: 'Klasik Pizzalar',
            name_en: 'Classic Pizzas',
            name_fr: 'Pizzas Classiques',
            products: [
              {
                product_id: '',
                name_tr: 'Margherita',
                name_en: 'Margherita',
                name_fr: 'Margherita',
                description_tr: 'Taze mozzarella, domates sos ve fesleğen ile hazırlanan klasik İtalyan lezzeti',
                description_en: 'Classic Italian flavor with fresh mozzarella, tomato sauce and basil',
                description_fr: 'Saveur italienne classique avec mozzarella fraîche, sauce tomate et basilic',
                price: Math.round(12.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller', 'vegetarian'],
                upsell: ['Coca Cola', 'Garlic Bread'],
                variants: [
                  { name: 'Küçük (25cm)', price_modifier: -3.0 },
                  { name: 'Büyük (35cm)', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Pepperoni',
                name_en: 'Pepperoni',
                name_fr: 'Pepperoni',
                description_tr: 'Bol pepperoni, mozzarella ve domates sos ile hazırlanan lezzetli pizza',
                description_en: 'Delicious pizza with generous pepperoni, mozzarella and tomato sauce',
                description_fr: 'Pizza délicieuse avec pepperoni généreux, mozzarella et sauce tomate',
                price: Math.round(14.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller', 'spicy'],
                upsell: ['Coca Cola', 'Garlic Bread'],
                variants: [
                  { name: 'Küçük (25cm)', price_modifier: -3.0 },
                  { name: 'Büyük (35cm)', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: '4 Peynirli',
                name_en: 'Four Cheese',
                name_fr: 'Quatre Fromages',
                description_tr: 'Mozzarella, cheddar, kaşar ve beyaz peynir karışımı ile hazırlanan özel pizza',
                description_en: 'Special pizza prepared with a blend of mozzarella, cheddar, kashar and white cheese',
                description_fr: 'Pizza spéciale préparée avec un mélange de mozzarella, cheddar, kashar et fromage blanc',
                price: Math.round(16.99 * priceMultiplier * 100) / 100,
                tags: ['vegetarian'],
                upsell: ['Coca Cola', 'Garlic Bread'],
                variants: [
                  { name: 'Küçük (25cm)', price_modifier: -3.0 },
                  { name: 'Büyük (35cm)', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
              {
                product_id: '',
                name_tr: 'Karışık',
                name_en: 'Mixed',
                name_fr: 'Mixte',
                description_tr: 'Sucuk, salam, mantar, mısır ve zeytin ile zenginleştirilmiş doyurucu pizza',
                description_en: 'Filling pizza enriched with sausage, salami, mushrooms, corn and olives',
                description_fr: 'Pizza copieuse enrichie de saucisse, salami, champignons, maïs et olives',
                price: Math.round(18.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Coca Cola', 'Garlic Bread', 'Caesar Salad'],
                variants: [
                  { name: 'Küçük (25cm)', price_modifier: -3.0 },
                  { name: 'Büyük (35cm)', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Vejetaryen',
                name_en: 'Vegetarian',
                name_fr: 'Végétarienne',
                description_tr: 'Mantar, biber, zeytin, mısır ve domates ile hazırlanan sağlıklı ve lezzetli seçenek',
                description_en: 'Healthy and delicious option prepared with mushrooms, peppers, olives, corn and tomatoes',
                description_fr: 'Option saine et délicieuse préparée avec champignons, poivrons, olives, maïs et tomates',
                price: Math.round(15.99 * priceMultiplier * 100) / 100,
                tags: ['vegetarian', 'healthy'],
                upsell: ['Coca Cola', 'Garlic Bread'],
                variants: [
                  { name: 'Küçük (25cm)', price_modifier: -3.0 },
                  { name: 'Büyük (35cm)', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
            ],
          },
        ],
      }),
      burger: () => ({
        menu_id: '',
        categories: [
          {
            id: 'cat_burger_classic',
            name_tr: 'Klasik Burgerler',
            name_en: 'Classic Burgers',
            name_fr: 'Burgers Classiques',
            products: [
              {
                product_id: '',
                name_tr: 'Klasik Burger',
                name_en: 'Classic Burger',
                name_fr: 'Burger Classique',
                description_tr: 'Taze et köftesi, marul, domates, soğan ve özel sos ile hazırlanan klasik lezzet',
                description_en: 'Classic flavor prepared with fresh beef patty, lettuce, tomato, onion and special sauce',
                description_fr: 'Saveur classique préparée avec galette de bœuf fraîche, laitue, tomate, oignon et sauce spéciale',
                price: Math.round(9.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Coca Cola', 'French Fries'],
                variants: [
                  { name: 'Tekli', price_modifier: 0 },
                  { name: 'Çiftli', price_modifier: 4.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Cheeseburger',
                name_en: 'Cheeseburger',
                name_fr: 'Cheeseburger',
                description_tr: 'Et köftesi, erimiş kaşar peyniri, marul, domates ve soğan ile hazırlanan zengin burger',
                description_en: 'Rich burger prepared with beef patty, melted cheddar cheese, lettuce, tomato and onion',
                description_fr: 'Burger riche préparé avec galette de bœuf, fromage cheddar fondu, laitue, tomate et oignon',
                price: Math.round(11.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Coca Cola', 'French Fries', 'Onion Rings'],
                variants: [
                  { name: 'Tekli', price_modifier: 0 },
                  { name: 'Çiftli', price_modifier: 4.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Bacon Burger',
                name_en: 'Bacon Burger',
                name_fr: 'Burger au Bacon',
                description_tr: 'Çıtır bacon, et köftesi, kaşar peyniri, marul ve domates ile hazırlanan lezzetli burger',
                description_en: 'Delicious burger prepared with crispy bacon, beef patty, cheddar cheese, lettuce and tomato',
                description_fr: 'Burger délicieux préparé avec bacon croustillant, galette de bœuf, fromage cheddar, laitue et tomate',
                price: Math.round(13.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Coca Cola', 'French Fries'],
                variants: [
                  { name: 'Tekli', price_modifier: 0 },
                  { name: 'Çiftli', price_modifier: 4.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
              {
                product_id: '',
                name_tr: 'Tavuk Burger',
                name_en: 'Chicken Burger',
                name_fr: 'Burger au Poulet',
                description_tr: 'Izgara tavuk göğsü, marul, domates ve özel mayonez ile hazırlanan hafif seçenek',
                description_en: 'Light option prepared with grilled chicken breast, lettuce, tomato and special mayonnaise',
                description_fr: 'Option légère préparée avec poitrine de poulet grillée, laitue, tomate et mayonnaise spéciale',
                price: Math.round(10.99 * priceMultiplier * 100) / 100,
                tags: ['healthy'],
                upsell: ['Coca Cola', 'French Fries'],
                variants: [
                  { name: 'Tekli', price_modifier: 0 },
                  { name: 'Çiftli', price_modifier: 4.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
            ],
          },
        ],
      }),
      cafe: () => ({
        menu_id: '',
        categories: [
          {
            id: 'cat_coffee_hot',
            name_tr: 'Sıcak İçecekler',
            name_en: 'Hot Beverages',
            name_fr: 'Boissons Chaudes',
            products: [
              {
                product_id: '',
                name_tr: 'Espresso',
                name_en: 'Espresso',
                name_fr: 'Espresso',
                description_tr: 'Yoğun ve aromalı, İtalyan usulü hazırlanmış özel kahve',
                description_en: 'Intense and aromatic, specially prepared Italian-style coffee',
                description_fr: 'Café intense et aromatique, préparé spécialement à l\'italienne',
                price: Math.round(4.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Croissant', 'Cookie'],
                variants: [
                  { name: 'Tek', price_modifier: 0 },
                  { name: 'Çift', price_modifier: 1.5 },
                ],
                time_slots: ['breakfast', 'lunch'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Cappuccino',
                name_en: 'Cappuccino',
                name_fr: 'Cappuccino',
                description_tr: 'Espresso, buğulanmış süt ve süt köpüğü ile hazırlanan dengeli lezzet',
                description_en: 'Balanced flavor prepared with espresso, steamed milk and milk foam',
                description_fr: 'Saveur équilibrée préparée avec espresso, lait cuit à la vapeur et mousse de lait',
                price: Math.round(5.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Croissant', 'Cookie', 'Muffin'],
                variants: [
                  { name: 'Küçük', price_modifier: -1.0 },
                  { name: 'Büyük', price_modifier: 1.5 },
                ],
                time_slots: ['breakfast', 'lunch'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Latte',
                name_en: 'Latte',
                name_fr: 'Latte',
                description_tr: 'Espresso ve buğulanmış süt ile hazırlanan yumuşak ve kremsi içecek',
                description_en: 'Soft and creamy beverage prepared with espresso and steamed milk',
                description_fr: 'Boisson douce et crémeuse préparée avec espresso et lait cuit à la vapeur',
                price: Math.round(6.99 * priceMultiplier * 100) / 100,
                tags: [],
                upsell: ['Croissant', 'Cookie'],
                variants: [
                  { name: 'Küçük', price_modifier: -1.0 },
                  { name: 'Büyük', price_modifier: 1.5 },
                ],
                time_slots: ['breakfast', 'lunch'],
                tv_featured: false,
              },
              {
                product_id: '',
                name_tr: 'Americano',
                name_en: 'Americano',
                name_fr: 'Americano',
                description_tr: 'Espresso ve sıcak su ile hazırlanan hafif ve dengeli kahve',
                description_en: 'Light and balanced coffee prepared with espresso and hot water',
                description_fr: 'Café léger et équilibré préparé avec espresso et eau chaude',
                price: Math.round(4.99 * priceMultiplier * 100) / 100,
                tags: [],
                upsell: ['Croissant'],
                variants: [
                  { name: 'Küçük', price_modifier: 0 },
                  { name: 'Büyük', price_modifier: 1.0 },
                ],
                time_slots: ['breakfast', 'lunch'],
                tv_featured: false,
              },
            ],
          },
          {
            id: 'cat_coffee_cold',
            name_tr: 'Soğuk İçecekler',
            name_en: 'Cold Beverages',
            name_fr: 'Boissons Froides',
            products: [
              {
                product_id: '',
                name_tr: 'Iced Coffee',
                name_en: 'Iced Coffee',
                name_fr: 'Café Glacé',
                description_tr: 'Soğuk kahve, buz ve süt ile hazırlanan ferahlatıcı içecek',
                description_en: 'Refreshing beverage prepared with cold coffee, ice and milk',
                description_fr: 'Boisson rafraîchissante préparée avec café froid, glace et lait',
                price: Math.round(6.99 * priceMultiplier * 100) / 100,
                tags: [],
                upsell: ['Cookie', 'Sandwich'],
                variants: [
                  { name: 'Küçük', price_modifier: -1.0 },
                  { name: 'Büyük', price_modifier: 1.5 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
              {
                product_id: '',
                name_tr: 'Frappé',
                name_en: 'Frappé',
                name_fr: 'Frappé',
                description_tr: 'Kahve, süt, buz ve şeker ile hazırlanan köpüklü soğuk içecek',
                description_en: 'Foamy cold beverage prepared with coffee, milk, ice and sugar',
                description_fr: 'Boisson froide mousseuse préparée avec café, lait, glace et sucre',
                price: Math.round(7.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Cookie', 'Sandwich'],
                variants: [
                  { name: 'Küçük', price_modifier: -1.0 },
                  { name: 'Büyük', price_modifier: 1.5 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
            ],
          },
        ],
      }),
      bakery: () => ({
        menu_id: '',
        categories: [
          {
            id: 'cat_bread',
            name_tr: 'Ekmekler',
            name_en: 'Breads',
            name_fr: 'Pains',
            products: [
              {
                product_id: '',
                name_tr: 'Tam Buğday Ekmeği',
                name_en: 'Whole Wheat Bread',
                name_fr: 'Pain de Blé Entier',
                description_tr: 'Tam buğday unu ve doğal maya ile hazırlanan sağlıklı ve besleyici ekmek',
                description_en: 'Healthy and nutritious bread prepared with whole wheat flour and natural yeast',
                description_fr: 'Pain sain et nutritif préparé avec farine de blé entier et levure naturelle',
                price: Math.round(3.99 * priceMultiplier * 100) / 100,
                tags: ['healthy', 'bestseller'],
                upsell: ['Butter', 'Jam'],
                variants: [
                  { name: 'Yarım', price_modifier: -1.5 },
                  { name: 'Tam', price_modifier: 0 },
                ],
                time_slots: ['breakfast'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Beyaz Ekmek',
                name_en: 'White Bread',
                name_fr: 'Pain Blanc',
                description_tr: 'Beyaz un ile taze pişmiş, yumuşak ve lezzetli klasik ekmek',
                description_en: 'Classic bread freshly baked with white flour, soft and delicious',
                description_fr: 'Pain classique fraîchement cuit avec farine blanche, doux et délicieux',
                price: Math.round(2.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Butter', 'Jam'],
                variants: [
                  { name: 'Yarım', price_modifier: -1.5 },
                  { name: 'Tam', price_modifier: 0 },
                ],
                time_slots: ['breakfast'],
                tv_featured: false,
              },
              {
                product_id: '',
                name_tr: 'Çavdar Ekmeği',
                name_en: 'Rye Bread',
                name_fr: 'Pain de Seigle',
                description_tr: 'Çavdar unu ve özel karışım ile hazırlanan aromalı ve doyurucu ekmek',
                description_en: 'Aromatic and filling bread prepared with rye flour and special blend',
                description_fr: 'Pain aromatique et rassasiant préparé avec farine de seigle et mélange spécial',
                price: Math.round(4.99 * priceMultiplier * 100) / 100,
                tags: ['healthy'],
                upsell: ['Butter', 'Cheese'],
                variants: [
                  { name: 'Yarım', price_modifier: -1.5 },
                  { name: 'Tam', price_modifier: 0 },
                ],
                time_slots: ['breakfast'],
                tv_featured: false,
              },
            ],
          },
          {
            id: 'cat_pastry',
            name_tr: 'Pastalar',
            name_en: 'Pastries',
            name_fr: 'Pâtisseries',
            products: [
              {
                product_id: '',
                name_tr: 'Çikolatalı Pasta',
                name_en: 'Chocolate Cake',
                name_fr: 'Gâteau au Chocolat',
                description_tr: 'Zengin çikolata kreması ve taze çilek ile hazırlanan nefis pasta',
                description_en: 'Delicious cake prepared with rich chocolate cream and fresh strawberries',
                description_fr: 'Gâteau délicieux préparé avec crème au chocolat riche et fraises fraîches',
                price: Math.round(12.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Coffee', 'Tea'],
                variants: [
                  { name: '1 Dilim', price_modifier: 0 },
                  { name: '2 Dilim', price_modifier: 12.99 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Cheesecake',
                name_en: 'Cheesecake',
                name_fr: 'Cheesecake',
                description_tr: 'Krem peynir ve bisküvi tabanı ile hazırlanan klasik ve lezzetli tatlı',
                description_en: 'Classic and delicious dessert prepared with cream cheese and biscuit base',
                description_fr: 'Dessert classique et délicieux préparé avec fromage à la crème et base de biscuits',
                price: Math.round(11.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Coffee', 'Tea'],
                variants: [
                  { name: '1 Dilim', price_modifier: 0 },
                  { name: '2 Dilim', price_modifier: 11.99 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
            ],
          },
        ],
      }),
      restaurant: () => ({
        menu_id: '',
        categories: [
          {
            id: 'cat_main_dishes',
            name_tr: 'Ana Yemekler',
            name_en: 'Main Dishes',
            name_fr: 'Plats Principaux',
            products: [
              {
                product_id: '',
                name_tr: 'Izgara Tavuk',
                name_en: 'Grilled Chicken',
                name_fr: 'Poulet Grillé',
                description_tr: 'Tavuk göğsü, pilav ve taze salata ile servis edilen doyurucu ana yemek',
                description_en: 'Filling main course served with chicken breast, rice and fresh salad',
                description_fr: 'Plat principal copieux servi avec poitrine de poulet, riz et salade fraîche',
                price: Math.round(18.99 * priceMultiplier * 100) / 100,
                tags: ['healthy', 'bestseller'],
                upsell: ['Soup', 'Dessert'],
                variants: [
                  { name: 'Porsiyon', price_modifier: 0 },
                  { name: 'Büyük Porsiyon', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Köfte',
                name_en: 'Meatballs',
                name_fr: 'Boulettes de Viande',
                description_tr: 'Izgara köfte, patates ve taze salata ile hazırlanan geleneksel lezzet',
                description_en: 'Traditional flavor prepared with grilled meatballs, potatoes and fresh salad',
                description_fr: 'Saveur traditionnelle préparée avec boulettes de viande grillées, pommes de terre et salade fraîche',
                price: Math.round(16.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Soup', 'Dessert'],
                variants: [
                  { name: 'Porsiyon', price_modifier: 0 },
                  { name: 'Büyük Porsiyon', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
              {
                product_id: '',
                name_tr: 'Balık Tava',
                name_en: 'Fried Fish',
                name_fr: 'Poisson Frit',
                description_tr: 'Taze balık, patates ve salata ile hazırlanan deniz ürünü lezzeti',
                description_en: 'Seafood flavor prepared with fresh fish, potatoes and salad',
                description_fr: 'Saveur de fruits de mer préparée avec poisson frais, pommes de terre et salade',
                price: Math.round(22.99 * priceMultiplier * 100) / 100,
                tags: [],
                upsell: ['Soup', 'Dessert'],
                variants: [
                  { name: 'Porsiyon', price_modifier: 0 },
                  { name: 'Büyük Porsiyon', price_modifier: 5.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
            ],
          },
          {
            id: 'cat_salads',
            name_tr: 'Salatalar',
            name_en: 'Salads',
            name_fr: 'Salades',
            products: [
              {
                product_id: '',
                name_tr: 'Çoban Salata',
                name_en: 'Shepherd Salad',
                name_fr: 'Salade du Berger',
                description_tr: 'Domates, salatalık, soğan ve maydanoz ile hazırlanan taze ve hafif salata',
                description_en: 'Fresh and light salad prepared with tomatoes, cucumber, onion and parsley',
                description_fr: 'Salade fraîche et légère préparée avec tomates, concombre, oignon et persil',
                price: Math.round(8.99 * priceMultiplier * 100) / 100,
                tags: ['healthy', 'vegetarian'],
                upsell: ['Main Dish', 'Soup'],
                variants: [
                  { name: 'Küçük', price_modifier: -2.0 },
                  { name: 'Büyük', price_modifier: 3.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: false,
              },
              {
                product_id: '',
                name_tr: 'Sezar Salata',
                name_en: 'Caesar Salad',
                name_fr: 'Salade César',
                description_tr: 'Marul, tavuk, parmesan peyniri ve özel sezar sos ile hazırlanan zengin salata',
                description_en: 'Rich salad prepared with lettuce, chicken, parmesan cheese and special caesar dressing',
                description_fr: 'Salade riche préparée avec laitue, poulet, fromage parmesan et vinaigrette césar spéciale',
                price: Math.round(12.99 * priceMultiplier * 100) / 100,
                tags: ['bestseller'],
                upsell: ['Main Dish', 'Soup'],
                variants: [
                  { name: 'Küçük', price_modifier: -2.0 },
                  { name: 'Büyük', price_modifier: 3.0 },
                ],
                time_slots: ['lunch', 'dinner'],
                tv_featured: true,
              },
            ],
          },
        ],
      }),
    };

    const generator = menuData[businessType] || menuData.restaurant;
    return generator();
  }

  private getMenuLayoutPositions(): Array<{ x: number; y: number; width: number; height: number }> {
    // Special restaurant menu layout: Left panel (35%) for branding, Right panel (65%) for menu grid
    return [
      { x: 0, y: 0, width: 35, height: 100 },  // Left: Branding panel
      { x: 35, y: 0, width: 65, height: 100 },  // Right: Menu grid panel
    ];
  }

  private getBlockPositions(blockCount: number): Array<{ x: number; y: number; width: number; height: number }> {
    const positions: Record<number, Array<{ x: number; y: number; width: number; height: number }>> = {
      1: [{ x: 0, y: 0, width: 100, height: 100 }],
      2: [
        { x: 0, y: 0, width: 50, height: 100 },
        { x: 50, y: 0, width: 50, height: 100 },
      ],
      3: [
        { x: 0, y: 0, width: 33.33, height: 100 },
        { x: 33.33, y: 0, width: 33.33, height: 100 },
        { x: 66.66, y: 0, width: 33.34, height: 100 },
      ],
      4: [
        { x: 0, y: 0, width: 50, height: 50 },
        { x: 50, y: 0, width: 50, height: 50 },
        { x: 0, y: 50, width: 50, height: 50 },
        { x: 50, y: 50, width: 50, height: 50 },
      ],
      5: [
        { x: 0, y: 0, width: 50, height: 40 },
        { x: 50, y: 0, width: 50, height: 40 },
        { x: 0, y: 40, width: 33.33, height: 60 },
        { x: 33.33, y: 40, width: 33.33, height: 60 },
        { x: 66.66, y: 40, width: 33.34, height: 60 },
      ],
      6: [
        { x: 0, y: 0, width: 33.33, height: 50 },
        { x: 33.33, y: 0, width: 33.33, height: 50 },
        { x: 66.66, y: 0, width: 33.34, height: 50 },
        { x: 0, y: 50, width: 33.33, height: 50 },
        { x: 33.33, y: 50, width: 33.33, height: 50 },
        { x: 66.66, y: 50, width: 33.34, height: 50 },
      ],
    };

    return positions[blockCount] || positions[1];
  }
}
