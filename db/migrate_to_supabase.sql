-- EPCS Supabase Migration Runner
-- --------------------------------
-- Run this file from psql connected to your Supabase PostgreSQL instance:
--
--   PGPASSWORD='p3h03lw4hyud1' psql \
--     -h db.oxqkukvavlqpyjdbprde.supabase.co -p 5432 \
--     -U postgres -d postgres \
--     -f /path/to/db/migrate_to_supabase.sql
--
-- The script:
--   1. Drops existing EPCS tables (CASCADE) in the public schema.
--   2. Applies db/schema.sql to recreate the full structure + RLS.
--   3. Applies db/seed.sql for default plans, permissions, roles & statuses.
--   4. Verifies core objects were created.

\set ON_ERROR_STOP on
\echo 'Starting EPCS Supabase migration...'

-- Drop existing tables in dependency-safe reverse order.
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'payments', 'invoices', 'observations', 'incidents', 'ncrs', 'inspections',
        'mitigations', 'risks', 'approvals', 'document_versions', 'documents',
        'materials', 'equipment', 'manpower', 'purchase_orders', 'rfqs',
        'purchase_requisitions', 'vendors', 'cashflows', 'actual_costs', 'boq_items',
        'budgets', 's_curve_data', 'progress_updates', 'daily_reports',
        'task_dependencies', 'tasks', 'milestones', 'schedules', 'wbs',
        'project_members', 'projects', 'project_statuses', 'audit_logs',
        'user_roles', 'role_permissions', 'permissions', 'roles', 'users',
        'subscriptions', 'tenants', 'subscription_plans'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', tbl);
    END LOOP;
END $$;

\echo 'Existing tables dropped.'

-- Apply full schema.
\ir schema.sql

-- Apply seed data.
\ir seed.sql

-- Verify core tables exist.
\echo 'Verifying core tables...'
SELECT
    count(*) FILTER (WHERE table_name = 'tenants') AS tenants_ok,
    count(*) FILTER (WHERE table_name = 'users') AS users_ok,
    count(*) FILTER (WHERE table_name = 'projects') AS projects_ok,
    count(*) FILTER (WHERE table_name = 'tasks') AS tasks_ok,
    count(*) FILTER (WHERE table_name = 'documents') AS documents_ok
FROM information_schema.tables
WHERE table_schema = 'public';

\echo 'Migration complete!'
