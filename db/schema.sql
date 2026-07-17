-- PostgreSQL Database Schema for Enterprise Project Control System (EPCS)
-- Designed for SaaS Multi-Tenant with Row-Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CORE SAAS MODULE
-- ============================================================================

-- Subscription Plans Table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    price_monthly NUMERIC(12, 2) NOT NULL,
    price_yearly NUMERIC(12, 2) NOT NULL,
    max_projects INT NOT NULL DEFAULT 3,
    max_users INT NOT NULL DEFAULT 5,
    max_storage_gb INT NOT NULL DEFAULT 5,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, trial_expired
    subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions Table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL, -- active, trailing, past_due, canceled
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, pending
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system global roles
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- Permissions Table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL, -- e.g., projects, cost, procurement
    action VARCHAR(50) NOT NULL, -- e.g., create, read, update, delete, approve
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., projects:create
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Association Table
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User Roles Table
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., UPDATE_TASK, CREATE_PROJECT
    entity_name VARCHAR(50) NOT NULL, -- e.g., tasks, budgets
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. PROJECT MODULE
-- ============================================================================

-- Project Statuses Table
CREATE TABLE project_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system defaults
    name VARCHAR(50) NOT NULL,
    color_code VARCHAR(10) NOT NULL DEFAULT '#CCCCCC',
    is_terminal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES project_statuses(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    location VARCHAR(255),
    budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- Project Members Table
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- ============================================================================
-- 3. PLANNING MODULE
-- ============================================================================

-- WBS (Work Breakdown Structure) Table
CREATE TABLE wbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES wbs(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    weight NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Weight percentage of this node in project (0.00 - 100.00)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, code)
);

-- Schedules Table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version)
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wbs_id UUID NOT NULL REFERENCES wbs(id) ON DELETE RESTRICT,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    planned_start TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    duration_days INT NOT NULL,
    progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- 0.00 - 100.00
    planned_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    weight NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Weight in context of parent WBS or project
    status VARCHAR(20) NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed, delayed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task Dependencies Table
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predecessor_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(2) NOT NULL DEFAULT 'FS', -- FS, SS, FF, SF
    lag_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Milestones Table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    target_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, achieved, delayed
    weight NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. PROGRESS MODULE
-- ============================================================================

-- Daily Reports Table
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    report_date DATE NOT NULL,
    weather_morning VARCHAR(50),
    weather_afternoon VARCHAR(50),
    general_summary TEXT,
    safety_notes TEXT,
    qa_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, submitted, approved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, report_date)
);

-- Progress Updates Table
CREATE TABLE progress_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    daily_report_id UUID REFERENCES daily_reports(id) ON DELETE SET NULL,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reported_date DATE NOT NULL,
    previous_progress NUMERIC(5, 2) NOT NULL,
    current_progress NUMERIC(5, 2) NOT NULL,
    work_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S-Curve Data Table
CREATE TABLE s_curve_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    planned_progress_cum NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Cumulative planned progress %
    actual_progress_cum NUMERIC(5, 2) NOT NULL DEFAULT 0.00,  -- Cumulative actual progress %
    forecast_progress_cum NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Cumulative forecast progress %
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, period_date)
);

-- ============================================================================
-- 5. COST MODULE
-- ============================================================================

-- Budgets Table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wbs_id UUID NOT NULL REFERENCES wbs(id) ON DELETE RESTRICT,
    cost_code VARCHAR(50) NOT NULL, -- e.g., CAPEX.CIVIL.CONCRETE
    description TEXT,
    allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, cost_code)
);

-- BOQ (Bill of Quantities) Items Table
CREATE TABLE boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wbs_id UUID NOT NULL REFERENCES wbs(id) ON DELETE RESTRICT,
    item_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL, -- e.g., m3, kg, tons, hours
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    unit_rate NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, item_code)
);

-- Actual Costs Table
CREATE TABLE actual_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wbs_id UUID REFERENCES wbs(id) ON DELETE RESTRICT,
    cost_code VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- e.g., PO, INVOICE, TIMESHEET
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cashflows Table
CREATE TABLE cashflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_date DATE NOT NULL, -- monthly/weekly periods
    planned_inflow NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    planned_outflow NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    actual_inflow NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    actual_outflow NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, period_date)
);

-- ============================================================================
-- 6. PROCUREMENT MODULE
-- ============================================================================

-- Vendors Table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(30),
    address TEXT,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, blacklisted, pending
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- Purchase Requisitions (PR) Table
CREATE TABLE purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pr_number VARCHAR(50) NOT NULL,
    description TEXT,
    estimated_cost NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
    required_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, pr_number)
);

-- Requests For Quotations (RFQ) Table
CREATE TABLE rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pr_id UUID REFERENCES purchase_requisitions(id) ON DELETE SET NULL,
    rfq_number VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    closing_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, open, closed, awarded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, rfq_number)
);

