import { Injectable, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ContactInfoDto {
  email: string;
  phone: string;
  address: string;
  whatsapp: string;
}

const DEFAULT_CONTACT: ContactInfoDto = {
  email: 'info@example.com',
  phone: '+90 212 123 45 67',
  address: 'Istanbul, Turkey',
  whatsapp: '+14385968566',
};

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
  findAll(): ContactInfoDto {
    try {
      const filePath = getDataPath();
      if (!fs.existsSync(filePath)) {
        return { ...DEFAULT_CONTACT };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        email: typeof parsed.email === 'string' ? parsed.email : DEFAULT_CONTACT.email,
        phone: typeof parsed.phone === 'string' ? parsed.phone : DEFAULT_CONTACT.phone,
        address: typeof parsed.address === 'string' ? parsed.address : DEFAULT_CONTACT.address,
        whatsapp: typeof parsed.whatsapp === 'string' ? parsed.whatsapp : DEFAULT_CONTACT.whatsapp,
      };
    } catch {
      return { ...DEFAULT_CONTACT };
    }
  }

  save(dto: ContactInfoDto, userRole: string): ContactInfoDto {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update contact info');
    }
    const validated: ContactInfoDto = {
      email: String(dto?.email ?? '').trim() || DEFAULT_CONTACT.email,
      phone: String(dto?.phone ?? '').trim() || DEFAULT_CONTACT.phone,
      address: String(dto?.address ?? '').trim() || DEFAULT_CONTACT.address,
      whatsapp: String(dto?.whatsapp ?? '').trim() || DEFAULT_CONTACT.whatsapp,
    };
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf-8');
    return validated;
  }
}
