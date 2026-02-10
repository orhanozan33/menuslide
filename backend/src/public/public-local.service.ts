import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const VIEWER_STALE_MS = 5 * 60 * 1000; // 5 dakika – TV geçici ağ/uyku kesintisinde oturum silinmesin

@Injectable()
export class PublicLocalService {
  constructor(
    private database: DatabaseService,
  ) {}

  /**
   * Yayın kodu (örn. 12345) ile display URL döndürür. TV uygulaması bu URL ile yayını açar.
   */
  async resolveStreamUrlByBroadcastCode(code: string): Promise<{ streamUrl: string } | null> {
    const trimmed = String(code || '').trim();
    if (!trimmed) return null;
    const r = await this.database.query(
      `SELECT s.public_slug, s.public_token FROM screens s
       INNER JOIN businesses b ON s.business_id = b.id AND b.is_active = true
       WHERE s.broadcast_code = $1 AND s.is_active = true`,
      [trimmed]
    );
    if (r.rows.length === 0) return null;
    const row = r.rows[0];
    const slugOrToken = row.public_slug || row.public_token;
    if (!slugOrToken) return null;
    const baseUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const streamUrl = `${baseUrl.replace(/\/$/, '')}/display/${slugOrToken}`;
    return { streamUrl };
  }

  /**
   * Token/slug ile ekran id'sini döndürür (heartbeat için hafif sorgu)
   */
  async getScreenIdByToken(publicTokenOrSlug: string): Promise<string | null> {
    let r = await this.database.query(
      `SELECT s.id FROM screens s
       INNER JOIN businesses b ON s.business_id = b.id AND b.is_active = true
       WHERE s.public_slug = $1 AND s.is_active = true`,
      [publicTokenOrSlug]
    );
    if (r.rows.length === 0) {
      r = await this.database.query(
        `SELECT s.id FROM screens s
         INNER JOIN businesses b ON s.business_id = b.id AND b.is_active = true
         WHERE s.public_token = $1 AND s.is_active = true`,
        [publicTokenOrSlug]
      );
    }
    return r.rows[0]?.id ?? null;
  }

  /**
   * Display sayfasından gelen heartbeat. İlk yayınlayan oturum korunur; diğerleri bloklanır.
   * @returns ok, allowed (allowed: sadece bu ekran için ilk açan oturum true döner)
   */
  async recordViewerHeartbeat(publicTokenOrSlug: string, sessionId: string): Promise<{ ok: boolean; allowed: boolean }> {
    const screenId = await this.getScreenIdByToken(publicTokenOrSlug);
    if (!screenId || !sessionId || sessionId.length > 64) return { ok: false, allowed: false };

    const sid = sessionId.slice(0, 64);
    await this.database.query(
      `INSERT INTO display_viewers (screen_id, session_id, last_seen_at, first_seen_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (screen_id, session_id) DO UPDATE SET last_seen_at = NOW()`,
      [screenId, sid]
    );

    const stale = new Date(Date.now() - VIEWER_STALE_MS).toISOString();
    await this.database.query(
      `DELETE FROM display_viewers WHERE last_seen_at < $1`,
      [stale]
    );

    const allowedResult = await this.database.query(
      `SELECT (SELECT first_seen_at FROM display_viewers WHERE screen_id = $1 AND session_id = $2) <= ALL(
         SELECT first_seen_at FROM display_viewers WHERE screen_id = $1 AND last_seen_at > NOW() - INTERVAL '5 minutes'
       ) AS allowed`,
      [screenId, sid]
    );
    const allowed = allowedResult.rows[0]?.allowed === true;
    return { ok: true, allowed };
  }

  /**
   * Ekran için son 5 dakikada heartbeat atan benzersiz cihaz sayısı
   */
  async getViewerCount(screenId: string): Promise<number> {
    const r = await this.database.query(
      `SELECT COUNT(*)::int AS c FROM display_viewers
       WHERE screen_id = $1 AND last_seen_at > NOW() - INTERVAL '5 minutes'`,
      [screenId]
    );
    return r.rows[0]?.c ?? 0;
  }

