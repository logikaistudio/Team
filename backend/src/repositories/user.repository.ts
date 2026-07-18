import { IUserRepository } from './user.repository.interface';
import { User, Role } from '../domain/user.entity';
import { pool } from '../config/database';

export class UserRepository implements IUserRepository {
  async create(user: Partial<User>): Promise<User> {
    const query = `
      INSERT INTO users (tenant_id, name, email, password_hash, google_id, avatar_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, tenant_id AS "tenantId", name, email, password_hash AS "passwordHash",
                google_id AS "googleId", avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      user.tenantId,
      user.name,
      user.email,
      user.passwordHash,
      user.googleId,
      user.avatarUrl,
      user.status || 'active',
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, email, password_hash AS "passwordHash",
             google_id AS "googleId", avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows.length ? rows[0] : null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, email, password_hash AS "passwordHash",
             google_id AS "googleId", avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE tenant_id = $1 AND email = $2
    `;
    const { rows } = await pool.query(query, [tenantId, email]);
    return rows.length ? rows[0] : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, email, password_hash AS "passwordHash",
             google_id AS "googleId", avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE google_id = $1
    `;
    const { rows } = await pool.query(query, [googleId]);
    return rows.length ? rows[0] : null;
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const query = `
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          password_hash = COALESCE($3, password_hash),
          google_id = COALESCE($4, google_id),
          avatar_url = COALESCE($5, avatar_url),
          status = COALESCE($6, status)
      WHERE id = $7
      RETURNING id, tenant_id AS "tenantId", name, email, password_hash AS "passwordHash",
                google_id AS "googleId", avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      user.name,
      user.email,
      user.passwordHash,
      user.googleId,
      user.avatarUrl,
      user.status,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async listByTenant(tenantId: string): Promise<Array<User & { roles: string[] }>> {
    const query = `
      SELECT
        u.id,
        u.tenant_id AS "tenantId",
        u.name,
        u.email,
        u.password_hash AS "passwordHash",
        u.google_id AS "googleId",
        u.avatar_url AS "avatarUrl",
        u.status,
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.code), NULL) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.tenant_id = $1
      GROUP BY u.id, u.tenant_id, u.name, u.email, u.password_hash, u.google_id, u.avatar_url, u.status, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
    `;
    const { rows } = await pool.query(query, [tenantId]);
    return rows;
  }

  async getRoles(userId: string): Promise<Role[]> {
    const query = `
      SELECT r.id, r.tenant_id AS "tenantId", r.name, r.code, r.description
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async listRoles(tenantId: string): Promise<Role[]> {
    const query = `
      SELECT id, tenant_id AS "tenantId", name, code, description
      FROM roles
      WHERE tenant_id = $1 OR tenant_id IS NULL
      ORDER BY (tenant_id IS NULL) ASC, name ASC
    `;
    const { rows } = await pool.query(query, [tenantId]);
    return rows;
  }

  async getPermissions(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT p.code
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows.map((r) => r.code);
  }

  async assignRole(userId: string, roleCode: string, tenantId?: string): Promise<void> {
    // Prefer tenant role, fallback to global role when tenantId is provided
    const roleQuery = tenantId
      ? `
          SELECT id
          FROM roles
          WHERE code = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
          ORDER BY (tenant_id IS NULL) ASC
          LIMIT 1
        `
      : `SELECT id FROM roles WHERE code = $1 LIMIT 1`;
    const roleRes = tenantId
      ? await pool.query(roleQuery, [roleCode, tenantId])
      : await pool.query(roleQuery, [roleCode]);
    if (roleRes.rows.length === 0) {
      throw new Error(`Role not found: ${roleCode}`);
    }
    const roleId = roleRes.rows[0].id;

    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await pool.query(query, [userId, roleId]);
  }

  async setUserRoles(userId: string, roleCodes: string[], tenantId: string): Promise<void> {
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    for (const roleCode of roleCodes) {
      await this.assignRole(userId, roleCode, tenantId);
    }
  }

  async createRole(role: Partial<Role>): Promise<Role> {
    const query = `
      INSERT INTO roles (tenant_id, name, code, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, tenant_id AS "tenantId", name, code, description
    `;
    const values = [role.tenantId, role.name, role.code, role.description];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}
