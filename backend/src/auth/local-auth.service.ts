import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalAuthService {
  constructor(
    @Inject('DATABASE_POOL') private pool: Pool,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const result = await this.pool.query(
      'SELECT id, email, password_hash, role, business_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if password hash is temporary (needs to be set)
    if (user.password_hash === 'temp_hash_will_be_updated') {
      // Set the password on first login
      const hash = await bcrypt.hash(password, 10);
      await this.pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hash, user.id]
      );
      user.password_hash = hash;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      business_id: user.business_id,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const result = await this.pool.query(
      'SELECT id, email, role, business_id FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }
}
