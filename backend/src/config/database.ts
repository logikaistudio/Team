import { Pool, PoolClient } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

// Support both DATABASE_URL (Supabase direct) and individual DB_* variables
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: config.db.host,
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
