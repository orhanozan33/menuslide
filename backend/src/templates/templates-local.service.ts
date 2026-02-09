import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateSystemTemplatesDto } from './dto/create-system-templates.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SaveTemplateFromScreenDto } from './dto/save-template-from-screen.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { DuplicateTemplateDto } from './dto/duplicate-template.dto';
import { SaveAsTemplateDto } from './dto/save-as-template.dto';
import { SaveCanvasAsTemplateDto } from './dto/save-canvas-as-template.dto';

@Injectable()
export class TemplatesLocalService {
  constructor(private database: DatabaseService) {}

  async findAll(userId?: string, userRole?: string) {
    let query = 'SELECT * FROM templates WHERE is_active = true';
    const params: any[] = [];

    if (userRole === 'super_admin' || userRole === 'admin') {
      if (userId != null && String(userId).trim() !== '') {
        query += ' AND created_by = $1';
        params.push(String(userId).trim());
      }
    } else {
      if (userId) {
        query += ' AND created_by = $1 AND (scope IS NULL OR scope != \'system\')';
        params.push(userId);
      } else {
        return [];
      }
    }

    query += ' ORDER BY block_count ASC, name ASC';

    try {
      const result = await this.database.query(query, params);
      return result.rows;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if ((msg.includes('scope') || msg.includes('created_by')) && (msg.includes('does not exist') || msg.includes('column'))) {
        return this.findAllFallback(userId, userRole);
      }
      throw err;
    }
  }

  private async findAllFallback(userId?: string, userRole?: string) {
    if (userRole === 'super_admin' || userRole === 'admin') {
      const result = await this.database.query(
        'SELECT * FROM templates WHERE is_active = true ORDER BY block_count ASC, name ASC'
      );
      return result.rows;
    }
    if (!userId) return [];
    const result = await this.database.query(
      'SELECT * FROM templates WHERE is_active = true AND (is_system = false OR is_system IS NULL) ORDER BY block_count ASC, name ASC'
    );
    return result.rows;
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const result = await this.database.query(
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
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Template not found');
    }

    const template = result.rows[0];

    // Normal kullanıcılar: kendi template'lerini veya sistem (admin) template'lerini okuyabilir
    if (userRole !== 'super_admin' && userRole !== 'admin' && userId) {
      const isOwner = template.created_by != null && String(template.created_by).toLowerCase() === String(userId).toLowerCase();
      const isSystem = template.scope === 'system';
      if (!isOwner && !isSystem) {
        throw new ForbiddenException('Access denied to this template');
      }
    }

    return template;
  }

