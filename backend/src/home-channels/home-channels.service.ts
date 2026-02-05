import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

export interface HomeChannelDto {
  slug: string;
  title: string;
  description?: string;
  link?: string;
  thumbnail?: string;
}

const DEFAULT_CHANNELS: HomeChannelDto[] = [
  { slug: 'ana-salon', title: 'Ana Salon', description: 'Ana salon ekranı', link: '/display/ana-salon' },
  { slug: 'bar', title: 'Bar', description: 'Bar ekranı', link: '/display/bar' },
  { slug: 'teras', title: 'Teras', description: 'Teras ekranı', link: '/display/teras' },
];

function getDataPath(): string {
  const backendRoot = path.resolve(__dirname, '..', '..', '..');
  const dataDir = path.join(backendRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'home-channels.json');
}

@Injectable()
export class HomeChannelsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<HomeChannelDto[]> {
    try {
      const result = await this.db.query<{ slug: string; title: string; description: string | null; link: string | null; thumbnail: string | null }>(
        'SELECT slug, title, description, link, thumbnail FROM home_channels ORDER BY display_order ASC, created_at ASC',
        [],
      );
      if (result.rows.length > 0) {
        return result.rows.map((row) => ({
          slug: row.slug ?? 'channel',
          title: row.title ?? 'Channel',
          description: row.description ?? undefined,
          link: row.link ?? undefined,
          thumbnail: row.thumbnail ?? undefined,
        }));
      }
    } catch {
      /* fallback to JSON */
    }

    // Fallback: JSON file (local dev when table doesn't exist)
    try {
      const filePath = getDataPath();
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.map((c: any) => ({
            slug: String(c.slug || '').trim() || 'channel',
            title: String(c.title || '').trim() || 'Channel',
            description: c.description ? String(c.description).trim() : undefined,
            link: c.link ? String(c.link).trim() : undefined,
            thumbnail: c.thumbnail ? String(c.thumbnail).trim() : undefined,
          }));
        }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_CHANNELS;
  }

  async save(channels: HomeChannelDto[], userRole: string): Promise<HomeChannelDto[]> {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update home channels');
    }
    const validated = channels.map((c, i) => ({
      slug: String(c.slug || '').trim() || 'channel',
      title: String(c.title || '').trim() || 'Kanal',
      description: c.description ? String(c.description).trim() : undefined,
      link: c.link ? String(c.link).trim() : undefined,
      thumbnail: c.thumbnail ? String(c.thumbnail).trim() : undefined,
      display_order: i,
    }));

    try {
      await this.db.query('DELETE FROM home_channels', []);
      for (let i = 0; i < validated.length; i++) {
        const v = validated[i];
        await this.db.query(
          `INSERT INTO home_channels (slug, title, description, link, thumbnail, display_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [v.slug, v.title, v.description ?? null, v.link ?? null, v.thumbnail ?? null, v.display_order],
        );
      }
      return validated.map((v) => ({
        slug: v.slug,
        title: v.title,
        description: v.description,
        link: v.link,
        thumbnail: v.thumbnail,
      }));
    } catch {
      /* fallback to JSON */
    }

    // Fallback: JSON file
    const toSave = validated.map((v) => ({
      slug: v.slug,
      title: v.title,
      description: v.description,
      link: v.link,
      thumbnail: v.thumbnail,
    }));
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
    return toSave;
  }
}
