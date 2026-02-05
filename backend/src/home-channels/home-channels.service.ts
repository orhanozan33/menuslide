import { Injectable, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface HomeChannelDto {
  slug: string;
  title: string;
  description?: string;
  /** Yayın linki - display sayfası veya harici URL */
  link?: string;
  thumbnail?: string;
}

const DEFAULT_CHANNELS: HomeChannelDto[] = [
  { slug: 'ana-salon', title: 'Ana Salon', description: 'Ana salon ekranı', link: '/display/ana-salon' },
  { slug: 'bar', title: 'Bar', description: 'Bar ekranı', link: '/display/bar' },
  { slug: 'teras', title: 'Teras', description: 'Teras ekranı', link: '/display/teras' },
];

function getDataPath(): string {
  // backend/data - dist/home-channels -> dist -> backend
  const backendRoot = path.resolve(__dirname, '..', '..', '..');
  const dataDir = path.join(backendRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'home-channels.json');
}

@Injectable()
export class HomeChannelsService {
  findAll(): HomeChannelDto[] {
    try {
      const filePath = getDataPath();
      if (!fs.existsSync(filePath)) {
        return DEFAULT_CHANNELS;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : DEFAULT_CHANNELS;
    } catch {
      return DEFAULT_CHANNELS;
    }
  }

  save(channels: HomeChannelDto[], userRole: string): HomeChannelDto[] {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update home channels');
    }
    const validated = channels.map((c) => ({
      slug: String(c.slug || '').trim() || 'channel',
      title: String(c.title || '').trim() || 'Kanal',
      description: c.description ? String(c.description).trim() : undefined,
      link: c.link ? String(c.link).trim() : undefined,
      thumbnail: c.thumbnail ? String(c.thumbnail).trim() : undefined,
    }));
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf-8');
    return validated;
  }
}
