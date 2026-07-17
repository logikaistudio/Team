# Production Deployment Guide: EPCS (Enterprise Project Control System)

This document describes how to deploy the EPCS SaaS application stack, run database migrations locally, and transition to a serverless architecture on **Supabase**.

---

## 1. Local Database Verification

During local development, you should run a local PostgreSQL instance.

### A. Run Database Script
Bootstrap the local database schemas by executing the script in the database schema:
```bash
psql -U postgres -d epcs_local -f db/schema.sql
```

---

## 2. Supabase Serverless Migration

When the core application features are mature, migrate the local database structure directly to **Supabase Serverless**.

### A. Setup Connection URL
In your Supabase project dashboard:
1. Go to **Settings > Database**.
2. Retrieve the **URI Connection String** under transaction pooler mode (Port 6543) or session mode (Port 5432).
3. Update your `.env` variables:
```env
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.your-project-ref
DB_PASSWORD=your-secure-supabase-password
DB_NAME=postgres
```

### B. Migrate Tables & Triggers
Execute the `db/schema.sql` script directly inside the Supabase **SQL Editor** or run it from your command line targeting the Supabase URI endpoint.

### C. Enable Supabase Row-Level Security (RLS)
Supabase tables must have RLS turned on to ensure tenant separation. Execute the template schema code on all table spaces:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- (Verify RLS is active in Supabase > Database > Tables)
```

Configure Supabase security policies to isolate row access based on the current tenant UUID session:
```sql
CREATE POLICY tenant_isolation_policy ON projects
  FOR ALL
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
```

---

## 3. Node.js Express Production Launch

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```
2. **Build TypeScript Files**:
   ```bash
   npm run build
   ```
3. **Environment Setup**:
   Map all production keys in a secure environment vault (e.g., AWS Parameter Store, GCP Secrets, or Supabase Vaults). Ensure `NODE_ENV=production` is defined.
4. **Launch Server**:
   ```bash
   npm start
   ```

---

## 4. Frontend Web App Deployment (Vite + React)

Vite compiles a static Single Page Application (SPA) that can be hosted on serverless systems like Vercel, Netlify, or Firebase Hosting.

1. **Compile Static Assets**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. **Deploy Built Directory**:
   Distribute the generated `frontend/dist/` folder containing compiled assets.
3. **Configure Proxy Redirects**:
   Ensure API routing parameters point downstream towards your production Express backend endpoint.