  async create(createTemplateDto: CreateTemplateDto, userId: string, userRole?: string) {
    // Admin başka bir kullanıcı adına template oluşturabilir
    const targetUserId = (userRole === 'super_admin' || userRole === 'admin') && createTemplateDto.target_user_id
      ? createTemplateDto.target_user_id
      : userId;

    // Ensure constraint allows up to 16 blocks (update if needed)
    try {
      await this.database.query(`
        DO $$
        BEGIN
          -- Drop existing constraint if it exists
          IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'templates_block_count_check'
          ) THEN
            ALTER TABLE templates DROP CONSTRAINT templates_block_count_check;
          END IF;
          
          -- Add new constraint allowing up to 16 blocks
          ALTER TABLE templates ADD CONSTRAINT templates_block_count_check 
            CHECK (block_count >= 1 AND block_count <= 16);
        EXCEPTION
          WHEN OTHERS THEN
            -- Constraint might already exist with correct values, ignore
            NULL;
        END $$;
      `);
    } catch (error) {
      // If constraint update fails, try to continue anyway
      console.warn('Could not update block_count constraint:', error);
    }

    const result = await this.database.query(
      `INSERT INTO templates (name, display_name, description, block_count, preview_image_url, is_active, scope, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        createTemplateDto.name,
        createTemplateDto.display_name,
        createTemplateDto.description || null,
        createTemplateDto.block_count,
        createTemplateDto.preview_image_url || null,
        createTemplateDto.is_active ?? true,
        'user', // Kullanıcı tarafından oluşturulan template'ler
        targetUserId,
      ]
    );

    const template = result.rows[0];

    // Otomatik olarak blokları oluştur
    await this.createTemplateBlocks(template.id, template.block_count);

    return template;
  }

  /**
   * Save canvas design from editor as template.
   * Admin: scope=system (all users) or scope=user + target_user_id (specific user).
   * Normal user: scope=user only, saves to own templates (Benim şablonlarım).
   */
  async saveCanvasAsTemplate(dto: SaveCanvasAsTemplateDto, userId: string, userRole?: string) {
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';

    if (dto.scope === 'system' && !isAdmin) {
      throw new ForbiddenException('Sadece admin sistem şablonu oluşturabilir');
    }
    if (dto.scope === 'user' && isAdmin && dto.target_user_id) {
      // Admin saves for specific user
    } else if (dto.scope === 'user' && !isAdmin) {
      // Normal user saves for self - target_user_id ignored
    } else if (dto.scope === 'system') {
      // Admin saves as system template
    }

    const layoutToBlockCount: Record<string, number> = {
      full: 1, '2block': 2, '3block': 3, '4block': 4, '5block': 5, '6block': 6,
    };
    const blockCount = layoutToBlockCount[dto.layoutType] ?? 1;

    const scope = dto.scope;
    const targetUserId =
      scope === 'system' ? userId : scope === 'user' && isAdmin && dto.target_user_id ? dto.target_user_id : userId;
    const isSystem = scope === 'system';

    const uniqueName = `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const canvasDesign = JSON.stringify({
      shapes: dto.shapes,
      backgroundColor: dto.backgroundColor,
      layoutType: dto.layoutType,
      designWidth: dto.designWidth ?? 800,
      designHeight: dto.designHeight ?? 450,
    });

    const result = await this.database.query(
      `INSERT INTO templates (name, display_name, description, block_count, preview_image_url, is_active, scope, created_by, is_system, canvas_design)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9::jsonb)
       RETURNING *`,
      [uniqueName, dto.display_name, dto.description || null, blockCount, dto.preview_image_url || null, scope, targetUserId, isSystem, canvasDesign]
    );

    const template = result.rows[0];
    await this.createTemplateBlocks(template.id, blockCount);
    return this.findOne(template.id, userId, userRole);
  }

  /**
   * Admin/super_admin: Toplu sistem şablonu oluşturur (Sistem Şablonları'nda kullanıcılara sunulur).
   */
  async createSystemTemplates(dto: CreateSystemTemplatesDto, userId: string, userRole?: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Sadece admin veya super_admin sistem şablonu oluşturabilir');
    }
    const countPerType = dto.count_per_type ?? 1;
    const created: any[] = [];
    const uniq = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const mergeOptions = dto.merge_options ?? {};
    for (const blockCount of dto.block_counts) {
      if (blockCount < 1 || blockCount > 16) continue;
      const validMerges = ['left', 'middle', 'middle_left', 'middle_right', 'middle_2_as_one', 'right'];
      const mergesRaw = mergeOptions[blockCount] ?? mergeOptions[String(blockCount) as unknown as number];
      const merges = Array.isArray(mergesRaw)
        ? (mergesRaw as string[]).filter((m) => validMerges.includes(m))
        : undefined;
      for (let n = 0; n < countPerType; n++) {
        const suffix = countPerType > 1 ? ` ${n + 1}` : '';
        const name = `system-${blockCount}-block-${uniq}-${n}`;
        const displayName = `${blockCount} bloklu şablon${suffix}`.trim();
        const description = `${blockCount} kare (grid) düzen. Sistem şablonu.`;
        try {
          const result = await this.database.query(
            `INSERT INTO templates (name, display_name, description, block_count, preview_image_url, is_active, scope, created_by, is_system)
             VALUES ($1, $2, $3, $4, NULL, true, 'system', $5, true)
             RETURNING *`,
            [name, displayName, description, blockCount, userId]
          );
          const template = result.rows[0];
          await this.createTemplateBlocks(template.id, blockCount, merges);
          created.push(template);
        } catch (err: any) {
          if (err?.code === '42703') {
            const result = await this.database.query(
              `INSERT INTO templates (name, display_name, description, block_count, preview_image_url, is_active, scope, created_by)
               VALUES ($1, $2, $3, $4, NULL, true, 'system', $5)
               RETURNING *`,
              [name, displayName, description, blockCount, userId]
            );
            const template = result.rows[0];
            await this.createTemplateBlocks(template.id, blockCount, merges);
            created.push(template);
          } else {
            throw err;
          }
        }
      }
    }
    return { created, count: created.length };
  }

