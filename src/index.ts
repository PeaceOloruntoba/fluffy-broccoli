import { createServer } from 'http';
import app from './app.js';
import { env } from './modules/shared/config/env.js';
import { logger } from './modules/shared/config/logger.js';
import { db } from './modules/shared/config/db.js';

async function bootstrap() {
  try {
    // Fail fast if DB is not reachable
    await db.query('SELECT 1');
    const server = createServer(app);
    const port = env.PORT;
    server.listen(port, () => {
      logger.info({ port, env: env.NODE_ENV }, 'server_started');
    });
  } catch (err) {
    logger.error({ err }, 'database_connection_failed');
    process.exit(1);
  }
}

bootstrap();
