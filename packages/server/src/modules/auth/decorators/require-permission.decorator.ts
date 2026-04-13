import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export const RequirePermission = (taskSlug: string) => SetMetadata(PERMISSION_KEY, taskSlug);
