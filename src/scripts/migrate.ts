import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../modules/shared/config/db.js';
import { logger } from '../modules/shared/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureMigrationsTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, run_on TIMESTAMPTZ NOT NULL DEFAULT now())`);
}

async function run() {
  try {
    await ensureMigrationsTable();
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const name = file;
      const { rows } = await db.query('SELECT 1 FROM _migrations WHERE name=$1', [name]);
      if (rows.length) {
        logger.info({ name }, 'migration_skipped');
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info({ name }, 'migration_running');
      await db.query('BEGIN');
      try {
        await db.query(sql);
        await db.query('INSERT INTO _migrations(name) VALUES ($1)', [name]);
        await db.query('COMMIT');
        logger.info({ name }, 'migration_done');
      } catch (err) {
        await db.query('ROLLBACK');
        logger.error({ err, name }, 'migration_failed');
        throw err;
      }
    }
  } finally {
    await db.end();
  }
}

run().catch((e) => {
  logger.error({ err: e }, 'migrations_error');
  process.exit(1);
});
