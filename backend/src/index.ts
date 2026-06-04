import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startEventReminderScheduler } from './services/event-reminder.service.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    // eslint-disable-next-line no-console
    console.log(
      `🚀 FitSocial API running at http://${env.HOST}:${env.PORT}/api/${env.API_VERSION}`,
    );

    // Start background schedulers
    startEventReminderScheduler();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
