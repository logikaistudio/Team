import { UserPayload } from '../domain/auth.entity';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      tenantId?: string;
    }
  }
}
