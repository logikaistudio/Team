import { IUserRepository } from '../repositories/user.repository.interface';
import { ITenantRepository } from '../repositories/tenant.repository.interface';
import { LoginResponse, AuthTokens, UserPayload } from '../domain/auth.entity';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/security';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors';
import { pool } from '../config/database';

export class AuthUseCase {
  constructor(
    private userRepository: IUserRepository,
    private tenantRepository: ITenantRepository
  ) {}

  /**
   * Register a new Tenant along with their Super Admin user
   */
  async register(
    tenantName: string,
    domainName: string,
    planCode: string,
    adminName: string,
    adminEmail: string,
    adminPassword?: string,
    googleId?: string
  ): Promise<LoginResponse> {
    // Check if domain is taken
    const existingTenant = await this.tenantRepository.findByDomain(domainName);
    if (existingTenant) {
      throw new ConflictError('Tenant domain already registered');
    }

    // Run within client transaction for ACID consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Find the plan code
      const plans = await this.tenantRepository.getPlans();
      let selectedPlan = plans.find((p) => p.code === planCode);
      if (!selectedPlan) {
        // Fallback to Starter plan or first active plan
        selectedPlan = plans[0];
      }

      // 2. Create the tenant
      const tenantQuery = `
        INSERT INTO tenants (name, domain, status, subscription_plan_id)
        VALUES ($1, $2, 'active', $3)
        RETURNING id, name, domain, status
      `;
      const tenantRes = await client.query(tenantQuery, [tenantName, domainName, selectedPlan?.id]);
      const tenantId = tenantRes.rows[0].id;

      // 3. Create tenant-specific admin role
      const roleQuery = `
        INSERT INTO roles (tenant_id, name, code, description)
        VALUES ($1, 'Administrator', 'admin', 'Tenant administrator with full control')
        RETURNING id
      `;
      const roleRes = await client.query(roleQuery, [tenantId]);
      const roleId = roleRes.rows[0].id;

      // 4. Create the Admin User
      const pwdHash = adminPassword ? await hashPassword(adminPassword) : null;
      const userQuery = `
        INSERT INTO users (tenant_id, name, email, password_hash, google_id, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING id, name, email
      `;
      const userRes = await client.query(userQuery, [tenantId, adminName, adminEmail, pwdHash, googleId]);
      const userId = userRes.rows[0].id;

      // 5. Link user to admin role
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [userId, roleId]
      );

      await client.query('COMMIT');

      // Generate access & refresh tokens
      const userPayload: UserPayload = {
        id: userId,
        tenantId,
        name: adminName,
        email: adminEmail,
        roles: ['admin'],
        permissions: ['*'], // Admin has wildcard permission scope
      };

      const tokens: AuthTokens = {
        accessToken: generateAccessToken(userPayload),
        refreshToken: generateRefreshToken(userPayload),
      };

      return {
        user: {
          id: userId,
          name: adminName,
          email: adminEmail,
          tenantId,
          roles: ['admin'],
        },
        tokens,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate local email/password users
   */
  async login(tenantId: string | undefined, identifier: string, password: string): Promise<LoginResponse> {
    let user = null as any;

    if (tenantId) {
      const scopedUser = await pool.query(
        `SELECT
            u.id,
            u.tenant_id AS "tenantId",
            u.name,
            u.email,
            u.password_hash AS "passwordHash",
            u.status
         FROM users u
         WHERE u.tenant_id = $1
           AND (LOWER(u.email) = LOWER($2) OR LOWER(u.name) = LOWER($2))
         LIMIT 1`,
        [tenantId, identifier]
      );
      user = scopedUser.rows[0] || null;
    } else {
      const globalUsers = await pool.query(
        `SELECT
            u.id,
            u.tenant_id AS "tenantId",
            u.name,
            u.email,
            u.password_hash AS "passwordHash",
            u.status,
            BOOL_OR(r.code = 'super_admin') AS "isSuperAdmin"
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.name) = LOWER($1)
         GROUP BY u.id, u.tenant_id, u.name, u.email, u.password_hash, u.status
         ORDER BY "isSuperAdmin" DESC, u.id ASC`,
        [identifier]
      );

      if (globalUsers.rows.length === 1) {
        user = globalUsers.rows[0];
      } else if (globalUsers.rows.length > 1) {
        const superAdmins = globalUsers.rows.filter((r) => r.isSuperAdmin === true);
        if (superAdmins.length === 1) {
          user = superAdmins[0];
        } else {
          throw new BadRequestError('Tenant ID diperlukan untuk akun ini.');
        }
      }
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid username/email or password credentials');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username/email or password credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('User account is currently disabled');
    }

    const roles = await this.userRepository.getRoles(user.id);
    const roleCodes = roles.map((r) => r.code);
    const permissions = await this.userRepository.getPermissions(user.id);

    const userPayload: UserPayload = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      roles: roleCodes,
      permissions,
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        roles: roleCodes,
      },
      tokens: {
        accessToken: generateAccessToken(userPayload),
        refreshToken: generateRefreshToken(userPayload),
      },
    };
  }

  /**
   * Refresh authentication session
   */
  async refreshToken(token: string): Promise<AuthTokens> {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await this.userRepository.findById(decoded.id);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedError('Inactive or missing user session');
      }

      const roles = await this.userRepository.getRoles(user.id);
      const roleCodes = roles.map((r) => r.code);
      const permissions = await this.userRepository.getPermissions(user.id);

      const userPayload: UserPayload = {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        roles: roleCodes,
        permissions,
      };

      return {
        accessToken: generateAccessToken(userPayload),
        refreshToken: generateRefreshToken(userPayload),
      };
    } catch (error) {
      throw new UnauthorizedError('Session expired or signature is invalid');
    }
  }

  /**
   * Google OAuth sign-in flow (stub mapping ID token payloads)
   */
  async googleSignIn(googleId: string, email: string, name: string): Promise<LoginResponse> {
    let user = await this.userRepository.findByGoogleId(googleId);

    // If user doesn't exist, we find user by email under a default or invitation tenant context
    if (!user) {
      // Find tenant where this email domain might map, or create temporary user
      // For simplicity, we search for existing user with matching email
      // If none, Google registration must prompt for a new organization domain
      const dbRes = await pool.query(
        `SELECT id, tenant_id FROM users WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (dbRes.rows.length === 0) {
        throw new BadRequestError('Google user not registered. Please sign up first.');
      }

      const existingUser = dbRes.rows[0];
      // Bind Google ID to user record
      await pool.query(
        `UPDATE users SET google_id = $1 WHERE id = $2`,
        [googleId, existingUser.id]
      );

      user = await this.userRepository.findById(existingUser.id);
    }

    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account is currently disabled');
    }

    const roles = await this.userRepository.getRoles(user.id);
    const roleCodes = roles.map((r) => r.code);
    const permissions = await this.userRepository.getPermissions(user.id);

    const userPayload: UserPayload = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      roles: roleCodes,
      permissions,
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        roles: roleCodes,
      },
      tokens: {
        accessToken: generateAccessToken(userPayload),
        refreshToken: generateRefreshToken(userPayload),
      },
    };
  }

  /**
   * Trigger password resets
   */
  async forgotPassword(tenantId: string, email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(tenantId, email);
    if (!user) {
      // Security standard: don't reveal if user exists or not
      return;
    }
    // Stub for Email Service invocation (SMTP send code)
  }
}
