import { User, Role } from '../domain/user.entity';

export interface IUserRepository {
  create(user: Partial<User>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  listByTenant(tenantId: string): Promise<Array<User & { roles: string[] }>>;
  getRoles(userId: string): Promise<Role[]>;
  listRoles(tenantId: string): Promise<Role[]>;
  getPermissions(userId: string): Promise<string[]>;
  assignRole(userId: string, roleCode: string, tenantId?: string): Promise<void>;
  setUserRoles(userId: string, roleCodes: string[], tenantId: string): Promise<void>;
  createRole(role: Partial<Role>): Promise<Role>;
}
