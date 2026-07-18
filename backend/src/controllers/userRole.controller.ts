import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth';
import { UserRepository } from '../repositories/user.repository';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import {
  userCreateSchema,
  userUpdateSchema,
  userPasswordUpdateSchema,
  roleCreateSchema,
} from '../utils/validation';
import { hashPassword } from '../utils/security';

export const userRoleRouter = Router();
const userRepository = new UserRepository();

userRoleRouter.use(authenticate);

function ensureManagementAccess(req: Request): void {
  const roleCodes = req.user?.roles || [];
  const hasAccess = roleCodes.includes('super_admin') || roleCodes.includes('tenant_admin') || roleCodes.includes('admin');
  if (!hasAccess) {
    throw new ForbiddenError('Only admin users can manage users and roles');
  }
}

userRoleRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureManagementAccess(req);
    const tenantId = req.tenantId!;
    const users = await userRepository.listByTenant(tenantId);
    const sanitized = users.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      name: u.name,
      email: u.email,
      status: u.status,
      roles: u.roles || [],
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
});

userRoleRouter.get('/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureManagementAccess(req);
    const tenantId = req.tenantId!;
    const roles = await userRepository.listRoles(tenantId);
    res.json(roles);
  } catch (error) {
    next(error);
  }
});

userRoleRouter.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureManagementAccess(req);
    const tenantId = req.tenantId!;

    const check = userCreateSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }

    const { name, email, password, status, roleCodes } = check.data;

    const existing = await userRepository.findByEmail(tenantId, email);
    if (existing) {
      throw new ConflictError('User email already exists in this tenant');
    }

    const passwordHash = await hashPassword(password);
    const created = await userRepository.create({
      tenantId,
      name,
      email,
      passwordHash,
      status,
    });

    const resolvedRoleCodes = roleCodes && roleCodes.length > 0 ? roleCodes : ['project_member'];
    await userRepository.setUserRoles(created.id, resolvedRoleCodes, tenantId);

    const roles = await userRepository.getRoles(created.id);

    res.status(201).json({
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      email: created.email,
      status: created.status,
      roles: roles.map((r) => r.code),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

userRoleRouter.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureManagementAccess(req);
    const tenantId = req.tenantId!;
    const userId = req.params.id;

    const check = userUpdateSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }

    const existing = await userRepository.findById(userId);
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    const { roleCodes, ...userUpdateData } = check.data;

    const updated = await userRepository.update(userId, userUpdateData);

    if (roleCodes) {
      await userRepository.setUserRoles(userId, roleCodes, tenantId);
    }

    const roles = await userRepository.getRoles(userId);

    res.json({
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      email: updated.email,
      status: updated.status,
      roles: roles.map((r) => r.code),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

userRoleRouter.put('/users/:id/password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureManagementAccess(req);
    const tenantId = req.tenantId!;
    const userId = req.params.id;

    const check = userPasswordUpdateSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }

    const existing = await userRepository.findById(userId);
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError('User not found');
    }

    const passwordHash = await hashPassword(check.data.password);
    await userRepository.update(userId, { passwordHash });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

userRoleRouter.post('/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureManagementAccess(req);
    const tenantId = req.tenantId!;

    const check = roleCreateSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }

    const { name, code, description } = check.data;
    const existingRoles = await userRepository.listRoles(tenantId);
    if (existingRoles.some((r) => r.code === code && (r.tenantId === tenantId || !r.tenantId))) {
      throw new ConflictError('Role code already exists');
    }

    const role = await userRepository.createRole({
      tenantId,
      name,
      code,
      description,
    });

    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
});