  private getGridLayout(blockCount: number): { cols: number; rows: number; special: number[] } {
    if (blockCount <= 1) return { cols: 1, rows: 1, special: [] };
    if (blockCount === 2) return { cols: 2, rows: 1, special: [] };
    if (blockCount === 3) return { cols: 2, rows: 2, special: [2] };
    if (blockCount === 4) return { cols: 2, rows: 2, special: [] };
    if (blockCount === 5) return { cols: 3, rows: 2, special: [2] };
    if (blockCount === 6) return { cols: 3, rows: 2, special: [] };
    if (blockCount === 7) return { cols: 4, rows: 2, special: [6] };
    if (blockCount === 8) return { cols: 4, rows: 2, special: [] };
    if (blockCount === 9) return { cols: 3, rows: 3, special: [] };
    if (blockCount === 12) return { cols: 4, rows: 3, special: [] };
    if (blockCount === 16) return { cols: 4, rows: 4, special: [] };
    const c = Math.ceil(Math.sqrt(blockCount));
    return { cols: c, rows: Math.ceil(blockCount / c), special: [] };
  }

  private async createTemplateBlocks(templateId: string, blockCount: number, merges?: string[]) {
    const { cols, rows } = this.getGridLayout(blockCount);
    const cellW = 100 / cols;
    const cellH = 100 / rows;

    const blocks: Array<{ template_id: string; block_index: number; position_x: number; position_y: number; width: number; height: number; style_config: string }> = [];
    const midCol = cols >= 3 ? Math.floor(cols / 2) : -1;
    const mergeList = Array.isArray(merges) ? merges.filter((m) => ['left', 'middle', 'middle_left', 'middle_right', 'middle_2_as_one', 'right'].includes(m)) : [];
    const midColLeft = cols >= 4 ? Math.floor(cols / 2) - 1 : -1;
    const middle2AsOne = cols >= 4 && mergeList.includes('middle_2_as_one');

    if (mergeList.length > 0 && cols >= 2) {
      const isMergeCol = (col: number) =>
        (mergeList.includes('left') && col === 0) ||
        (mergeList.includes('right') && col === cols - 1) ||
        (!middle2AsOne && mergeList.includes('middle') && col === midCol) ||
        (!middle2AsOne && mergeList.includes('middle_left') && col === midColLeft) ||
        (!middle2AsOne && mergeList.includes('middle_right') && col === midCol);
      let idx = 0;
      for (let col = 0; col < cols; col++) {
        if (middle2AsOne && col === midColLeft) {
          blocks.push({
            template_id: templateId,
            block_index: idx++,
            position_x: midColLeft * cellW,
            position_y: 0,
            width: 2 * cellW,
            height: 100,
            style_config: JSON.stringify({ background_color: '#ffffff', text_color: '#000000' }),
          });
        } else if (middle2AsOne && col === midCol) {
          continue;
        } else if (isMergeCol(col)) {
          blocks.push({
            template_id: templateId,
            block_index: idx++,
            position_x: col * cellW,
            position_y: 0,
            width: cellW,
            height: 100,
            style_config: JSON.stringify({ background_color: '#ffffff', text_color: '#000000' }),
          });
        } else {
          for (let row = 0; row < rows; row++) {
            blocks.push({
              template_id: templateId,
              block_index: idx++,
              position_x: col * cellW,
              position_y: row * cellH,
              width: cellW,
              height: cellH,
              style_config: JSON.stringify({ background_color: '#ffffff', text_color: '#000000' }),
            });
          }
        }
      }
    } else {
      const { cols, rows } = this.getGridLayout(blockCount);
      const blockWidth = 100 / cols;
      const blockHeight = 100 / rows;
      for (let i = 0; i < blockCount; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        blocks.push({
          template_id: templateId,
          block_index: i,
          position_x: col * blockWidth,
          position_y: row * blockHeight,
          width: blockWidth,
          height: blockHeight,
          style_config: JSON.stringify({ background_color: '#ffffff', text_color: '#000000' }),
        });
      }
    }

    const finalBlockCount = blocks.length;
    await this.database.query(`UPDATE templates SET block_count = $1 WHERE id = $2`, [finalBlockCount, templateId]);

    // Toplu insert
    for (const block of blocks) {
      await this.database.query(
        `INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height, style_config)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          block.template_id,
          block.block_index,
          block.position_x,
          block.position_y,
          block.width,
          block.height,
          block.style_config,
        ]
      );
    }
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto, userId?: string, userRole?: string) {
    // Önce template'i kontrol et ve erişim izni ver
    const template = await this.findOne(id, userId, userRole);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateTemplateDto.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(updateTemplateDto.display_name);
    }

    if (updateTemplateDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateTemplateDto.description);
    }

    if (updateTemplateDto.preview_image_url !== undefined) {
      updates.push(`preview_image_url = $${paramIndex++}`);
      values.push(updateTemplateDto.preview_image_url);
    }

    if (updateTemplateDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateTemplateDto.is_active);
    }

    if (updateTemplateDto.block_count !== undefined) {
      const bc = Math.max(1, Math.min(16, updateTemplateDto.block_count));
      updates.push(`block_count = $${paramIndex++}`);
      values.push(bc);
    }

    if (updateTemplateDto.canvas_design !== undefined) {
      updates.push(`canvas_design = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updateTemplateDto.canvas_design));
    }