  /**
   * Get screen data by public token or slug (for TV display)
   * @param templateRotationIndex Optional index for template rotation (0-based)
   */
  async getScreenByToken(publicTokenOrSlug: string, templateRotationIndex?: number) {
    // Önce slug ile dene, bulunamazsa token ile dene
    // İşletme pasifse TV yayını gösterme (b.is_active = true)
    let screenResult = await this.database.query(
      `SELECT s.id, s.name, s.location, s.business_id, s.animation_type, s.animation_duration, 
       s.language_code, s.font_family, s.primary_color, s.background_style, s.background_color, 
       s.background_image_url, s.logo_url, s.template_id, s.frame_type, s.ticker_text, s.ticker_style,
       b.name as business_name
       FROM screens s
       INNER JOIN businesses b ON s.business_id = b.id AND b.is_active = true
       WHERE s.public_slug = $1 AND s.is_active = true`,
      [publicTokenOrSlug]
    );

    // Eğer slug ile bulunamadıysa, token ile dene (geriye dönük uyumluluk)
    if (screenResult.rows.length === 0) {
      screenResult = await this.database.query(
        `SELECT s.id, s.name, s.location, s.business_id, s.animation_type, s.animation_duration, 
         s.language_code, s.font_family, s.primary_color, s.background_style, s.background_color, 
         s.background_image_url, s.logo_url, s.template_id, s.frame_type, s.ticker_text, s.ticker_style,
         b.name as business_name
         FROM screens s
         INNER JOIN businesses b ON s.business_id = b.id AND b.is_active = true
         WHERE s.public_token = $1 AND s.is_active = true`,
        [publicTokenOrSlug]
      );
    }

    if (screenResult.rows.length === 0) {
      // Return 200 with notFound so frontend can show "Ekran bulunamadı" without 404 in console
      return {
        screen: null,
        notFound: true,
        menus: [],
        template: null,
        screenBlocks: [],
        blockContents: [],
      };
    }

    const screen = screenResult.rows[0];
    const languageCode = screen.language_code || 'en';

    // Get default language
    const langResult = await this.database.query(
      'SELECT code FROM languages WHERE is_default = true AND is_active = true LIMIT 1'
    );
    const activeLanguageCode = languageCode || langResult.rows[0]?.code || 'en';

    // Determine active menu based on current time
    const menuResult = await this.database.query(
      'SELECT get_active_menu_for_screen($1) as menu_id',
      [screen.id]
    );

    let activeMenuId = menuResult.rows[0]?.menu_id;

    if (!activeMenuId) {
      // Fallback: get first assigned menu
      const fallbackResult = await this.database.query(
        'SELECT menu_id FROM screen_menu WHERE screen_id = $1 ORDER BY display_order ASC LIMIT 1',
        [screen.id]
      );

      if (fallbackResult.rows.length > 0) {
        activeMenuId = fallbackResult.rows[0].menu_id;
      }
      // When no menu is assigned, do not return early: still load template/rotations
      // so the display can show the template even without menus.
    }

    // Get active menu with items (only when a menu is assigned)
    const activeMenu = activeMenuId
      ? await this.getMenuWithItems(activeMenuId, activeLanguageCode)
      : null;

    // Get schedules
    const schedulesResult = await this.database.query(
      `SELECT menu_id, start_time, end_time, day_of_week 
       FROM menu_schedules 
       WHERE screen_id = $1 AND is_active = true`,
      [screen.id]
    );

    // Check for template rotations first
    const rotationsResult = await this.database.query(
      `SELECT 
        str.template_id,
        str.display_duration,
        str.display_order,
        t.display_name as template_name,
        t.block_count
      FROM screen_template_rotations str
      INNER JOIN templates t ON str.template_id = t.id
      WHERE str.screen_id = $1 AND str.is_active = true
      ORDER BY str.display_order ASC`,
      [screen.id]
    );

    const templateRotations = rotationsResult.rows;

    // Load template and blocks if template_id exists or if rotations exist
    let template = null;
    let screenBlocks = [];
    let blockContents = [];
    let currentTemplateId = screen.template_id;

    if (screen.template_id) {
      // Get template with blocks
      const templateResult = await this.database.query(
        `SELECT 
          t.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', tb.id,
                'block_index', tb.block_index,
                'position_x', tb.position_x,
                'position_y', tb.position_y,
                'width', tb.width,
                'height', tb.height
              ) ORDER BY tb.block_index
            ) FILTER (WHERE tb.id IS NOT NULL),
            '[]'::json
          ) as blocks
        FROM templates t
        LEFT JOIN template_blocks tb ON t.id = tb.template_id
        WHERE t.id = $1
        GROUP BY t.id`,
        [screen.template_id]
      );

      if (templateResult.rows.length > 0) {
        template = templateResult.rows[0];

        // Get screen blocks: layout (position/size) şablondan — admin blok birleştirdiyse template_blocks güncel, screen_blocks eski kalabilir
        const screenBlocksResult = await this.database.query(
          `SELECT 
            sb.*,
            tb.block_index,
            COALESCE(tb.position_x, sb.position_x) as position_x,
            COALESCE(tb.position_y, sb.position_y) as position_y,
            COALESCE(tb.width, sb.width) as width,
            COALESCE(tb.height, sb.height) as height,
            COALESCE(sb.z_index, 0) as z_index,
            COALESCE(sb.animation_type, 'fade') as animation_type,
            COALESCE(sb.animation_duration, 500) as animation_duration,
            COALESCE(sb.animation_delay, 0) as animation_delay
          FROM screen_blocks sb
          INNER JOIN template_blocks tb ON sb.template_block_id = tb.id
          WHERE sb.screen_id = $1 AND sb.is_active = true
          ORDER BY COALESCE(sb.z_index, 0) ASC, tb.block_index ASC`,
          [screen.id]
        );

        screenBlocks = screenBlocksResult.rows;

        // Get block contents: first from screen_block_contents, fallback to template_block_contents
        if (screenBlocks.length > 0) {
          const blockIds = screenBlocks.map((b: any) => b.id);
          const contentsResult = await this.database.query(
            `SELECT * FROM screen_block_contents 
             WHERE screen_block_id = ANY($1::uuid[]) 
             AND is_active = true
             ORDER BY display_order ASC, created_at ASC`,
            [blockIds]
          );

          blockContents = contentsResult.rows;

          // Fallback: if no screen_block_contents, use template_block_contents (user edits template, not screen)
          if (blockContents.length === 0) {
            const templateBlockIds = screenBlocks.map((b: any) => b.template_block_id).filter(Boolean);
            if (templateBlockIds.length > 0) {
              const tbcResult = await this.database.query(
                `SELECT tbc.*, tbc.template_block_id
                 FROM template_block_contents tbc
                 WHERE tbc.template_block_id = ANY($1::uuid[])
                 AND tbc.is_active = true
                 ORDER BY tbc.display_order ASC, tbc.created_at ASC`,
                [templateBlockIds]
              );
              // Map to screen_block_contents format: set screen_block_id for frontend grouping
              const sbByTb = new Map(screenBlocks.map((sb: any) => [sb.template_block_id, sb]));
              blockContents = (tbcResult.rows || []).map((c: any) => ({
                ...c,
                screen_block_id: sbByTb.get(c.template_block_id)?.id ?? c.template_block_id,
              }));
            }
          }

          // Batch load menu items (scale: 1–2 queries instead of N)
          await this.loadBlockContentsMenuItemsBatch(
            blockContents,
            activeLanguageCode,
            activeMenuId,
            screen,
            template,
          );
        }
      }
    }

    // If template rotations exist, use specified index or first one as current template
    if (templateRotations.length > 0) {
      const rotationIndex = templateRotationIndex !== undefined && templateRotationIndex >= 0 && templateRotationIndex < templateRotations.length
        ? templateRotationIndex
        : 0;
      currentTemplateId = templateRotations[rotationIndex].template_id;
      
      // Load first template in rotation
      const firstTemplateResult = await this.database.query(
        `SELECT 
          t.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', tb.id,
                'block_index', tb.block_index,
                'position_x', tb.position_x,
                'position_y', tb.position_y,
                'width', tb.width,
                'height', tb.height
              ) ORDER BY tb.block_index
            ) FILTER (WHERE tb.id IS NOT NULL),
            '[]'::json
          ) as blocks
        FROM templates t
        LEFT JOIN template_blocks tb ON t.id = tb.template_id
        WHERE t.id = $1
        GROUP BY t.id`,
        [currentTemplateId]
      );

      if (firstTemplateResult.rows.length > 0) {
        template = firstTemplateResult.rows[0];

        // For template rotation, get blocks directly from template_blocks (not screen_blocks)
        // This allows us to switch between templates without recreating screen_blocks
        const templateBlocksResult = await this.database.query(
          `SELECT 
            tb.id as template_block_id,
            tb.block_index,
            tb.position_x,
            tb.position_y,
            tb.width,
            tb.height,
            0 as z_index,
            'fade' as animation_type,
            500 as animation_duration,
            0 as animation_delay
          FROM template_blocks tb
          WHERE tb.template_id = $1
          ORDER BY tb.block_index ASC`,
          [currentTemplateId]
        );

        // Convert template blocks to screen blocks format
        screenBlocks = templateBlocksResult.rows.map((tb: any) => ({
          id: tb.template_block_id, // Use template_block_id as id for lookup
          template_block_id: tb.template_block_id,
          block_index: tb.block_index,
          position_x: tb.position_x,
          position_y: tb.position_y,
          width: tb.width,
          height: tb.height,
          z_index: tb.z_index,
          animation_type: tb.animation_type,
          animation_duration: tb.animation_duration,
          animation_delay: tb.animation_delay,
        }));

        // Get block contents for template rotation
        // For rotation, we need to get contents from template_block_contents
        if (screenBlocks.length > 0) {
          const templateBlockIds = screenBlocks.map((b: any) => b.template_block_id);
          
          // Get contents from template_block_contents (not screen_block_contents for rotation)
          const contentsResult = await this.database.query(
            `SELECT 
              tbc.*,
              tbc.id as content_id,
              tb.id as template_block_id
            FROM template_block_contents tbc
            INNER JOIN template_blocks tb ON tbc.template_block_id = tb.id
            WHERE tb.id = ANY($1::uuid[]) 
            AND tbc.is_active = true
            ORDER BY tbc.display_order ASC, tbc.created_at ASC`,
            [templateBlockIds]
          );

          // Convert template_block_contents to screen_block_contents format
          blockContents = contentsResult.rows.map((content: any) => ({
            ...content,
            id: content.content_id,
            screen_block_id: content.template_block_id, // Use template_block_id for reference in frontend
          }));

          // Batch load menu items (scale: 1–2 queries instead of N)
          await this.loadBlockContentsMenuItemsBatch(
            blockContents,
            activeLanguageCode,
            activeMenuId,
            screen,
            template,
          );
        }
      }
    }

    return {
      screen: {
        id: screen.id,
        name: screen.name,
        location: screen.location,
        animation_type: screen.animation_type || 'fade',
        animation_duration: screen.animation_duration || 500,
        language_code: activeLanguageCode,
        font_family: screen.font_family || 'system-ui',
        primary_color: screen.primary_color || '#fbbf24',
        background_style: screen.background_style || 'gradient',
        background_color: screen.background_color || '#0f172a',
        background_image_url: screen.background_image_url,
        logo_url: screen.logo_url,
        template_id: currentTemplateId,
        business_name: screen.business_name || null,
        frame_type: (screen.frame_type != null ? screen.frame_type : 'none') || 'none',
        ticker_text: (screen.ticker_text != null ? screen.ticker_text : '') || '',
        ticker_style: screen.ticker_style || 'default',
      },
      menus: activeMenu ? [activeMenu] : [],
      schedules: schedulesResult.rows || [],
      template,
      screenBlocks,
      blockContents,
      templateRotations: templateRotations.length > 0 ? templateRotations : undefined,
    };
  }

