/**
 * EPCS - Skrip Migrasi Database ke Supabase
 * ------------------------------------------
 * Menjalankan skrip ini akan:
 * 1. Menghubungkan ke database lokal (epcs_local) 
 * 2. Membuat semua tabel di Supabase menggunakan db/schema.sql
 * 3. Menyalin semua data dari lokal ke Supabase
 *
 * Cara menjalankan (dari folder backend/):
 *   node migrate_to_supabase.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Konfigurasi koneksi
const LOCAL_DB = {
  host: '127.0.0.1',
  port: 5432,
  user: 'hoeltzie',    // ganti jika berbeda
  password: '',        // ganti jika ada password
  database: 'epcs_local',
};

const SUPABASE_DB = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:p3h03lw4hyud1@db.oxqkukvavlqpyjdbprde.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
};

// Urutan tabel — harus sesuai urutan foreign key (parent dulu)
const TABLES = [
  'subscription_plans',
  'tenants',
  'subscriptions',
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'audit_logs',
  'project_statuses',
  'projects',
  'project_members',
  'wbs',
  'schedules',
  'tasks',
  'task_dependencies',
  'milestones',
  'daily_reports',
  'progress_updates',
  's_curve_data',
  'budgets',
  'boq_items',
  'actual_costs',
  'cashflows',
  'vendors',
  'purchase_requisitions',
  'rfqs',
  'purchase_orders',
  'manpower',
  'equipment',
  'materials',
  'documents',
  'document_versions',
  'approvals',
  'risks',
  'mitigations',
  'inspections',
  'ncrs',
  'incidents',
  'observations',
  'invoices',
  'payments',
];

async function migrate() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   MIGRASI DATABASE → SUPABASE        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ── Inisialisasi koneksi Supabase saja (tanpa lokal) ──
  console.log('▶ Menghubungkan ke Supabase...');
  const supabase = new Client(SUPABASE_DB);

  try {
    await supabase.connect();
    console.log('✅ Terhubung ke Supabase!\n');

    // ── STEP 1: Drop semua tabel yang ada (bersihkan) ──
    console.log('▶ Membersihkan tabel lama di Supabase...');
    await supabase.query("SET session_replication_role = 'replica'");
    for (const table of [...TABLES].reverse()) {
      await supabase.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    console.log('✅ Tabel lama berhasil dihapus.\n');

    // ── STEP 2: Jalankan schema.sql ──
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`File schema tidak ditemukan: ${schemaPath}`);
    }

    console.log(`▶ Membuat struktur tabel dari: ${schemaPath}`);
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');
    // Bersihkan perintah psql khusus (\i, \c, dll.)
    schemaSql = schemaSql.replace(/^\\[^\n]*/gm, '').trim();

    await supabase.query(schemaSql);
    console.log('✅ Struktur tabel berhasil dibuat.\n');

    // ── STEP 3: Tambahkan kolom tambahan yang dibuat via index.ts ──
    console.log('▶ Menambahkan kolom kustom (progress_percent)...');
    await supabase.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0.00');
    await supabase.query('ALTER TABLE wbs ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0.00');
    console.log('✅ Kolom kustom berhasil ditambahkan.\n');

    // ── STEP 4: Coba transfer data dari lokal (opsional) ──
    console.log('▶ Mencoba menghubungkan ke database lokal untuk transfer data...');
    let local = null;
    try {
      local = new Client(LOCAL_DB);
      await local.connect();
      console.log('✅ Terhubung ke database lokal. Memulai transfer data...\n');

      await supabase.query("SET session_replication_role = 'replica'");

      for (const table of TABLES) {
        let count = 0;
        try {
          const res = await local.query(`SELECT * FROM "${table}"`);
          if (res.rows.length === 0) {
            console.log(`   [${table}] kosong — dilewati.`);
            continue;
          }

          for (const row of res.rows) {
            const keys = Object.keys(row);
            const cols = keys.map(k => `"${k}"`).join(', ');
            const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
            const values = keys.map(k => row[k]);
            await supabase.query(
              `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`,
              values
            );
            count++;
          }
          console.log(`   ✅ [${table}] — ${count} baris berhasil ditransfer.`);
        } catch (err) {
          console.warn(`   ⚠️  [${table}] gagal (mungkin tidak ada di lokal): ${err.message}`);
        }
      }

      await supabase.query("SET session_replication_role = 'origin'");
      await local.end();
      console.log('\n✅ Transfer data selesai!');

    } catch (localErr) {
      console.warn(`\n⚠️  Tidak dapat terhubung ke database lokal: ${localErr.message}`);
      console.log('   (Normal jika database lokal tidak berjalan — skema di Supabase tetap berhasil dibuat.)');
    }

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  🎉  MIGRASI SELESAI DENGAN SUKSES!  ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('\nBackend Anda sekarang siap menggunakan Supabase.');
    console.log('Silakan restart backend: npm run dev\n');

  } catch (err) {
    console.error('\n❌ GAGAL:', err.message);
    console.error('\nPastikan:');
    console.error('  1. Koneksi internet Anda aktif.');
    console.error('  2. Supabase project Anda aktif (tidak di-pause).');
    console.error('  3. Password database Supabase sudah benar.');
  } finally {
    await supabase.end();
  }
}

migrate();
