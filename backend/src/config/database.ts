import { Pool, PoolClient } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';
const supabaseBaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const supabaseRefMatch = supabaseBaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
const derivedSupabaseHost = supabaseRefMatch ? `db.${supabaseRefMatch[1]}.supabase.co` : '';
const rawDbHost = (process.env.DB_HOST || '').trim();
const normalizedDbHost = rawDbHost
  .replace(/^https?:\/\//i, '')
  .replace(/\/.*$/, '')
  .replace(/:\d+$/, '');
const shouldPreferDerivedHost = Boolean(
  isProduction &&
  derivedSupabaseHost &&
  normalizedDbHost &&
  normalizedDbHost.toLowerCase() !== derivedSupabaseHost.toLowerCase()
);
const effectiveDbHost = shouldPreferDerivedHost
  ? derivedSupabaseHost
  : (normalizedDbHost || derivedSupabaseHost || config.db.host);

const rawDatabaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  '';
const databaseUrl = rawDatabaseUrl.trim();
const hasDatabaseUrl = Boolean(databaseUrl);
const hasDbParts = Boolean(effectiveDbHost && process.env.DB_USER && process.env.DB_NAME);
const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(effectiveDbHost || '');

if (isProduction && !rawDbHost && derivedSupabaseHost) {
  logger.warn(`DB_HOST is not set. Using derived Supabase DB host: ${derivedSupabaseHost}`);
}

if (shouldPreferDerivedHost) {
  logger.warn(`DB_HOST (${normalizedDbHost}) mismatches SUPABASE_URL. Using derived host ${derivedSupabaseHost}.`);
}

if (isProduction && !hasDatabaseUrl && !hasDbParts) {
  logger.error('Database configuration is missing in production. Set DATABASE_URL or DB_HOST/DB_USER/DB_NAME in Vercel.');
}

if (isProduction && !hasDatabaseUrl && isLocalHost) {
  logger.error('Production DB_HOST points to localhost/127.0.0.1. Update it to your Supabase host.');
}

// Support both DATABASE_URL (Supabase direct) and individual DB_* variables in development
const poolConfig = hasDatabaseUrl
  ? {
  connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: effectiveDbHost,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

export const pool = new Pool(poolConfig as any);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', { error: err.message });
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
