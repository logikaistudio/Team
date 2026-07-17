/**
 * EPCS - Skrip Migrasi Database ke Supabase
 * ------------------------------------------
 * Menjalankan skrip ini akan:
 * 1. Menghubungkan ke database Supabase
 * 2. Membuat semua tabel di Supabase menggunakan db/schema.sql
 * 3. Menjalankan seed default data di Supabase
 *
 * Cara menjalankan (dari folder backend/):
 *   node migrate_to_supabase.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
