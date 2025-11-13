import { db } from '../modules/shared/config/db.js';
import { logger } from '../modules/shared/config/logger.js';
import { hashPassword } from '../modules/shared/utils/password.js';

async function run() {
  const email = process.env.SUPERADMIN_EMAIL || process.argv[2];
  const password = process.env.SUPERADMIN_PASSWORD || process.argv[3];
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    logger.error('Usage: SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run seed:superadmin OR tsx src/scripts/seed_superadmin.ts <email> <password>');
    process.exit(1);
  }

  const hashed = await hashPassword(password);

  try {
    await db.query('BEGIN');
    const sql = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, 'superadmin')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    const { rows } = await db.query(sql, [name, email, hashed]);
    await db.query('COMMIT');
    const id = rows[0]?.id || null;
    logger.info({ id, email }, 'superadmin_seeded');
  } catch (err) {
    await db.query('ROLLBACK');
    logger.error({ err }, 'superadmin_seed_failed');
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
