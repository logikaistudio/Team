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
- Akun [Supabase](https://supabase.com/)
- Akun [Vercel](https://vercel.com/) (untuk deployment)
- Akun [GitHub](https://github.com/)

---

## Deploy ke Supabase

### 1. Jalankan Schema & Seed di Supabase

1. Buka Supabase Dashboard → SQL Editor.
2. Jalankan isi file `db/schema.sql`.
3. Jalankan isi file `db/seed.sql`.

### 2. Set Environment Variables Backend

Setelah schema siap, isi `backend/.env` atau environment variables Vercel backend:

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

### 3. Set Environment Variables Frontend

Frontend production hanya perlu mengarah ke backend Vercel:

```env
VITE_API_BASE_URL=/api
```

---

## Development Lokal

Jika Anda masih ingin menjalankan lokal untuk debugging, backend dan frontend tetap bisa dijalankan, tetapi database produksi tetap harus Supabase.

### 1. Clone Repository

```bash
git clone https://github.com/logikaistudio/Team.git
cd Team
```

### 2. Backend Development

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3. Frontend Development

```bash
cd ../frontend
npm install
npm run dev
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
   - `VITE_API_BASE_URL`: `/api`
8. Klik **Deploy**

### Deploy Backend

1. Buka https://vercel.com/new
2. Import repository yang sama
3. **Root Directory**: `backend`
4. **Framework Preset**: Other
5. Tambahkan semua environment variables backend produksi yang mengarah ke Supabase:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `DB_SSL=true`
6. Klik **Deploy**

### Update Frontend API URL

Setelah backend deploy, pastikan `VITE_API_BASE_URL` tetap `/api` lalu redeploy frontend.

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
