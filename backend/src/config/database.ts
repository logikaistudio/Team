import { Pool, PoolClient } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

function cleanEnv(value?: string): string {
  return (value || '').trim().replace(/^['\"]|['\"]$/g, '');
}

function isValidPgConnectionString(value: string): boolean {
  if (/\s/.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') &&
      Boolean(parsed.hostname) &&
      !parsed.hostname.includes('/')
    );
  } catch {
    return false;
  }
}

function isLikelyWrongSupabaseHost(hostname: string): boolean {
  // Common mistake: using "postgres.<project-ref>" as host (this is usually username).
  return /^postgres\.[a-z0-9-]+$/i.test(hostname);
}

// ─── Resolve the connection string ───────────────────────────────────────────
//
// Priority (highest → lowest):
//   1. SUPABASE_DB_URL         – pooler URL you paste from Supabase Dashboard
//   2. DATABASE_URL            – generic Postgres URL (Vercel / Railway / etc.)
//   3. POSTGRES_URL_NON_POOLING– Vercel Postgres (direct)
//   4. POSTGRES_URL            – Vercel Postgres (pooler)
//
// Supabase direct-DB host (db.<ref>.supabase.co : 5432) is blocked from
// Vercel serverless functions.  Always use the Transaction Pooler URL:
//   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
//
// Set SUPABASE_DB_URL (or DATABASE_URL) to that pooler URL in Vercel →
// Project Settings → Environment Variables.
//
const rawConnectionCandidates = [
  { key: 'SUPABASE_DB_URL', value: cleanEnv(process.env.SUPABASE_DB_URL) },
  { key: 'DATABASE_URL', value: cleanEnv(process.env.DATABASE_URL) },
  { key: 'POSTGRES_URL_NON_POOLING', value: cleanEnv(process.env.POSTGRES_URL_NON_POOLING) },
  { key: 'POSTGRES_URL', value: cleanEnv(process.env.POSTGRES_URL) },
];

const validConnectionCandidate = rawConnectionCandidates.find(
  (item) => item.value && isValidPgConnectionString(item.value)
);

const invalidConnectionCandidates = rawConnectionCandidates
  .filter((item) => item.value && !isValidPgConnectionString(item.value))
  .map((item) => item.key);

if (invalidConnectionCandidates.length > 0) {
  logger.warn(
    `[DB] Ignoring malformed connection URL in: ${invalidConnectionCandidates.join(', ')}. ` +
    'Expected format: postgresql://user:password@host:port/database'
  );
}

const connectionString: string = validConnectionCandidate?.value || '';

const hasDatabaseUrl = Boolean(connectionString);

// Detect if the URL still points to the direct DB host (db.*.supabase.co).
// Vercel cannot reach that host — warn loudly so it shows up in function logs.
if (isProduction && hasDatabaseUrl) {
  try {
    const parsed = new URL(connectionString);
    if (isLikelyWrongSupabaseHost(parsed.hostname)) {
      logger.error(
        '[DB] DATABASE_URL host looks like a Supabase username, not a host ' +
        `(${parsed.hostname}). Use Supabase pooler host like ` +
        'aws-0-<region>.pooler.supabase.com with port 6543.'
      );
    }

    if (/^db\.[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)) {
      logger.error(
        '[DB] DATABASE_URL points to the Supabase DIRECT host ' +
        `(${parsed.hostname}).  Vercel cannot reach this host. ` +
        'Replace it with the Transaction Pooler URL from Supabase → ' +
        'Project Settings → Database → Connection string → Transaction mode ' +
        '(port 6543).  Format: ' +
        'postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres'
      );
    }
  } catch {
    // Non-URL format – ignore
  }
}

// ─── Individual DB_* parts (development / Docker fallback) ───────────────────
const hasDbParts = Boolean(
  process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME
);

const resolvedDbHost = cleanEnv(process.env.DB_HOST || config.db.host);
const resolvedDbUser = cleanEnv(process.env.DB_USER || config.db.user);
const resolvedDbPassword = cleanEnv(process.env.DB_PASSWORD || config.db.password);
const resolvedDbName = cleanEnv(process.env.DB_NAME || config.db.database);

const dbHostLooksInvalid = /\s|\//.test(resolvedDbHost) || resolvedDbHost.includes('@');
if (!hasDatabaseUrl && hasDbParts && dbHostLooksInvalid) {
  logger.error(
    `[DB] DB_HOST appears invalid: "${resolvedDbHost}". ` +
    'Use only host name (example: aws-0-us-east-1.pooler.supabase.com) or set SUPABASE_DB_URL/DATABASE_URL.'
  );
}

if (isProduction && !hasDatabaseUrl && !hasDbParts) {
  logger.error(
    '[DB] No database connection configured for production. ' +
    'Set SUPABASE_DB_URL (or DATABASE_URL) in Vercel → Environment Variables.'
  );
}

// ─── Build pool config ────────────────────────────────────────────────────────
const poolConfig = hasDatabaseUrl
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,                       // keep low for serverless (connection limit)
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }
  : {
      host: resolvedDbHost,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: resolvedDbUser,
      password: resolvedDbPassword,
      database: resolvedDbName,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    };

export const pool = new Pool(poolConfig as any);

pool.on('error', (err) => {
  logger.error('[DB] Unexpected error on idle database client', { error: err.message });
});

/**
 * Execute a set of database queries bound to a specific tenant's context.
 * Sets the 'app.current_tenant_id' session variable inside a local transaction.
 */
export async function executeInTenantSession<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Set tenant context for PostgreSQL Row-Level Security (RLS)
    await client.query({
      text: 'SELECT set_config($1, $2, true)',
      values: ['app.current_tenant_id', tenantId],
    });

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
