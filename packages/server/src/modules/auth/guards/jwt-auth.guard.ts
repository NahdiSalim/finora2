import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators';
import { CurrentUser } from '../types/user-type';
import { errors } from 'src/common/errors/errors';
import { ApiError } from 'src/common/errors/api-error';

export interface AuthRequest extends Request {
  user?: CurrentUser;
  newAccessToken?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const originalToken = this.extractTokenFromHeader(request);

    console.log('🔍 JWT Guard Debug:');
    console.log('Authorization header:', request.headers.authorization);
    console.log('Extracted token:', originalToken ? 'Token found' : 'NO TOKEN');

    if (!originalToken) {
      throw new ApiError(
        errors.NEED_AUTH.message,
        errors.NEED_AUTH.code,
        errors.NEED_AUTH.errorCode
      );
    }

    //console.log('Original token received:', originalToken);

    try {
      const { user, newTokens } = await this.authService.verifyAndRefreshToken(originalToken);

      const fullUser = await this.authService.getFullUserById(user.sub);

      request.user = {
        id: fullUser.id,
        email: fullUser.email,
        roleId: fullUser.role?.id,
        role: fullUser.role || undefined,
      };

      if (newTokens) {
        //console.log('New token generated');

        request.headers.authorization = `Bearer ${newTokens.access_token}`;
        //console.log('Authorization header updated');

        response.setHeader('X-Access-Token', newTokens.access_token);
        response.setHeader('X-Refresh-Token', newTokens.refresh_token);
        response.setHeader('X-Token-Refreshed', 'true');

        request.newAccessToken = newTokens.access_token;
      }

      return true;
    } catch (error) {
      console.error('JwtAuthGuard error:', error.message);
      throw new ApiError(
        errors.INVALID_TOKEN.message,
        errors.INVALID_TOKEN.code,
        errors.INVALID_TOKEN.errorCode
      );
    }
  }

  private extractTokenFromHeader(request: AuthRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
