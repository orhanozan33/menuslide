import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { LocalAuthService } from './local-auth.service';

@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(private authService: LocalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Try to get from session/cookie for local auth
      const sessionToken = request.headers['x-session-token'] || request.cookies?.session_token;
      
      if (!sessionToken) {
        throw new UnauthorizedException('Missing authorization');
      }

      try {
        // Decode session token (simple JWT-like or just user ID)
        // For simplicity, we'll use the token as user ID for now
        const user = await this.authService.getUserById(sessionToken);
        request.user = user;
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid session');
      }
    }

    // Bearer token support (for API clients)
    const token = authHeader.substring(7);
    try {
      const user = await this.authService.getUserById(token);
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
