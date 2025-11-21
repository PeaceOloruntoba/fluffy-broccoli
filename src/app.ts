import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import pinoHttpModule from 'pino-http';
import { env } from './modules/shared/config/env.js';
import { logger } from './modules/shared/config/logger.js';
import { rateLimiter } from './modules/shared/middlewares/rateLimit.js';
import router from './routes/index.js';
import { errorHandler, notFoundHandler } from './modules/shared/middlewares/error.js';
import { getCorsOptions } from './modules/shared/config/cors.js';

const pinoHttp = (pinoHttpModule as any).default ?? (pinoHttpModule as any);

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(getCorsOptions()));
app.use(rateLimiter);

if (env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

app.use('/api/v1', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
