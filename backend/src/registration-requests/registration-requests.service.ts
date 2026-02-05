import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

export interface RegistrationRequestDto {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  tvCount?: string;
  address?: string;
  province?: string;
  city?: string;
  reference_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'registered';
  createdAt: string;
}

function getDataPath(): string {
  const backendRoot = path.resolve(__dirname, '..', '..', '..');
  const dataDir = path.join(backendRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'registration-requests.json');
}

function loadRequests(): RegistrationRequestDto[] {
  try {
    const filePath = getDataPath();
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRequests(requests: RegistrationRequestDto[]) {
  const filePath = getDataPath();
  fs.writeFileSync(filePath, JSON.stringify(requests, null, 2), 'utf-8');
}

@Injectable()
export class RegistrationRequestsService {
  constructor(private readonly database: DatabaseService) {}

  private async getAdminPermissions(userId: string): Promise<Record<string, Record<string, boolean>>> {
    const result = await this.database.query(
      'SELECT page_key, permission, actions FROM admin_permissions WHERE user_id = $1',
      [userId],
    );
    const map: Record<string, Record<string, boolean>> = {};
    result.rows.forEach((r: { page_key: string; permission: string; actions?: Record<string, boolean> | null }) => {
      const actions = r.actions && typeof r.actions === 'object' ? r.actions : {};
      map[r.page_key] = { view: r.permission !== 'none', ...actions };
    });
    return map;
  }

  async create(dto: { businessName: string; email: string; phone?: string; tvCount?: string; address?: string; province?: string; city?: string; reference_number?: string }): Promise<RegistrationRequestDto> {
    const email = String(dto?.email ?? '').trim();
    if (!email) {
      throw new Error('businessName and email are required');
    }
    const existingUser = await this.database.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new ConflictException('EMAIL_ALREADY_REGISTERED');
    }
    const requests = loadRequests();
    const item: RegistrationRequestDto = {
      id: randomUUID(),
      businessName: String(dto?.businessName ?? '').trim(),
      email,
      phone: dto?.phone ? String(dto.phone).trim() : undefined,
      tvCount: dto?.tvCount ? String(dto.tvCount).trim() : undefined,
      address: dto?.address ? String(dto.address).trim() : undefined,
      province: dto?.province ? String(dto.province).trim() : undefined,
      city: dto?.city ? String(dto.city).trim() : undefined,
      reference_number: dto?.reference_number ? String(dto.reference_number).trim() : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (!item.businessName) {
      throw new Error('businessName and email are required');
    }
    requests.unshift(item);
    saveRequests(requests);
    return item;
  }

  async findAll(userId: string, userRole: string): Promise<RegistrationRequestDto[]> {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can view registration requests');
    }
    if (userRole === 'admin') {
      const perms = await this.getAdminPermissions(userId);
      const regPerm = perms['registration_requests'];
      if (regPerm?.view !== true && regPerm?.view_list !== true) {
        throw new ForbiddenException('Bu sayfayı görüntüleme yetkiniz yok');
      }
    }
    return loadRequests();
  }

  /** Log a completed registration (user+business created) for admin to see */
  logNewRegistration(dto: { businessName: string; email: string; phone?: string; address?: string; province?: string; city?: string; reference_number?: string; userId?: string; businessId?: string }): RegistrationRequestDto {
    const requests = loadRequests();
    const item: RegistrationRequestDto = {
      id: randomUUID(),
      businessName: String(dto?.businessName ?? '').trim(),
      email: String(dto?.email ?? '').trim(),
      phone: dto?.phone ? String(dto.phone).trim() : undefined,
      address: dto?.address ? String(dto.address).trim() : undefined,
      province: dto?.province ? String(dto.province).trim() : undefined,
      city: dto?.city ? String(dto.city).trim() : undefined,
      reference_number: dto?.reference_number ? String(dto.reference_number).trim() : undefined,
      status: 'registered',
      createdAt: new Date().toISOString(),
    };
    requests.unshift(item);
    saveRequests(requests);
    return item;
  }

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected', userId: string, userRole: string): Promise<RegistrationRequestDto | null> {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update registration requests');
    }
    if (userRole === 'admin') {
      const perms = await this.getAdminPermissions(userId);
      const regPerm = perms['registration_requests'];
      if (status === 'approved' && regPerm?.approve !== true) {
        throw new ForbiddenException('Bu işlem için yetkiniz yok');
      }
      if (status === 'rejected' && regPerm?.reject !== true) {
        throw new ForbiddenException('Bu işlem için yetkiniz yok');
      }
    }
    const requests = loadRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    requests[idx] = { ...requests[idx], status };
    saveRequests(requests);
    return requests[idx];
  }

  delete(id: string, userRole: string): boolean {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can delete registration requests');
    }
    const requests = loadRequests();
    const filtered = requests.filter((r) => r.id !== id);
    if (filtered.length === requests.length) return false;
    saveRequests(filtered);
    return true;
  }
}
