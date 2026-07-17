import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserPayload } from '../domain/auth.entity';

/**
 * Authenticate incoming request using Bearer JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  // Development/testing convenience: accept a mock token or allow unauthenticated requests
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (config.nodeEnv === 'development') {
      // Attach a default dev user and tenant for local testing
      const devUser: UserPayload = {
        id: 'dev-user',
        tenantId: 'dev-tenant',
        name: 'Developer',
        email: 'developer@local',
        roles: ['super_admin'],
        permissions: ['*']
      };
      req.user = devUser;
      req.tenantId = devUser.tenantId;
      return next();
    }
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  // Allow a special mock token for quick local testing
  if (token === 'mock_access_token' && config.nodeEnv === 'development') {
    const devUser: UserPayload = {
      id: 'dev-user',
      tenantId: 'dev-tenant',
      name: 'Developer',
      email: 'developer@local',
      roles: ['super_admin'],
      permissions: ['*']
    };
    req.user = devUser;
    req.tenantId = devUser.tenantId;
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as UserPayload;
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}

/**
 * Middleware guarding access to endpoints based on granular permission codes
 */
export function requirePermission(permissionCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const hasPermission = req.user.permissions.includes(permissionCode) || req.user.roles.includes('super_admin');
    if (!hasPermission) {
      return next(new ForbiddenError(`Missing required permission: ${permissionCode}`));
    }

    next();
  };
}
