/**
 * Closes event discussions once the 24h post-event grace period ends.
 * Runs every 5 minutes alongside other schedulers.
 */

import { closeExpiredDiscussions } from './messaging-event.service.js';

const INTERVAL_MS = 5 * 60 * 1000;

export function startDiscussionCleanupScheduler() {
  const tick = async () => {
    try {
      const closed = await closeExpiredDiscussions();
      if (closed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[discussion-cleanup] Closed ${closed} event discussion(s)`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[discussion-cleanup] Error:', err);
    }
  };

  void tick();
  const handle = setInterval(() => void tick(), INTERVAL_MS);
  return handle;
}
