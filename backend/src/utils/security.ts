import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserPayload } from '../domain/auth.entity';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: UserPayload): string {
  return jwt.sign(payload as object, config.jwt.secret as string, {
    expiresIn: config.jwt.accessExpiry as any,
  });
}

export function generateRefreshToken(payload: UserPayload): string {
  return jwt.sign(
    { id: payload.id, tenantId: payload.tenantId } as object,
    config.jwt.refreshSecret as string,
    { expiresIn: config.jwt.refreshExpiry as any }
  );
}

export function verifyRefreshToken(token: string): { id: string; tenantId: string } {
  return jwt.verify(token, config.jwt.refreshSecret as string) as { id: string; tenantId: string };
}

