# Product Requirement Document (PRD)
## Enterprise Project Control System (EPCS) SaaS Platform

---

## 1. Executive Summary & Product Vision

The **Enterprise Project Control System (EPCS)** is an enterprise-grade multi-tenant SaaS platform designed for complex, capital-intensive engineering and operations sectors including **Construction, EPC (Engineering, Procurement, Construction), Telecommunications, Data Centers, Energy (Solar PV, Wind, Battery Energy Storage Systems / BESS), Manufacturing, and Infrastructure**. 

This system provides project directors, cost controllers, schedulers, and engineers with real-time project management controls spanning scheduling, budgeting, resource utilization, quality checks, safety reporting, document approval tracking, and AI-powered forecasting.

---

## 2. Target Market & User Personas

### Target Industries
- **EPC & Construction**: Megaprojects, civil infrastructure, manufacturing plants.
- **Energy & Renewables**: Solar PV installations, grid connections, BESS.
- **Telecom & Data Centers**: High-speed network expansions, server facilities.
- **Infrastructure**: Highways, bridge building, mass transit systems.

### User Personas
1. **SaaS Super Admin**: Oversees the entire ecosystem, tenancy configurations, billing tiers, global logs.
2. **Tenant Admin**: Manages tenant users, roles, enterprise permissions, and subscription limits.
3. **Project Manager (PM)**: Monitiores timeline health, budgets, and project risks.
4. **Project Scheduler / Controller**: Manages the WBS, milestones, tasks, dependencies, and S-Curves.
5. **Cost Controller**: Oversees Bill of Quantities (BoQ), actual cost collection, earned value analysis.
6. **Procurement Manager**: Manages vendor registers, RFQ cycles, Purchase Orders (POs).
7. **Document Controller**: Handles version checking, submittals, and signoff approvals.
8. **HSE / Quality Inspector**: Conducts inspections, registers incidents, observations, and NCRs.
9. **Field Engineer**: Submits daily/weekly site updates and timesheets.

---

## 3. SaaS Multi-Tenancy & Security Strategy

### Database Isolation Model
- **Shared Database, Logical Isolation (Row-Level Security)**:
  - All tenant data is stored in the same database.
  - Every tenant-associated table includes a `tenant_id` field.
  - PostgreSQL Row-Level Security (RLS) is enabled. Each backend service request sets the session parameter `app.current_tenant_id` via a pool connection helper, filtering all queries automatically.
- **Storage Isolation**:
  - File assets are segmented by tenant ID in S3 folders: `s3://epcs-assets/{tenant_id}/{project_id}/documents/{file_name}`.

### Authentication & Authorization
- **JWT & Refresh Tokens**: Secure login cycles with short-lived tokens and secure HTTP-Only refresh cookies.
- **Google OAuth**: Integrated login mapping enterprise emails to corresponding tenants.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (e.g., `create:project`, `approve:document`) mapped to custom user roles.

---

## 4. System Capabilities & Feature Requirements

### 4.1. Core SaaS & Billing
- **Tenant Management**: Onboarding flow, account suspension, limit tracking.
- **SaaS Billing Engine**:
  - **Starter**: Up to 3 active projects, 10 users, basic analytics.
  - **Professional**: Up to 15 active projects, 50 users, advanced EVM & S-Curve, S3 storage integration.
  - **Enterprise**: Unlimited projects/users, custom AI API rate limits, custom subdomains, dedicated DB read-replica.
  - **Billing Modules**: Trial trackers, usage auditing, automatic invoicing, Stripe/Midtrans payment webhooks.
- **Audit Analytics & Logs**: Capture user activity (logins, data edits, status overrides, approval sign-offs) for regulatory verification.

### 4.2. Advanced Calculation Engines

#### S-Curve Engine
The system aggregates task weights, planned costs, and actual updates to compute three progress tracks dynamically:
1. **Planned Progress (%)**: Cumulative baseline cost/weight of WBS items scheduled to be completed up to the target date.
2. **Actual Progress (%)**: Cumulative earned weight calculated from task completions ($% \text{ complete} \times \text{task weight}$).
3. **Forecast Progress (%)**: Projected progress curve modeled on actual performance velocity applied to remaining tasks.