    if (updates.length === 0) {
      return template;
    }

    values.push(id);
    await this.database.query(
      `UPDATE templates SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findOne(id, userId, userRole);
  }

  async remove(id: string, userId?: string, userRole?: string) {
    const row = await this.database.query(
      'SELECT id, scope, is_system, created_by FROM templates WHERE id = $1',
      [id]
    );
    if (row.rows.length === 0) {
      throw new NotFoundException('Template not found');
    }
    const t = row.rows[0];
    const scope = (t.scope ?? '').toString().toLowerCase();
    // Sistem şablonlarını sadece super_admin ve admin silebilir. Normal kullanıcı silemez.
    if (scope === 'system') {
      const canDelete = userRole === 'super_admin' || userRole === 'admin';
      if (!canDelete) {
        throw new ForbiddenException('Sistem şablonları silinemez');
      }
    }
    // Sistem şablonu değilse silmeye izin ver (kullanıcı listesinde zaten sadece kendi şablonları görünüyor)

    await this.database.query('DELETE FROM template_block_contents WHERE template_block_id IN (SELECT id FROM template_blocks WHERE template_id = $1)', [id]);
    await this.database.query('DELETE FROM template_blocks WHERE template_id = $1', [id]);
    await this.database.query('DELETE FROM templates WHERE id = $1', [id]);
    return { message: 'Template deleted successfully' };
  }

  /**
   * Find templates by scope (system or user)
   */
  async getTemplateBlocks(templateId: string) {
    const result = await this.database.query(
      `SELECT * FROM template_blocks 
       WHERE template_id = $1 
       ORDER BY block_index ASC`,
      [templateId]
    );
    return result.rows;
  }

  async findByScope(scope: 'system' | 'user', businessId?: string, userId?: string, userRole?: string) {
    try {
      if (scope === 'system') {
        const result = await this.database.query(
          'SELECT * FROM templates WHERE scope = $1 AND is_active = true ORDER BY block_count ASC, display_name ASC',
          ['system']
        );
        return result.rows;
      } else {
        let query = 'SELECT * FROM templates WHERE scope = $1 AND is_active = true';
        const params: any[] = ['user'];
        if (userId) {
          query += ' AND created_by = $2';
          params.push(userId);
        }
        query += ' ORDER BY created_at DESC, display_name ASC';
        const result = await this.database.query(query, params);
        return result.rows;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('scope') && (msg.includes('does not exist') || msg.includes('column'))) {
        return this.findByScopeFallback(scope, userId, userRole);
      }
      throw err;
    }
  }

  /** Eski şema: scope/created_by yok, sadece is_system var */
  private async findByScopeFallback(scope: 'system' | 'user', userId?: string, userRole?: string) {
    if (scope === 'system') {
      const result = await this.database.query(
        'SELECT * FROM templates WHERE is_system = true AND is_active = true ORDER BY block_count ASC, display_name ASC'
      );
      return result.rows;
    }
    const result = await this.database.query(
      'SELECT * FROM templates WHERE (is_system = false OR is_system IS NULL) AND is_active = true ORDER BY created_at DESC, display_name ASC'
    );
    return result.rows;
  }

  /**
   * Save template from screen layout.
   * Admin/super_admin scope='system' ile sistem şablonu oluşturabilir (herkes erişir).
   */
  async saveFromScreen(dto: SaveTemplateFromScreenDto, userId: string, userRole?: string) {
    // Get screen blocks with positions
    const screenBlocksResult = await this.database.query(
      `SELECT 
        sb.*,
        tb.block_index
      FROM screen_blocks sb
      INNER JOIN template_blocks tb ON sb.template_block_id = tb.id
      WHERE sb.screen_id = $1 AND sb.is_active = true
      ORDER BY tb.block_index ASC`,
      [dto.screen_id]
    );

    if (screenBlocksResult.rows.length === 0) {
      throw new BadRequestException('Screen has no blocks to save as template');
    }

    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    const asSystem = isAdmin && dto.scope === 'system';
    const scope = asSystem ? 'system' : 'user';
    const isSystem = asSystem;

    // Create template
    const templateResult = await this.database.query(
      `INSERT INTO templates (
        name, display_name, description, block_count, 
        scope, created_by, business_id, is_system, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        dto.name,
        dto.display_name,
        dto.description || null,
        screenBlocksResult.rows.length,
        scope,
        userId,
        dto.business_id || null,
        isSystem,
        true,
      ]
    );

