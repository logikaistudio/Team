-- EPCS Database Seed Data
-- -----------------------
-- Run after schema.sql to populate reference / default data.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).

-- ============================================================================
-- 1. SUBSCRIPTION PLANS
-- ============================================================================
INSERT INTO subscription_plans (name, code, description, price_monthly, price_yearly, max_projects, max_users, max_storage_gb, features)
VALUES
  ('Starter', 'starter', 'Small teams and pilot projects.', 29.00, 290.00, 3, 10, 5, '{"evm": false, "ai": false, "custom_domain": false}'::jsonb),
  ('Professional', 'professional', 'Growing EPC teams with advanced controls.', 99.00, 990.00, 15, 50, 50, '{"evm": true, "ai": false, "custom_domain": false}'::jsonb),
  ('Enterprise', 'enterprise', 'Unlimited scale with AI and dedicated support.', 299.00, 2990.00, 999999, 999999, 500, '{"evm": true, "ai": true, "custom_domain": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. PERMISSIONS
-- ============================================================================
INSERT INTO permissions (module, action, code, description)
VALUES
  ('projects', 'create', 'projects:create', 'Create new projects'),
  ('projects', 'read', 'projects:read', 'View project data'),
  ('projects', 'update', 'projects:update', 'Edit project details'),
  ('projects', 'delete', 'projects:delete', 'Delete projects'),
  ('wbs', 'create', 'wbs:create', 'Create WBS structures'),
  ('wbs', 'read', 'wbs:read', 'View WBS'),
  ('wbs', 'update', 'wbs:update', 'Edit WBS'),
  ('tasks', 'create', 'tasks:create', 'Create tasks'),
  ('tasks', 'read', 'tasks:read', 'View tasks'),
  ('tasks', 'update', 'tasks:update', 'Update task progress'),
  ('tasks', 'delete', 'tasks:delete', 'Delete tasks'),
  ('documents', 'create', 'documents:create', 'Upload documents'),
  ('documents', 'read', 'documents:read', 'View documents'),
  ('documents', 'approve', 'documents:approve', 'Approve document versions'),
  ('procurement', 'create', 'procurement:create', 'Create RFQs / POs'),
  ('procurement', 'read', 'procurement:read', 'View procurement'),
  ('procurement', 'approve', 'procurement:approve', 'Approve procurement'),
  ('cost', 'read', 'cost:read', 'View budgets and costs'),
  ('cost', 'update', 'cost:update', 'Edit budgets and costs'),
  ('hse', 'create', 'hse:create', 'Report HSE incidents'),
  ('hse', 'read', 'hse:read', 'View HSE records'),
  ('quality', 'create', 'quality:create', 'Create inspections / NCRs'),
  ('quality', 'read', 'quality:read', 'View quality records'),
  ('users', 'manage', 'users:manage', 'Manage tenant users and roles'),
  ('billing', 'manage', 'billing:manage', 'Manage subscriptions and billing'),
  ('settings', 'manage', 'settings:manage', 'Manage tenant settings')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. GLOBAL ROLES
-- ============================================================================
-- Super Admin role (system-wide, not tied to a tenant)
INSERT INTO roles (tenant_id, name, code, description)
VALUES
  (NULL, 'Super Admin', 'super_admin', 'Full system administration across all tenants'),
  (NULL, 'Tenant Admin', 'tenant_admin', 'Administers a single tenant'),
  (NULL, 'Project Manager', 'project_manager', 'Manages projects, schedules and teams'),
  (NULL, 'Project Member', 'project_member', 'General project contributor'),
  (NULL, 'Viewer', 'viewer', 'Read-only access')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================================
-- 4. ROLE PERMISSIONS (Global roles only)
-- ============================================================================
-- Super Admin = all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Tenant Admin = all permissions except billing (reserved for super admin in this seed)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'tenant_admin'
  AND p.code NOT IN ('billing:manage')
ON CONFLICT DO NOTHING;

-- Project Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'project_manager'
  AND p.code IN (
    'projects:read', 'projects:update',
    'wbs:create', 'wbs:read', 'wbs:update',
    'tasks:create', 'tasks:read', 'tasks:update',
    'documents:create', 'documents:read',
    'procurement:create', 'procurement:read',
    'cost:read', 'cost:update',
    'hse:create', 'hse:read',
    'quality:create', 'quality:read'
  )
ON CONFLICT DO NOTHING;

-- Project Member
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'project_member'
  AND p.code IN (
    'projects:read',
    'wbs:read',
    'tasks:read', 'tasks:update',
    'documents:read',
    'procurement:read',
    'cost:read',
    'hse:create', 'hse:read',
    'quality:create', 'quality:read'
  )
ON CONFLICT DO NOTHING;

-- Viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. DEFAULT PROJECT STATUSES
-- ============================================================================
-- Global project statuses (tenant_id IS NULL)
INSERT INTO project_statuses (tenant_id, name, color_code, is_terminal)
VALUES
  (NULL, 'Not Started', '#9CA3AF', false),
  (NULL, 'Planning', '#3B82F6', false),
  (NULL, 'In Progress', '#10B981', false),
  (NULL, 'On Hold', '#F59E0B', false),
  (NULL, 'Completed', '#6366F1', true),
  (NULL, 'Cancelled', '#EF4444', true)
ON CONFLICT (tenant_id, name) DO NOTHING;
