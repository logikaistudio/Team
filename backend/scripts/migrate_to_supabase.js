/**
 * EPCS - Skrip Migrasi Database ke Supabase (Node.js)
 * ----------------------------------------------------
 * Menjalankan skrip ini akan:
 * 1. Menghubungkan ke database Supabase.
 * 2. Men-drop tabel EPCS yang sudah ada (CASCADE).
 * 3. Menjalankan db/schema.sql untuk membuat struktur lengkap + RLS.
 * 4. Menjalankan db/seed.sql untuk mengisi data default.
 *
 * Cara menjalankan (dari folder backend/):
 *   node scripts/migrate_to_supabase.js
 *
 * Atau dari root project:
 *   node backend/scripts/migrate_to_supabase.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DEFAULT_SUPABASE_URL = 'postgresql://postgres:p3h03lw4hyud1@db.oxqkukvavlqpyjdbprde.supabase.co:5432/postgres';

const supabaseUrl = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL;
// Pooler URLs (aws-*.pooler.supabase.com) are Postgres proxies and require
// special username formats; prefer the direct DATABASE_URL from Supabase.
const SUPABASE_DB = {
  connectionString: supabaseUrl,
  ssl: /supabase\.co|pooler\.supabase\.com/.test(supabaseUrl)
    ? { rejectUnauthorized: false }
    : undefined,
};

const ROOT_DIR = path.join(__dirname, '..', '..');
const SCHEMA_PATH = path.join(ROOT_DIR, 'db', 'schema.sql');
const SEED_PATH = path.join(ROOT_DIR, 'db', 'seed.sql');

const TABLES = [
  'payments', 'invoices', 'observations', 'incidents', 'ncrs', 'inspections',
  'mitigations', 'risks', 'approvals', 'document_versions', 'documents',
  'materials', 'equipment', 'manpower', 'purchase_orders', 'rfqs',
  'purchase_requisitions', 'vendors', 'cashflows', 'actual_costs', 'boq_items',
  'budgets', 's_curve_data', 'progress_updates', 'daily_reports',
  'task_dependencies', 'tasks', 'milestones', 'schedules', 'wbs',
  'project_members', 'projects', 'project_statuses', 'audit_logs',
  'user_roles', 'role_permissions', 'permissions', 'roles', 'users',
  'subscriptions', 'tenants', 'subscription_plans',
];

function readSql(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File SQL tidak ditemukan: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function stripPsqlMetaCommands(sql) {
  // Remove psql meta commands (\echo, \ir, \set, etc.) and inline comments used as psql markers
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*\\/.test(line))
    .join('\n');
}

async function dropTables(client) {
  console.log('▶ Membersihkan tabel lama di Supabase...');
  await client.query("SET session_replication_role = 'replica'");
  for (const table of TABLES) {
    await client.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
  }
  await client.query("SET session_replication_role = 'origin'");
  console.log('✅ Tabel lama berhasil dihapus.\n');
}

async function runSqlFile(client, label, filePath) {
  console.log(`▶ Menjalankan ${label}...`);
  let sql = readSql(filePath);
  sql = stripPsqlMetaCommands(sql);
  await client.query(sql);
  console.log(`✅ ${label} berhasil dijalankan.\n`);
}

async function verifyTables(client) {
  console.log('▶ Memverifikasi tabel inti...');
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    ORDER BY table_name
  `, [TABLES]);

  const found = new Set(res.rows.map((r) => r.table_name));
  const missing = TABLES.filter((t) => !found.has(t));

  if (missing.length > 0) {
    throw new Error(`Tabel berikut tidak ditemukan setelah migrasi: ${missing.join(', ')}`);
  }
  console.log(`✅ Semua ${TABLES.length} tabel terverifikasi.\n`);
}

async function migrate() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   MIGRASI DATABASE → SUPABASE        ║');
  console.log('╚══════════════════════════════════════╝\n');

  console.log('▶ Menghubungkan ke Supabase...');
  const supabase = new Client(SUPABASE_DB);

  try {
    await supabase.connect();
    console.log('✅ Terhubung ke Supabase!\n');

    await dropTables(supabase);
    await runSqlFile(supabase, 'schema.sql', SCHEMA_PATH);
    await runSqlFile(supabase, 'seed.sql', SEED_PATH);
    await verifyTables(supabase);

    console.log('╔══════════════════════════════════════╗');
    console.log('║  🎉  MIGRASI SELESAI DENGAN SUKSES!  ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('\nDatabase Supabase Anda sekarang memiliki struktur lengkap EPCS + data default.');
  } catch (err) {
    console.error('\n❌ GAGAL MIGRASI:', err.message);
    console.error('\nCoba periksa:');
    console.error('  1. Koneksi internet aktif dan Supabase project tidak di-pause.');
    console.error('  2. Password / DATABASE_URL sudah benar di .env atau skrip.');
    console.error('  3. Hak akses user postgres cukup untuk CREATE/DROP TABLE.');
    process.exitCode = 1;
    throw err;
  } finally {
    await supabase.end();
  }
}

migrate();