-- Purchase Orders (PO) Table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    po_number VARCHAR(50) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, approved, completed, canceled
    order_date DATE NOT NULL,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, po_number)
);

-- ============================================================================
-- 7. RESOURCE MODULE
-- ============================================================================

-- Manpower Table
CREATE TABLE manpower (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    trade VARCHAR(50) NOT NULL, -- e.g., Welder, Operator, Civil Engineer
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
    hours_worked NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., Excavator, Crane, Generator
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
    hours_used NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, breakdown, idle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Materials Table
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- e.g., cement bags, steel tons
    quantity_received NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    quantity_consumed NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. DOCUMENT MODULE
-- ============================================================================

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    doc_number VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- e.g., Drawing, Contract, Specification
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, under_review, approved, superseded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, doc_number)
);

-- Document Versions Table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_string VARCHAR(20) NOT NULL, -- e.g., Rev A, Rev 0, Rev 1
    s3_key VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approvals Table
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    comments TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. RISK MODULE
-- ============================================================================

-- Risks Table
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., Cost, Schedule, HSE, Technical
    probability INT CHECK (probability BETWEEN 1 AND 5),
    impact INT CHECK (impact BETWEEN 1 AND 5),
    severity_score INT GENERATED ALWAYS AS (probability * impact) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, mitigated, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mitigations Table
CREATE TABLE mitigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    action_plan TEXT NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'planned', -- planned, ongoing, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. QUALITY MODULE
-- ============================================================================

-- Inspections Table
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    inspection_date DATE NOT NULL,
    area_inspected VARCHAR(150) NOT NULL,
    checklist JSONB NOT NULL DEFAULT '[]',
    result VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, passed, failed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NCR (Non-Conformance Reports) Table
CREATE TABLE ncrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    issued_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    root_cause TEXT,
    corrective_action TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, resolved, closed
    target_date DATE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. HSE MODULE
-- ============================================================================

-- Incidents Table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    severity VARCHAR(20) NOT NULL, -- near_miss, first_aid, lost_time, fatality
    description TEXT NOT NULL,
    location VARCHAR(150),
    immediate_actions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'investigating', -- investigating, closed
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Observations Table
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    observer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    observation_date DATE NOT NULL,
    category VARCHAR(50), -- e.g., Unsafe Act, Unsafe Condition, Safe Act
    description TEXT NOT NULL,
    suggested_action TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'reported', -- reported, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. BILLING MODULE
