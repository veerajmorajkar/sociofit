import { lt } from 'drizzle-orm';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { refreshTokens, passwordResetTokens, otpVerifications } from './db/schema.js';
import { startEventReminderScheduler } from './services/event-reminder.service.js';
import { startDiscussionCleanupScheduler } from './services/discussion-cleanup.service.js';
import { startEventStatusScheduler } from './services/event-status.service.js';
import { startCounterRepairScheduler } from './services/counter-repair.service.js';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function startRefreshTokenCleanupScheduler(): NodeJS.Timeout {
  const tick = async () => {
    try {
      const now = new Date();
      await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, now));
      await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, now));
      await db.delete(otpVerifications).where(lt(otpVerifications.expiresAt, now));
    } catch (err) {
      console.error('[token-cleanup] Error:', err);
    }
  };

  void tick();
  return setInterval(() => void tick(), SIX_HOURS_MS);
}

async function start() {
  const app = await buildApp();
  const schedulerHandles: NodeJS.Timeout[] = [];

  app.addHook('onClose', async () => {
    for (const handle of schedulerHandles) {
      clearInterval(handle);
    }
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    // eslint-disable-next-line no-console
    console.log(
      `🚀 FitSocial API running at http://${env.HOST}:${env.PORT}/api/${env.API_VERSION}`,
    );

    schedulerHandles.push(startEventReminderScheduler());
    schedulerHandles.push(startDiscussionCleanupScheduler());
    schedulerHandles.push(startEventStatusScheduler());
    schedulerHandles.push(startRefreshTokenCleanupScheduler());
    schedulerHandles.push(startCounterRepairScheduler());
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
