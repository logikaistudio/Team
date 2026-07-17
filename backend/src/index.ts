import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { authRouter } from './controllers/auth.controller';
import { errorHandler } from './middlewares/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { pool } from './config/database';

const app = express();
const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes Setup
app.use('/api/auth', authRouter);

// Load optional routers defensively so auth endpoints remain available
// even if one module fails at import/runtime in serverless deployment.
const optionalRoutersEnabled =
  process.env.ENABLE_OPTIONAL_ROUTERS === '1' ||
  process.env.ENABLE_OPTIONAL_ROUTERS === 'true' ||
  !isVercelRuntime;

if (optionalRoutersEnabled) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { projectRouter } = require('./controllers/project.controller');
    app.use('/api/projects', projectRouter);
  } catch (err: any) {
    logger.error(`Failed to load project router: ${err?.message || err}`);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { analyticsRouter } = require('./controllers/analytics.controller');
    app.use('/api/analytics', analyticsRouter);
  } catch (err: any) {
    logger.error(`Failed to load analytics router: ${err?.message || err}`);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { enterpriseRouter } = require('./controllers/enterprise.controller');
    app.use('/api/enterprise', enterpriseRouter);
  } catch (err: any) {
    logger.error(`Failed to load enterprise router: ${err?.message || err}`);
  }
} else {
  logger.warn('Optional routers are disabled in this runtime (auth-only mode).');
}

// Serve uploaded documents statically
app.use('/uploads', express.static('uploads'));

// Swagger docs are optional in serverless runtime; avoid crashing when json import/bundle differs.
let swaggerDocument: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  swaggerDocument = require('../swagger.json');
} catch (err) {
  logger.warn('Swagger document not available in current runtime. /api-docs disabled.');
}

if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'UP', mode: optionalRoutersEnabled ? 'full' : 'auth-only', timestamp: new Date() });
});

// Centralized Error Boundary
app.use(errorHandler);

// Launch HTTP server only for local runtime. In Vercel, export app without listen().
if (process.env.NODE_ENV !== 'test' && !isVercelRuntime) {
  (async () => {
    try {
      // Skip auto-migrations when running against an unreachable network host
      // (e.g. Supabase direct host from a restricted network). Schema/seed should
      // be applied explicitly via db/migrate_to_supabase.sql or
      // backend/scripts/migrate_to_supabase.js from a machine with DB access.
      try {
        await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0.00');
        await pool.query('ALTER TABLE wbs ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0.00');

        // Create documents table only if the schema does not already define it.
        const docTable = await pool.query(`
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'documents'
        `);
        if (docTable.rowCount === 0) {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS documents (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id UUID NOT NULL,
              project_id UUID NOT NULL,
              name VARCHAR(255) NOT NULL,
              type VARCHAR(100) NOT NULL,
              size INTEGER NOT NULL,
              file_path VARCHAR(500) NOT NULL,
              uploaded_by UUID,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
          `);
        }

        logger.info('Database schema verified (including documents table).');
      } catch (migrationErr: any) {
        logger.warn('Database auto-migration skipped (DB may be unreachable): ' + migrationErr.message);
      }
    } catch (err) {
      logger.error('Failed to run auto-migration for progress_percent', err);
    }
    app.listen(config.port, () => {
      logger.info(`EPCS Backend Server listening at http://localhost:${config.port}`);
      if (swaggerDocument) {
        logger.info(`Swagger API Documentation available at http://localhost:${config.port}/api-docs`);
      }
    });
  })();
}

export { app };
export default app;
