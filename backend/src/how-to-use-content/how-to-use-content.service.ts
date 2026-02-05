import { Injectable, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface HowToUseContentDto {
  texts: Record<string, string>;
  images: Record<string, string>;
}

const DEFAULT_CONTENT: HowToUseContentDto = {
  texts: {},
  images: {},
};

function getDataPath(): string {
  const backendRoot = path.resolve(__dirname, '..', '..', '..');
  const dataDir = path.join(backendRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'how-to-use-content.json');
}

@Injectable()
export class HowToUseContentService {
  findAll(): HowToUseContentDto {
    try {
      const filePath = getDataPath();
      if (!fs.existsSync(filePath)) {
        return { texts: {}, images: {} };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        texts: parsed?.texts && typeof parsed.texts === 'object' ? parsed.texts : {},
        images: parsed?.images && typeof parsed.images === 'object' ? parsed.images : {},
      };
    } catch {
      return { texts: {}, images: {} };
    }
  }

  save(dto: Partial<HowToUseContentDto>, userRole: string): HowToUseContentDto {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update how-to-use content');
    }
    const current = this.findAll();
    const texts = dto?.texts && typeof dto.texts === 'object' ? dto.texts : current.texts;
    const images = dto?.images && typeof dto.images === 'object' ? dto.images : current.images;
    const validated: HowToUseContentDto = { texts: { ...texts }, images: { ...images } };
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf-8');
    return validated;
  }
}
