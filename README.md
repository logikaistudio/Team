# EPCS - Enterprise Project Control System

EPCS adalah platform SaaS multi-tenant untuk manajemen proyek EPC (Engineering, Procurement, Construction) dan sektor infrastruktur lainnya. Dibangun dengan **React + Vite + TypeScript** di frontend dan **Express + TypeScript + PostgreSQL** di backend.

---

## Fitur Utama

- **Multi-Tenant SaaS**: Setiap tenant memiliki isolasi data melalui PostgreSQL Row-Level Security (RLS).
- **Manajemen Proyek**: Proyek, WBS, jadwal, tasks, milestones, dan dependensi.
- **Kontrol Biaya**: Budget, BOQ, actual costs, cashflow, dan Earned Value Management (EVM).
- **Procurement**: Vendor catalog, purchase requisitions, RFQ, dan purchase orders.
- **Dokumen & Approval**: Version control dokumen dan approval workflow.
- **Quality & HSE**: Inspections, NCRs, incidents, dan observations.
- **S-Curve & Analytics**: Visualisasi progress proyek dan dashboard BI.
- **RBAC**: Role-based access control dengan permissions yang fleksibel.

---

## Struktur Project

```
Team/
├── backend/              # Express + TypeScript API
│   ├── src/
│   │   ├── controllers/  # Express route handlers
│   │   ├── domain/       # Entity definitions
│   │   ├── middlewares/  # Auth, error handler
│   │   ├── repositories/ # Database repositories
│   │   ├── types/        # TypeScript types
│   │   ├── usecases/     # Business logic
│   │   └── utils/        # Logger, security, validation
│   ├── tests/            # Jest tests
│   └── vercel.json       # Vercel serverless config
├── frontend/             # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── store/        # Zustand state management
│   └── vercel.json       # (gunakan root vercel.json untuk deploy)
├── db/
│   ├── schema.sql        # Skema database lengkap + RLS
│   ├── seed.sql          # Data default (plans, roles, permissions)
│   └── migrate_to_supabase.sql  # Runner migrasi ke Supabase
└── vercel.json           # Vercel config untuk frontend
```

---

## Prasyarat

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://postgresql.org/) 14+ (lokal) atau akun [Supabase](https://supabase.com/)
- Akun [Vercel](https://vercel.com/) (untuk deployment)
- Akun [GitHub](https://github.com/)

---

## Development Lokal

### 1. Clone Repository

```bash
git clone https://github.com/logikaistudio/Team.git
cd Team
```

### 2. Setup Database Lokal

Buat database PostgreSQL lokal:

```bash
createdb epcs_local
```

Lalu jalankan schema dan seed:

```bash
psql -h 127.0.0.1 -p 5432 -U $(whoami) -d epcs_local -f db/schema.sql
psql -h 127.0.0.1 -p 5432 -U $(whoami) -d epcs_local -f db/seed.sql
```

### 3. Konfigurasi Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` sesuai database lokal Anda:

```env
PORT=8081
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_password
DB_NAME=epcs_local
DB_SSL=false

JWT_SECRET=change_this_to_a_random_string
JWT_REFRESH_SECRET=change_this_to_another_random_string
```

Install dependencies dan jalankan:

```bash
npm install
npm run dev
```

Backend akan berjalan di http://localhost:8081  
Swagger API docs: http://localhost:8081/api-docs

### 4. Konfigurasi Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend akan berjalan di http://localhost:3000 (atau port alternatif jika 3000 digunakan).

---

## Deploy ke Supabase

### 1. Jalankan Schema & Seed

Buka Supabase Dashboard → SQL Editor, lalu jalankan:

1. Copy-paste isi file `db/schema.sql` → Run
2. Copy-paste isi file `db/seed.sql` → Run

Atau via `psql` dari terminal:

```bash
PGPASSWORD='your_supabase_password' psql \
  -h db.your-project-ref.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f db/migrate_to_supabase.sql
```

Ganti `your-project-ref` dan `your_supabase_password` dengan nilai dari Supabase Dashboard.

### 2. Update Environment Variables

Setelah schema siap, update `backend/.env` untuk production:

```env
DATABASE_URL=postgresql://postgres:your_password@db.your-project-ref.supabase.co:5432/postgres
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=postgres
DB_SSL=true

JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret
```

---

## Deploy ke Vercel

### Deploy Frontend

1. Buka https://vercel.com/new
2. Import repository `logikaistudio/Team`
3. **Root Directory**: `frontend`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. Tambahkan environment variable:
   - `VITE_API_BASE_URL`: URL backend Anda, contoh `https://team-backend.vercel.app/api`
8. Klik **Deploy**

### Deploy Backend

1. Buka https://vercel.com/new
2. Import repository yang sama
3. **Root Directory**: `backend`
4. **Framework Preset**: Other
5. Tambahkan semua environment variables dari `backend/.env.example`:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `GOOGLE_CLIENT_ID` (opsional)
   - `GOOGLE_CLIENT_SECRET` (opsional)
   - `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` (opsional)
   - `GEMINI_API_KEY` atau `OPENAI_API_KEY` (opsional)
6. Klik **Deploy**

### Update Frontend API URL

Setelah backend deploy, salin URL backend dan update `VITE_API_BASE_URL` di project frontend Vercel, lalu redeploy frontend.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Deskripsi |
|----------|-----------|
| `PORT` | Port server backend |
| `NODE_ENV` | `development` atau `production` |
| `DATABASE_URL` | Connection string PostgreSQL |
| `DB_HOST` | Host database |
| `DB_PORT` | Port database |
| `DB_USER` | User database |
| `DB_PASSWORD` | Password database |
| `DB_NAME` | Nama database |
| `DB_SSL` | `true` untuk Supabase, `false` untuk lokal |
| `JWT_SECRET` | Secret untuk access token |
| `JWT_REFRESH_SECRET` | Secret untuk refresh token |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `S3_ENDPOINT` | Endpoint S3-compatible storage |
| `S3_ACCESS_KEY_ID` | S3 access key |
| `S3_SECRET_ACCESS_KEY` | S3 secret key |
| `S3_BUCKET_NAME` | Nama bucket S3 |
| `GEMINI_API_KEY` | API key Google Gemini |
| `OPENAI_API_KEY` | API key OpenAI |

### Frontend (`frontend/.env.production`)

| Variable | Deskripsi |
|----------|-----------|
| `VITE_API_BASE_URL` | Base URL backend API |

---

## Skema Database

Lihat file lengkap:
- [db/schema.sql](db/schema.sql) — struktur tabel, index, triggers, dan RLS policies
- [db/seed.sql](db/seed.sql) — data default

Module database:
1. Core SaaS (tenants, users, roles, permissions)
2. Project (projects, WBS, schedules, tasks)
3. Progress (daily reports, progress updates, S-curve)
4. Cost (budgets, BOQ, actual costs, cashflows)
5. Procurement (vendors, PR, RFQ, PO)
6. Resources (manpower, equipment, materials)
7. Documents & Approvals
8. Risk & Mitigations
9. Quality & HSE
10. Billing & Payments

---

## API Documentation

Saat backend berjalan, buka Swagger UI di:

```
http://localhost:8081/api-docs
```

---

## Testing

Jalankan unit test backend:

```bash
cd backend
npm test
```

---

## Lisensi

Private — untuk keperluan internal Logikai Studio.

---

## Kontak

**Logikai Studio**  
https://github.com/logikaistudio
