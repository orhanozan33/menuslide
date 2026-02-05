import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ContactInfoDto {
  email: string;
  phone: string;
  address: string;
  whatsapp: string;
}

const CONTACT_ID = '00000000-0000-0000-0000-000000000001';

function getDataPath(): string {
  const backendRoot = path.resolve(__dirname, '..', '..', '..');
  const dataDir = path.join(backendRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'contact-info.json');
}

@Injectable()
export class ContactInfoService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<ContactInfoDto> {
    try {
      const result = await this.db.query<{ email: string; phone: string; address: string; whatsapp: string }>(
        'SELECT email, phone, address, whatsapp FROM contact_info WHERE id = $1',
        [CONTACT_ID],
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          email: row.email ?? '',
          phone: row.phone ?? '',
          address: row.address ?? '',
          whatsapp: row.whatsapp ?? '',
        };
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
        return {
          email: typeof parsed.email === 'string' ? parsed.email : '',
          phone: typeof parsed.phone === 'string' ? parsed.phone : '',
          address: typeof parsed.address === 'string' ? parsed.address : '',
          whatsapp: typeof parsed.whatsapp === 'string' ? parsed.whatsapp : '',
        };
      }
    } catch {
      /* ignore */
    }
    return { email: '', phone: '', address: '', whatsapp: '' };
  }

  async save(dto: ContactInfoDto, userRole: string): Promise<ContactInfoDto> {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update contact info');
    }
    const validated: ContactInfoDto = {
      email: String(dto?.email ?? '').trim(),
      phone: String(dto?.phone ?? '').trim(),
      address: String(dto?.address ?? '').trim(),
      whatsapp: String(dto?.whatsapp ?? '').trim(),
    };

    try {
      await this.db.query(
        `INSERT INTO contact_info (id, email, phone, address, whatsapp, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           whatsapp = EXCLUDED.whatsapp,
           updated_at = NOW()`,
        [CONTACT_ID, validated.email, validated.phone, validated.address, validated.whatsapp],
      );
      return validated;
    } catch {
      /* fallback to JSON */
    }

    // Fallback: JSON file
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf-8');
    return validated;
  }
}