  /**
   * Batch load menu_item and menu_items for block contents (single_product, product_list).
   * Replaces N+1 queries with 2–4 queries total for scale.
   */
  private async loadBlockContentsMenuItemsBatch(
    blockContents: any[],
    activeLanguageCode: string,
    activeMenuId: string | null,
    screen: any,
    template: any,
  ): Promise<void> {
    const singleProductIds = blockContents
      .filter((c) => c.content_type === 'single_product' && c.menu_item_id)
      .map((c) => c.menu_item_id);
    if (singleProductIds.length > 0) {
      const itemResult = await this.database.query(
        `SELECT mi.*, 
         COALESCE(mit.name, mi.name) as name,
         COALESCE(mit.description, mi.description) as description
         FROM menu_items mi
         LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id 
           AND mit.language_code = $1
         WHERE mi.id = ANY($2::uuid[]) AND mi.is_active = true`,
        [activeLanguageCode, singleProductIds],
      );
      const byId = new Map(itemResult.rows.map((r: any) => [r.id, r]));
      for (const content of blockContents) {
        if (content.content_type === 'single_product' && content.menu_item_id) {
          const item = byId.get(content.menu_item_id);
          if (item) content.menu_item = item;
        }
      }
    }

    const productListContents = blockContents.filter((c) => c.content_type === 'product_list');
    if (productListContents.length === 0) return;

    let fallbackMenuId: string | null | undefined = undefined; // not yet fetched
    const menuIdsToLoad = new Set<string>();
    for (const content of productListContents) {
      let menuId = content.menu_id || activeMenuId;
      if (!menuId && template && screen.business_id) {
        if (fallbackMenuId === undefined) {
          const fallback = await this.database.query(
            'SELECT id FROM menus WHERE business_id = $1 AND name = $2 AND is_active = true LIMIT 1',
            [screen.business_id, `${template.display_name} Menüsü`],
          );
          fallbackMenuId = fallback.rows[0]?.id ?? null;
        }
        menuId = fallbackMenuId ?? undefined;
      }
      if (menuId) menuIdsToLoad.add(menuId);
    }
    if (menuIdsToLoad.size === 0) return;

    const itemsResult = await this.database.query(
      `SELECT mi.*,
       COALESCE(mit.name, mi.name) as name,
       COALESCE(mit.description, mi.description) as description
       FROM menu_items mi
       LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id 
         AND mit.language_code = $1
       WHERE mi.menu_id = ANY($2::uuid[]) AND mi.is_active = true
       ORDER BY mi.menu_id, mi.display_order ASC`,
      [activeLanguageCode, Array.from(menuIdsToLoad)],
    );
    const byMenuId = new Map<string, any[]>();
    for (const row of itemsResult.rows) {
      const list = byMenuId.get(row.menu_id) ?? [];
      list.push(row);
      byMenuId.set(row.menu_id, list);
    }
    for (const content of productListContents) {
      let menuId = content.menu_id || activeMenuId;
      if (!menuId && template && screen.business_id) menuId = fallbackMenuId ?? undefined;
      content.menu_items = menuId ? (byMenuId.get(menuId) ?? []) : [];
    }
  }

