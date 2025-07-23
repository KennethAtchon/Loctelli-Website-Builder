import { SetMetadata } from '@nestjs/common';

export const ADMIN_KEY = 'admin';
export const Admin = (roles?: string[]) => SetMetadata(ADMIN_KEY, roles || true); 