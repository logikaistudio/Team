-- ============================================================================
-- EPCS: Create or Reset SuperAdmin Account
-- ============================================================================
-- Jalankan script ini di Supabase Dashboard → SQL Editor
--
-- Script ini akan:
--   1. Membuat tenant "system" khusus untuk superadmin (jika belum ada)
--   2. Membuat user superadmin dengan password yang bisa dikonfigurasi
--   3. Memastikan role super_admin sudah ada dan terhubung ke user
--
-- Password default: SuperAdmin@2024 (ubah sebelum produksi!)
-- ============================================================================

-- Langkah 1: Pastikan extension uuid tersedia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Langkah 2: Pastikan subscription plan default ada
INSERT INTO subscription_plans (name, code, description, price_monthly, price_yearly, max_projects, max_users, max_storage_gb, features)
VALUES ('Enterprise', 'enterprise', 'System plan.', 0, 0, 999999, 999999, 999, '{"evm": true, "ai": true, "custom_domain": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Langkah 3: Buat tenant sistem
INSERT INTO tenants (id, name, domain, status, subscription_plan_id)
SELECT
  uuid_generate_v4(),
  'EPCS System',
  'system.internal',
  'active',
  (SELECT id FROM subscription_plans WHERE code = 'enterprise' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE domain = 'system.internal');

-- Langkah 4: Pastikan role super_admin ada (tenant_id NULL = global)
INSERT INTO roles (tenant_id, name, code, description)
VALUES (NULL, 'Super Admin', 'super_admin', 'Full system administration across all tenants')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Langkah 5: Pastikan semua permissions ada (dari seed.sql)
INSERT INTO permissions (module, action, code, description)
VALUES
  ('projects', 'create', 'projects:create', 'Create new projects'),
  ('projects', 'read',   'projects:read',   'View project data'),
  ('projects', 'update', 'projects:update', 'Edit project details'),
  ('projects', 'delete', 'projects:delete', 'Delete projects'),
  ('wbs',      'create', 'wbs:create',      'Create WBS structures'),
  ('wbs',      'read',   'wbs:read',        'View WBS'),
  ('wbs',      'update', 'wbs:update',      'Edit WBS'),
  ('tasks',    'create', 'tasks:create',    'Create tasks'),
  ('tasks',    'read',   'tasks:read',      'View tasks'),
  ('tasks',    'update', 'tasks:update',    'Update task progress'),
  ('tasks',    'delete', 'tasks:delete',    'Delete tasks'),
  ('documents','create', 'documents:create','Upload documents'),
  ('documents','read',   'documents:read',  'View documents'),
  ('documents','approve','documents:approve','Approve document versions'),
  ('procurement','create','procurement:create','Create RFQs / POs'),
  ('procurement','read', 'procurement:read','View procurement'),
  ('procurement','approve','procurement:approve','Approve procurement'),
  ('cost',     'read',   'cost:read',       'View budgets and costs'),
  ('cost',     'update', 'cost:update',     'Edit budgets and costs'),
  ('hse',      'create', 'hse:create',      'Report HSE incidents'),
  ('hse',      'read',   'hse:read',        'View HSE records'),
  ('quality',  'create', 'quality:create',  'Create inspections / NCRs'),
  ('quality',  'read',   'quality:read',    'View quality records'),
  ('users',    'manage', 'users:manage',    'Manage tenant users and roles'),
  ('billing',  'manage', 'billing:manage',  'Manage subscriptions and billing'),
  ('settings', 'manage', 'settings:manage', 'Manage tenant settings')
ON CONFLICT (code) DO NOTHING;

-- Langkah 6: Hubungkan semua permissions ke role super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Langkah 7: Buat user superadmin
-- Password hash untuk "SuperAdmin@2024" (bcrypt, salt rounds 10)
-- GANTI dengan hash yang benar menggunakan: node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
-- Atau gunakan password yang ada di bawah dan ubah di step 8 nanti

DO $$
DECLARE
  v_tenant_id UUID;
  v_role_id UUID;
  v_user_id UUID;
  -- Password: SuperAdmin@2024  (ubah setelah login pertama!)
  v_password_hash TEXT := '$2a$10$Q2L/2rp4C.bftlJndHjqUu3QgSgSUJ0WtFn45kJdN4QQICpuHT9Ky';
BEGIN
  -- Ambil tenant sistem
  SELECT id INTO v_tenant_id FROM tenants WHERE domain = 'system.internal' LIMIT 1;
  -- Ambil role super_admin
  SELECT id INTO v_role_id FROM roles WHERE code = 'super_admin' AND tenant_id IS NULL LIMIT 1;
  
  -- Buat atau update user superadmin
  INSERT INTO users (tenant_id, name, email, password_hash, status)
  VALUES (v_tenant_id, 'superadmin', 'superadmin@epcs.system', v_password_hash, 'active')
  ON CONFLICT (tenant_id, email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO v_user_id;

  -- Jika user sudah ada, ambil ID-nya
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_tenant_id AND email = 'superadmin@epcs.system';
  END IF;

  -- Hubungkan user ke role super_admin
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_role_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'SuperAdmin user created/updated. User ID: %', v_user_id;
  RAISE NOTICE 'Tenant ID (untuk login field): %', v_tenant_id;
END $$;

-- Verifikasi: tampilkan data superadmin
SELECT
  u.id as user_id,
  u.name,
  u.email,
  u.status,
  u.tenant_id,
  t.domain as tenant_domain,
  array_agg(r.code) as roles
FROM users u
JOIN tenants t ON t.id = u.tenant_id
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.email = 'superadmin@epcs.system'
GROUP BY u.id, u.name, u.email, u.status, u.tenant_id, t.domain;