  /**
   * Get menu with items and translations
   * Made public for use by PublicService
   */
  async getMenuWithItems(menuId: string, languageCode: string) {
    const menuResult = await this.database.query(
      'SELECT id, name, description, slide_duration, is_active FROM menus WHERE id = $1 AND is_active = true',
      [menuId]
    );

    if (menuResult.rows.length === 0) {
      return null;
    }

    const menu = menuResult.rows[0];

    // Get menu items
    const itemsResult = await this.database.query(
      'SELECT * FROM menu_items WHERE menu_id = $1 AND is_active = true ORDER BY display_order ASC',
      [menuId]
    );

    const items = itemsResult.rows;

    if (items.length === 0) {
      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        slide_duration: menu.slide_duration || 5,
        items: [],
      };
    }

    // Get translations
    const itemIds = items.map((item: any) => item.id);
    const translationsResult = await this.database.query(
      'SELECT * FROM menu_item_translations WHERE menu_item_id = ANY($1) AND language_code = $2',
      [itemIds, languageCode]
    );

    const translations = translationsResult.rows;

    // Merge translations with items
    const itemsWithTranslations = items.map((item: any) => {
      const translation = translations.find((t: any) => t.menu_item_id === item.id);
      return {
        ...item,
        name: translation?.name || item.name,
        description: translation?.description || item.description,
      };
    });

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      slide_duration: menu.slide_duration || 5,
      items: itemsWithTranslations,
    };
  }
}
