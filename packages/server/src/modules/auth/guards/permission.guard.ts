import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../types/user-type';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const taskSlug = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!taskSlug) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;

    const hasPermission = await this.prisma.p_tasks.findFirst({
      where: {
        role_id: user.roleId,
        task: {
          slug: taskSlug,
        },
      },
      select: { task_id: true },
    });

    if (!hasPermission) {
      throw new ApiError(
        errors.PERMISSION_DENIED.message,
        errors.PERMISSION_DENIED.code,
        errors.PERMISSION_DENIED.errorCode,
      );
    }

    return true;
  }
}
