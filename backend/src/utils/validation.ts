import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const registerSchema = z.object({
  tenantName: z.string().min(2, 'Tenant name must be at least 2 characters'),
  domainName: z.string().min(3, 'Domain must be at least 3 characters'),
  planCode: z.enum(['starter', 'professional', 'enterprise']),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  tenantId: z
    .string()
    .optional()
    .transform((v) => v?.trim())
    .refine((v) => !v || uuidRegex.test(v), 'Invalid Tenant ID format'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const projectSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  code: z.string().min(2, 'Project code is required'),
  description: z.string().optional(),
  statusId: z.string().uuid('Invalid Status ID format'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  budget: z.number().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  location: z.string().optional(),
});

export const wbsNodeSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  code: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  weight: z.number().min(0).max(100).default(0),
});

export const taskSchema = z.object({
  projectId: z.string().uuid(),
  wbsId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  plannedStart: z.string().transform((str) => new Date(str)),
  plannedEnd: z.string().transform((str) => new Date(str)),
  durationDays: z.number().int().positive(),
  plannedCost: z.number().nonnegative().default(0),
  weight: z.number().min(0).max(100).default(0),
  status: z.enum(['not_started', 'in_progress', 'completed', 'delayed']).default('not_started'),
});
