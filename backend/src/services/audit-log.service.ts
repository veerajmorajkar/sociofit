import { db } from '../config/database.js';
import { authAuditLog } from '../db/schema.js';

export type AuthAuditEventType =
  | 'account_link_requested'
  | 'account_linked'
  | 'refresh_reuse_detected'
  | 'logout_all'
  | 'session_revoked'
  | 'password_reset'
  | 'password_changed'
  | 'email_changed'
  | 'phone_changed'
  | 'email_verified';

interface LogAuthEventParams {
  userId?: string | null;
  secondaryUserId?: string | null;
  eventType: AuthAuditEventType;
  method?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/** Best-effort audit trail for identity/security-relevant events. Never throws —
 *  a logging failure must not block the auth flow it's observing. */
export async function logAuthEvent(params: LogAuthEventParams): Promise<void> {
  try {
    await db.insert(authAuditLog).values({
      userId: params.userId ?? null,
      secondaryUserId: params.secondaryUserId ?? null,
      eventType: params.eventType,
      method: params.method ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error('[audit-log] Failed to record auth event:', params.eventType, err);
  }
}
