# Implementation Tasks Checklist - EPCS Development

- [x] **Phase 1: Database Setup (`schema.sql`)**
    - [x] Create `schema.sql` under `db/` folder containing core SaaS schemas (tenants, billing, roles, users).
    - [x] Add project control structures (projects, project members, WBS, tasks, milestones).
    - [x] Add tracking & finance schemas (daily reports, S-Curve data, budgets, cashflows, actuals).
    - [x] Add supply & resource schemas (vendors, RFQs, POs, manpower, equipment, materials).
    - [x] Add quality, HSE, document, and workflow schemas.
    - [x] Implement Row-Level Security (RLS) policies on all tenant tables and update-triggers.

- [x] **Phase 2: Backend Core Structure**
    - [x] Initialize `backend/package.json` and configure compiler in `tsconfig.json`.
    - [x] Set up Winston/Pino logger and unified error handling middleware.
    - [x] Create Database connection pool with tenant RLS middleware.
    - [x] Implement core security features: JWT validation, bcrypt utility, Google OAuth mapping.

- [x] **Phase 3: Clean Architecture Use Cases & Repositories**
    - [x] Implement Domain entities & Repository interfaces.
    - [x] Write DB Repositories (Tenants, Users, Projects, Tasks).
    - [x] Write Auth Use Cases (login, register, refresh tokens, Google sign-in).

- [x] **Phase 4: Advanced Calculation Engines**
    - [x] Write **S-Curve Engine** to aggregate cumulative progress over time.
    - [x] Write **Earned Value Management (EVM)** service (SPI, CPI, SV, CV).
    - [x] Write **Project Health Score** weighted aggregator.
    - [x] Implement **AI Assistant & Predictors** integration using Gemini/OpenAI SDK.

- [x] **Phase 5: Document Control, Procurement & Safety Services**
    - [x] Write Document Management controller (S3 client + metadata tracking + version controls).
    - [x] Create Procurement workflows (vendor catalogs, RFQ bidding, PO creations).
    - [x] Implement Quality and HSE tracking (Inspections, NCRs, Incident reports).

- [x] **Phase 6: REST API Controllers & Router Setup**
    - [x] Build Express routers for all functional blocks.
    - [x] Integrate Zod schema validations for client inputs.
    - [x] Create Swagger (OpenAPI 3.0) API specification sheet.

- [x] **Phase 7: Frontend Foundation & Layout (React + Tailwind)**
    - [x] Initialize frontend project files and Tailwind layout.
    - [x] Construct main sidebar/topbar layout matching Jira/Linear visual guides (dark/light themes).
    - [x] Set up routing using React Router Dom and authentication state using Zustand.

- [x] **Phase 8: Frontend Pages & Charts Integration**
    - [x] Implement Login, Register, Tenant Setup, and Settings views.
    - [x] Build BI Dashboard with Recharts visual graphs (S-Curves, Cost bars, Resource allocators).
    - [x] Implement WBS hierarchical view, interactive Gantt visualizer, and EVM monitors.
    - [x] Build Document versioning & approval logs screens.
    - [x] Create Procurement, HSE, and Quality log lists (using TanStack Table).
    - [x] Create AI assistant panel for auto-report generations and delay forecasts.

- [x] **Phase 9: Deployment & Verification**
    - [x] Draft `deployment_guide.md` with multi-tenant config steps.
    - [x] Write backend unit tests using Jest/Supertest.
    - [x] Verify frontend dashboard styling, API endpoints connectivity, and RLS checks.
