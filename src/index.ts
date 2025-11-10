import { createServer } from 'http';
import app from './app.js';
import { env } from './modules/shared/config/env.js';
import { logger } from './modules/shared/config/logger.js';

const server = createServer(app);

const port = env.PORT;
server.listen(port, () => {
  logger.info({ port, env: env.NODE_ENV }, 'server_started');
});