#### Earned Value Management (EVM)
The system calculates key EVM metrics per project and WBS node:
- **Planned Value (PV)**: Budgeted cost of work scheduled.
- **Earned Value (EV)**: Budgeted cost of work performed ($EV = \text{BAC} \times \% \text{ actual complete}$).
- **Actual Cost (AC)**: Actual cost incurred for completed tasks.
- **Cost Variance (CV)**: $EV - AC$ (Positive = Under budget, Negative = Over budget).
- **Schedule Variance (SV)**: $EV - PV$ (Positive = Ahead of schedule, Negative = Behind schedule).
- **Cost Performance Index (CPI)**: $EV / AC$ (Goal: $\ge 1.0$).
- **Schedule Performance Index (SPI)**: $EV / PV$ (Goal: $\ge 1.0$).

#### Project Health Score Calculator
A weighted aggregate of indicators scaled between 0 and 100:
- **Cost Score** (based on CPI / CV)
- **Schedule Score** (based on SPI / SV)
- **Risk Score** (based on mitigation actions and risk matrix severity)
- **Safety Score** (incidents relative to safe man-hours)
- **Quality Score** (outstanding NCRs vs. closed inspections)
- **Resource Score** (manpower efficiency, equipment downtime)

**Output Ranges**:
- `90 - 100`: **Excellent / On Track** (Green)
- `70 - 89`: **Caution / Needs Attention** (Yellow)
- `< 70`: **Critical Risk** (Red)

---

### 4.3. AI Assistant & Predictor Engine
Integration with Gemini or OpenAI API to deliver predictive project analytics:
- **Report Generation**: Automate draft generation of weekly/monthly reports and C-level executive summaries based on logged actual tasks, costs, and HSE milestones.
- **Delay Predictor**: Flag tasks at risk of slipping based on early starting constraints, dependency chains, and historic contractor delay factors.
- **Cost Overrun Predictor**: Highlight WBS nodes trending toward overrun using current CPI trajectories.
- **Risk & Material Warning**: Forecast logistical delays for materials based on lead times and PO dates.

---

### 4.4. Functional Modules & Database Objects

- **Core SaaS**: `tenants`, `subscription_plans`, `subscriptions`, `users`, `roles`, `permissions`, `user_roles`, `audit_logs`
- **Projects**: `projects`, `project_members`, `project_statuses`
- **Planning**: `wbs`, `tasks`, `milestones`, `schedules`
- **Progress**: `progress_updates`, `daily_reports`, `s_curve_data`
- **Cost Control**: `budgets`, `actual_costs`, `boq_items`, `cashflows`
- **Procurement**: `vendors`, `purchase_requisitions`, `rfqs`, `purchase_orders`
- **Resources**: `manpower`, `equipment`, `materials`
- **Documents**: `documents`, `document_versions`, `approvals`
- **Risks**: `risks`, `mitigations`
- **Quality**: `inspections`, `ncrs`
- **HSE**: `incidents`, `observations`
- **Billing**: `invoices`, `payments`

---

### 4.5. Enterprise Utilities
- **Multi Language**: Localized UI (English, Indonesian) through `i18next` on the frontend and localized server responses on the backend.
- **Notification Center**: Real-time app alerts, automated SMTP emails, and WhatsApp status notification triggers.

---

## 5. Technology Stack & Non-Functional Specifications

- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, React Query, Recharts, and TanStack Table.
- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL (with RLS), and S3 client SDKs.
- **Security**: TLS 1.3, encrypted JWTs, HTTP-only refresh cookies, salted bcrypt passwords, and input validation schemas (Zod).
- **Scale**: DB read replicas for BI dashboarding, caching layer, and optimized indexes on project tracking columns.

---

## 6. Recommended Project Lifecycle Flow

To ensure accurate EVM calculations and seamless module integration, users should follow this 4-phase sequential flow:

1. **Phase 1: Initiation (Project Setup)**
   - Create project profile, define stakeholders, and upload master agreement/contract.
2. **Phase 2: Planning & Baseline (WBS & Cost)**
   - Create WBS & milestones, develop the Gantt Chart schedule.
   - Allocate manpower, equipment, and material resources.
   - Generate and lock the Project Cost Baseline (BoQ) based on these resources.
3. **Phase 3: Execution & Procurement (PO & HSE)**
   - Trigger Purchase Requisitions and POs based on the WBS materials.
   - Field engineers update task progress.
   - HSE and Quality inspectors perform site checks and log NCRs/Incidents.
4. **Phase 4: Control & Documentation (MoM, Invoices, Analytics)**
   - Log Minutes of Meeting (MoM) and submittals.
   - Generate progress-based Invoices.
   - The Analytics engine automatically generates the S-Curve and EVM metrics based on Actual Progress vs Planned Baseline.