-- ============================================================================

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- NULL for Tenant Subscription Billing
    invoice_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, paid, void, overdue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, invoice_number)
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- e.g., credit_card, bank_transfer
    transaction_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- pending, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Indexing tenant_id on all multi-tenant tables to speed up RLS queries
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_roles_tenant ON roles(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX idx_wbs_tenant ON wbs(tenant_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_daily_reports_tenant ON daily_reports(tenant_id);
CREATE INDEX idx_progress_updates_tenant ON progress_updates(tenant_id);
CREATE INDEX idx_s_curve_tenant ON s_curve_data(tenant_id);
CREATE INDEX idx_budgets_tenant ON budgets(tenant_id);
CREATE INDEX idx_boq_items_tenant ON boq_items(tenant_id);
CREATE INDEX idx_actual_costs_tenant ON actual_costs(tenant_id);
CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_purchase_requisitions_tenant ON purchase_requisitions(tenant_id);
CREATE INDEX idx_rfqs_tenant ON rfqs(tenant_id);
CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_risks_tenant ON risks(tenant_id);
CREATE INDEX idx_inspections_tenant ON inspections(tenant_id);
CREATE INDEX idx_incidents_tenant ON incidents(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);

-- Operational indexes for foreign key Lookups and joins
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_wbs_project ON wbs(project_id);
CREATE INDEX idx_wbs_parent ON wbs(parent_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_wbs ON tasks(wbs_id);
CREATE INDEX idx_task_dep_pred ON task_dependencies(predecessor_id);
CREATE INDEX idx_task_dep_succ ON task_dependencies(successor_id);
CREATE INDEX idx_daily_reports_project ON daily_reports(project_id);
CREATE INDEX idx_actual_costs_project ON actual_costs(project_id);
CREATE INDEX idx_actual_costs_wbs ON actual_costs(wbs_id);
CREATE INDEX idx_doc_versions_doc ON document_versions(document_id);
CREATE INDEX idx_approvals_version ON approvals(document_version_id);
CREATE INDEX idx_ncrs_project ON ncrs(project_id);
CREATE INDEX idx_incidents_project ON incidents(project_id);


-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER CONFIGURATION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables
CREATE TRIGGER update_subscription_plans_modtime BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_tenants_modtime BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_subscriptions_modtime BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_roles_modtime BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_wbs_modtime BEFORE UPDATE ON wbs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_schedules_modtime BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_milestones_modtime BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_daily_reports_modtime BEFORE UPDATE ON daily_reports FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_budgets_modtime BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_boq_items_modtime BEFORE UPDATE ON boq_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_vendors_modtime BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_purchase_requisitions_modtime BEFORE UPDATE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_rfqs_modtime BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_purchase_orders_modtime BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_risks_modtime BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_mitigations_modtime BEFORE UPDATE ON mitigations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_inspections_modtime BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_ncrs_modtime BEFORE UPDATE ON ncrs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_incidents_modtime BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_observations_modtime BEFORE UPDATE ON observations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES TEMPLATE
-- ============================================================================

-- RLS helper function checking the active tenant_id context variable
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS for all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE s_curve_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Helper to check if current session is a privileged (service/postgres) role.
-- In Supabase, the `postgres` and `service_role` roles bypass RLS by default,
-- so these policies mainly protect connections made through the Supabase
-- Data API or any non-superuser application role.
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_user = 'postgres'
        OR current_user LIKE 'service_role%'
        OR current_setting('app.bypass_rls', true) = 'true'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenant-isolation policy generator macro. For tables that have a tenant_id,
-- rows are visible/editable only when the tenant matches the session variable
-- `app.current_tenant_id` (set by the backend in executeInTenantSession).
CREATE OR REPLACE FUNCTION tenant_check(tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (tenant_id = get_current_tenant_id() OR is_service_role());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global system tables (no tenant_id) are readable by everyone but writable
-- only by service roles.
CREATE POLICY global_read_policy ON subscription_plans FOR SELECT USING (true);
CREATE POLICY global_write_policy ON subscription_plans FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE POLICY global_read_policy ON permissions FOR SELECT USING (true);
CREATE POLICY global_write_policy ON permissions FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

-- Tenants: service roles see everything; otherwise only the active tenant.
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (tenant_check(id))
    WITH CHECK (tenant_check(id));

-- Subscriptions: tied to a tenant.
CREATE POLICY tenant_isolation_policy ON subscriptions
    FOR ALL
    USING (tenant_check(tenant_id))
    WITH CHECK (tenant_check(tenant_id));

-- Users: allow reading own record during authentication before tenant context is set.
CREATE POLICY users_tenant_policy ON users
    FOR ALL
    USING (tenant_check(tenant_id) OR is_service_role())
    WITH CHECK (tenant_check(tenant_id));

-- Roles: tenant-specific or global (tenant_id IS NULL).
CREATE POLICY roles_read_policy ON roles
    FOR SELECT
    USING (tenant_id IS NULL OR tenant_check(tenant_id));
CREATE POLICY roles_write_policy ON roles
    FOR ALL
    USING (tenant_check(tenant_id) OR is_service_role())
    WITH CHECK (tenant_check(tenant_id) OR tenant_id IS NULL);

-- Role permissions and user roles: governed through their parent role/user.
CREATE POLICY role_permissions_policy ON role_permissions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND (r.tenant_id IS NULL OR tenant_check(r.tenant_id))))
    WITH CHECK (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND (r.tenant_id IS NULL OR tenant_check(r.tenant_id))));

CREATE POLICY user_roles_policy ON user_roles
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND tenant_check(u.tenant_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND tenant_check(u.tenant_id)));

-- Audit logs.
CREATE POLICY audit_logs_tenant_policy ON audit_logs
    FOR ALL
    USING (tenant_check(tenant_id))
    WITH CHECK (tenant_check(tenant_id));

-- Project statuses: tenant-specific or global.
CREATE POLICY project_statuses_read_policy ON project_statuses
    FOR SELECT
    USING (tenant_id IS NULL OR tenant_check(tenant_id));
CREATE POLICY project_statuses_write_policy ON project_statuses
    FOR ALL
    USING (tenant_check(tenant_id) OR is_service_role())
    WITH CHECK (tenant_check(tenant_id) OR tenant_id IS NULL);

-- Projects and all child tenant tables.
CREATE POLICY tenant_isolation_policy ON projects
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON project_members
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON wbs
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON schedules
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON tasks
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON task_dependencies
    FOR ALL USING (
        EXISTS (SELECT 1 FROM tasks t WHERE t.id = predecessor_id AND tenant_check(t.tenant_id))
        AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = successor_id AND tenant_check(t.tenant_id))
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM tasks t WHERE t.id = predecessor_id AND tenant_check(t.tenant_id))
        AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = successor_id AND tenant_check(t.tenant_id))
    );
CREATE POLICY tenant_isolation_policy ON milestones
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON daily_reports
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON progress_updates
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON s_curve_data
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON budgets
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON boq_items
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON actual_costs
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON cashflows
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON vendors
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON purchase_requisitions
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON rfqs
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON purchase_orders
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON manpower
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON equipment
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON materials
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON documents
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON document_versions
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON approvals
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON risks
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON mitigations
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON inspections
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON ncrs
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON incidents
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON observations
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON invoices
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
CREATE POLICY tenant_isolation_policy ON payments
    FOR ALL USING (tenant_check(tenant_id)) WITH CHECK (tenant_check(tenant_id));