    const template = templateResult.rows[0];

    // Create template blocks from screen blocks
    for (let i = 0; i < screenBlocksResult.rows.length; i++) {
      const screenBlock = screenBlocksResult.rows[i];
      await this.database.query(
        `INSERT INTO template_blocks (
          template_id, block_index, position_x, position_y, width, height,
          z_index, animation_type, animation_duration, animation_delay, style_config
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          template.id,
          i,
          screenBlock.position_x || 0,
          screenBlock.position_y || 0,
          screenBlock.width || 25,
          screenBlock.height || 25,
          screenBlock.z_index || 0,
          screenBlock.animation_type || 'fade',
          screenBlock.animation_duration || 500,
          screenBlock.animation_delay || 0,
          JSON.stringify(screenBlock.style_config || {}),
        ]
      );
    }

    return this.findOne(template.id);
  }

  /**
   * Apply template to screen
   */
  async applyToScreen(dto: ApplyTemplateDto) {
    // Get template with blocks
    const template = await this.findOne(dto.template_id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Get template blocks
    const templateBlocksResult = await this.database.query(
      'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index ASC',
      [dto.template_id]
    );

    if (templateBlocksResult.rows.length === 0) {
      throw new BadRequestException('Template has no blocks');
    }

    // Delete existing screen blocks if not keeping content
    if (!dto.keep_content) {
      await this.database.query(
        'DELETE FROM screen_blocks WHERE screen_id = $1',
        [dto.screen_id]
      );
    }

    // Update screen template_id
    await this.database.query(
      'UPDATE screens SET template_id = $1 WHERE id = $2',
      [dto.template_id, dto.screen_id]
    );

    // Initialize screen blocks from template
    // Always delete and recreate to ensure all blocks are present
    const screenBlocks = [];
    for (const templateBlock of templateBlocksResult.rows) {
      try {
        const result = await this.database.query(
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
            templateBlock.position_x || 0,
            templateBlock.position_y || 0,
            templateBlock.width || 25,
            templateBlock.height || 25,
            templateBlock.z_index || 0,
            templateBlock.animation_type || 'fade',
            templateBlock.animation_duration || 500,
            templateBlock.animation_delay || 0,
          ]
        );
        if (result.rows && result.rows.length > 0) {
          screenBlocks.push(result.rows[0]);
        }
      } catch (err: any) {
        console.error(`Error creating screen block for template_block ${templateBlock.id}:`, err);
        // Continue with other blocks even if one fails
      }
    }

    // Verify all blocks were created
    if (screenBlocks.length !== templateBlocksResult.rows.length) {
      console.warn(
        `Warning: Created ${screenBlocks.length} blocks but template has ${templateBlocksResult.rows.length} blocks`
      );
    }

    return {
      template,
      screen_blocks: screenBlocks,
      blocks_created: screenBlocks.length,
      blocks_expected: templateBlocksResult.rows.length,
      message: 'Template applied successfully',
    };
  }

  /**
   * Farklı kaydet: Sistem Şablonları veya kullanıcıya kaydet (admin/super_admin only)
   */
  async saveAs(templateId: string, dto: SaveAsTemplateDto, adminUserId: string, userRole?: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Sadece admin veya super_admin farklı kaydet yapabilir');
    }
    if (dto.scope === 'user' && !dto.target_user_id) {
      throw new BadRequestException('Kullanıcıya kaydetmek için target_user_id gerekli');
    }
    const src = await this.findOne(templateId);
    if (!src) throw new NotFoundException('Şablon bulunamadı');
    const baseName = (src.display_name || src.name || 'Şablon') + ' (kopya)';
    const uniqueName = `saveas-${templateId}-${Date.now()}`;
    const createdBy = dto.scope === 'system' ? adminUserId : dto.target_user_id!;
    const scope = dto.scope;
    const isSystem = dto.scope === 'system';
    const newId = await this.duplicateInApp(templateId, uniqueName, baseName, src.description, createdBy, null, scope, isSystem);
    return this.findOne(newId, adminUserId, userRole);
  }

  /**
   * Duplicate a template (and its blocks + block contents).
   */
  async duplicate(templateId: string, dto: DuplicateTemplateDto, userId: string) {
    try {
      const sourceTemplate = await this.findOne(templateId);
      if (!sourceTemplate) {
        throw new NotFoundException('Source template not found');
      }

      let uniqueName = dto.name;
      const nameCheck = await this.database.query(
        'SELECT id FROM templates WHERE name = $1',
        [uniqueName]
      );
      if (nameCheck.rows.length > 0) {
        uniqueName = `${dto.name}_${Date.now()}`;
      }

      const newTemplateId = await this.duplicateInApp(
        templateId,
        uniqueName,
        dto.display_name,
        dto.description,
        userId,
        dto.business_id || null,
        'user',
        false,
      );
      return this.findOne(newTemplateId);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      console.error('duplicate error:', err?.message, err?.code);
      throw new BadRequestException(
        err?.message || 'Şablon kopyalanamadı.'
      );
    }
  }

  /**
   * Uygulama tarafında şablon kopyala (bloklar + içerikler dahil).
   * Eksik sütunlarda minimal INSERT kullanır (schema uyumluluğu).
   */
  private async duplicateInApp(
    sourceTemplateId: string,
    newName: string,
    newDisplayName: string,
    newDescription: string | undefined,
    userId: string,
    businessId: string | null,
    scope: 'system' | 'user' = 'user',
    isSystem = false,
  ): Promise<string> {
    try {
      const src = await this.database.query(
        'SELECT * FROM templates WHERE id = $1',
        [sourceTemplateId]
      );
      if (src.rows.length === 0) {
        throw new NotFoundException('Source template not found');
      }
      const t = src.rows[0];

      let newTemplateId: string;
      try {
        const ins = await this.database.query(
          `INSERT INTO templates (name, display_name, description, block_count, preview_image_url, is_active, scope, created_by, business_id, is_system, canvas_design)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
           RETURNING id`,
          [
            newName,
            newDisplayName,
            newDescription ?? t.description ?? null,
            t.block_count,
            t.preview_image_url ?? null,
            t.is_active ?? true,
            scope,
            userId,
            businessId,
            isSystem,
            t.canvas_design ? JSON.stringify(t.canvas_design) : null,
          ]
        );
        newTemplateId = ins.rows[0].id;
      } catch (err: any) {
        if (err?.code === '42703') {
          const ins = await this.database.query(
            `INSERT INTO templates (name, display_name, description, block_count, preview_image_url, is_active, is_system, canvas_design)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
             RETURNING id`,
            [
              newName,
              newDisplayName,
              newDescription ?? t.description ?? null,
              t.block_count,
              t.preview_image_url ?? null,
              t.is_active ?? true,
              isSystem,
              t.canvas_design ? JSON.stringify(t.canvas_design) : null,
            ]
          );
          newTemplateId = ins.rows[0].id;
          await this.database.query(
            `UPDATE templates SET created_by = $1, scope = $2 WHERE id = $3`,
            [userId, scope, newTemplateId]
          ).catch(() => {});
        } else {
          throw err;
        }
      }

      const blocks = await this.database.query(
        'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index ASC',
        [sourceTemplateId]
      );
      const oldToNewBlockId: Record<string, string> = {};
      for (const b of blocks.rows) {
        try {
          const r = await this.database.query(
            `INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height, z_index, animation_type, animation_duration, animation_delay, style_config)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), COALESCE($8, 'fade'), COALESCE($9, 500), COALESCE($10, 0), COALESCE($11::jsonb, '{}'::jsonb))
             RETURNING id`,
            [
              newTemplateId,
              b.block_index,
              b.position_x,
              b.position_y,
              b.width,
              b.height,
              b.z_index,
              b.animation_type,
              b.animation_duration,
              b.animation_delay,
              typeof b.style_config === 'string' ? b.style_config : JSON.stringify(b.style_config || {}),
            ]
          );
          oldToNewBlockId[b.id] = r.rows[0].id;
        } catch (err: any) {
          if (err?.code === '42703') {
            const r = await this.database.query(
              `INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
              [newTemplateId, b.block_index, b.position_x, b.position_y, b.width, b.height]
            );
            oldToNewBlockId[b.id] = r.rows[0].id;
          } else {
            throw err;
          }
        }
      }

      const blockIds = Object.keys(oldToNewBlockId);
      if (blockIds.length > 0) {
        try {
          const contents = await this.database.query(
            'SELECT * FROM template_block_contents WHERE template_block_id = ANY($1::uuid[])',
            [blockIds]
          );
          for (const c of contents.rows) {
            const newBlockId = oldToNewBlockId[c.template_block_id];
            if (!newBlockId) continue;
            const styleVal = c.style_config == null ? '{}' : (typeof c.style_config === 'string' ? c.style_config : JSON.stringify(c.style_config));
            await this.database.query(
              `INSERT INTO template_block_contents (template_block_id, content_type, image_url, icon_name, title, description, price, campaign_text, background_color, background_image_url, text_color, style_config, menu_item_id, menu_id, display_order, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, COALESCE($15, 0), COALESCE($16, true))`,
              [
                newBlockId,
                c.content_type,
                c.image_url ?? null,
                c.icon_name ?? null,
                c.title ?? null,
                c.description ?? null,
                c.price ?? null,
                c.campaign_text ?? null,
                c.background_color ?? null,
                c.background_image_url ?? null,
                c.text_color ?? null,
                styleVal,
                c.menu_item_id ?? null,
                c.menu_id ?? null,
                c.display_order ?? 0,
                c.is_active ?? true,
              ]
            );
          }
        } catch (contentsErr: any) {
          console.warn('Duplicate: template_block_contents copy skipped:', contentsErr?.message);
        }
      }

      return newTemplateId;
    } catch (err: any) {
      console.error('duplicateInApp error:', err?.message, err?.code, err?.detail);
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(
        err?.message || 'Şablon kopyalanamadı. Lütfen veritabanı migrasyonlarının çalıştığından emin olun.'
      );
    }
  }

  /**
   * Create menu from template products
   */
  async createMenuFromProducts(templateId: string, userId: string, userRole: string) {
    // Get user's business_id
    const userResult = await this.database.query(
      'SELECT business_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ Kullanıcı bulunamadı: userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    const businessId = userResult.rows[0].business_id;

    if (!businessId) {
      console.error(`❌ Kullanıcının business_id yok: userId=${userId}`);
      throw new BadRequestException('Kullanıcının işletmesi yok. Lütfen önce bir işletme oluşturun.');
    }

    // Get template
    const templateResult = await this.database.query(
      'SELECT * FROM templates WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      console.error(`❌ Template bulunamadı: templateId=${templateId}`);
      throw new NotFoundException('Template not found');
    }

    const template = templateResult.rows[0];

    // Get all template blocks
    const blocksResult = await this.database.query(
      'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index',
      [templateId]
    );

    const blocks = blocksResult.rows;

    // Get all template block contents with products (title, price, image_url)
    // Daha esnek sorgu: Herhangi bir content_type'da title veya image_url varsa ürün olarak kabul et
    const products: any[] = [];
    for (const block of blocks) {
      // Önce tüm içerikleri al (title veya image_url olanlar)
      const contentsResult = await this.database.query(
        `SELECT * FROM template_block_contents 
         WHERE template_block_id = $1 
         AND (title IS NOT NULL AND title != '' OR image_url IS NOT NULL AND image_url != '')
         ORDER BY display_order`,
        [block.id]
      );

      for (const content of contentsResult.rows) {
        // TV yayınında kullanılan ürünler (menu_item_id atanmış) menü sayfasına aktarılmasın
        if (content.menu_item_id) {
          continue;
        }
        // Ürün olarak kabul et: title varsa veya image_url varsa
        if (content.title || content.image_url) {
          const productName = content.title && content.title.trim() !== ''
            ? content.title
            : (content.image_url ? 'Ürün' : null);

          if (productName) {
            const product = {
              name: productName,
              description: content.description || null,
              price: content.price || 0,
              image_url: content.image_url || null,
              display_order: content.display_order || 0,
            };
            products.push(product);
          }
        }
      }
    }

    if (products.length === 0) {
      console.error(`❌ Template'te ürün yok: templateId=${templateId}`);
      throw new BadRequestException('Template\'te menüye eklenebilecek ürün bulunamadı. Lütfen template\'e ürün ekleyin (isim ve/veya resim ile).');
    }

    // Create or get menu for this template (neutral English for i18n; frontend translates)
    const menuName = `${template.display_name} Menu`;
    const menuNameLegacy = `${template.display_name} Menüsü`;

    let menuResult = await this.database.query(
      'SELECT * FROM menus WHERE business_id = $1 AND (name = $2 OR name = $3)',
      [businessId, menuName, menuNameLegacy]
    );

    let menu;
    if (menuResult.rows.length === 0) {
      menuResult = await this.database.query(
        `INSERT INTO menus (business_id, name, description, slide_duration, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          businessId,
          menuName,
          `Menu auto-created from template: ${template.display_name}`,
          5,
          true,
        ]
      );
      menu = menuResult.rows[0];
    } else {
      menu = menuResult.rows[0];
    }

    // Add products as menu items
    const menuItems = [];
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Check if menu item already exists (by name)
      const existingItem = await this.database.query(
        'SELECT * FROM menu_items WHERE menu_id = $1 AND name = $2',
        [menu.id, product.name]
      );

      if (existingItem.rows.length === 0) {
        const itemResult = await this.database.query(
          `INSERT INTO menu_items (
            menu_id, name, description, price, image_url, display_order, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            menu.id,
            product.name,
            product.description,
            product.price,
            product.image_url,
            i,
            true,
          ]
        );
        menuItems.push(itemResult.rows[0]);
      }
    }

    // product_list içeriklerini oluşturulan menü ile ilişkilendir (TV'de isim/fiyat görünsün diye)
    const productListContents = await this.database.query(
      `SELECT tbc.id FROM template_block_contents tbc
       INNER JOIN template_blocks tb ON tbc.template_block_id = tb.id
       WHERE tb.template_id = $1 AND tbc.content_type = 'product_list' AND tbc.is_active = true`,
      [templateId]
    );
    if (productListContents.rows.length > 0) {
      await this.database.query(
        `UPDATE template_block_contents SET menu_id = $1, updated_at = NOW()
         WHERE id = ANY($2::uuid[])`,
        [menu.id, productListContents.rows.map((r: any) => r.id)]
      );
    }

    return {
      menu,
      menuItems,
      productsCount: menuItems.length,
    };
  }
}
