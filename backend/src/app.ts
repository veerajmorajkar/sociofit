import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoute } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { postRoutes } from './routes/posts.js';
import { uploadRoutes } from './routes/upload.js';
import { userRoutes } from './routes/users.js';
import { messageRoutes } from './routes/messages.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test'
      ? {
          level: env.NODE_ENV === 'production' ? 'info' : 'debug',
          transport:
            env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
              : undefined,
          redact: ['req.headers.authorization', 'req.body.password'],
        }
      : false,
  });

  // Security
  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Routes
  const prefix = `/api/${env.API_VERSION}`;
  await app.register(healthRoute, { prefix });
  await app.register(authRoutes, { prefix: `${prefix}/auth` });
  await app.register(postRoutes, { prefix: `${prefix}/posts` });
  await app.register(uploadRoutes, { prefix: `${prefix}/upload` });
  await app.register(userRoutes, { prefix: `${prefix}/users` });
  await app.register(messageRoutes, { prefix: `${prefix}/messages` });

  return app;
}
