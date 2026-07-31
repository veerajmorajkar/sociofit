# Email OTP setup (Mumbai Fitness Mafia)

This documents the **email-only** verification flow. Phone/SMS (MSG91/Twilio) is intentionally out of scope until you add a provider later.

## What it does

1. **Signup** (`POST /auth/register`) creates the user with `isVerified=false`, emails a 6-digit code, and returns `{ needsEmailVerification, email, maskedEmail }` — **no session tokens**.
2. **Verify** (`POST /auth/verify-email` with `{ email, code }`) marks `isVerified=true` and issues the normal login tokens.
3. **Resend** (`POST /auth/resend-verification` with `{ email }`) always returns a generic success message (no account enumeration).
4. **Login** of an unverified password account returns the same `needsEmailVerification` payload so the app can open the verify screen.
5. **Gating**: create event + send/create messages require verification (`403` + `code: EMAIL_VERIFICATION_REQUIRED`).

OAuth (Google/Apple) users are marked verified when their provider email is trusted — they skip this OTP.

Existing accounts that already have `isVerified=true` keep working (grandfathered).

## Resend checklist (you do this once)

1. Create an account at [https://resend.com](https://resend.com).
2. Add your domain (e.g. `mumbaifitnessmafia.com`) and add the DNS records Resend shows.
3. Wait until the domain shows **Verified**.
4. Create an API key.
5. Put it in `backend/.env`:

```env
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Mumbai Fitness Mafia <noreply@mumbaifitnessmafia.com>
```

`EMAIL_FROM` must use a domain you verified in Resend. Until the domain is verified, Resend only delivers to the email you used to sign up for Resend.

### Local development without Resend

If `RESEND_API_KEY` is empty and `NODE_ENV` is not `production`, the API **logs the code to the server console**:

```text
[email:dev] Signup verification code for you@example.com: 123456
```

Copy that into the app’s verify screen.

## Mobile flow

1. Complete signup form → API returns `needsEmailVerification`.
2. App opens `/(auth)/verify-email`.
3. User enters code (or taps Resend).
4. On success → tokens stored → home tabs.

## API summary

| Endpoint | Body | Success |
|----------|------|---------|
| `POST /auth/register` | existing register fields | `201` + `needsEmailVerification` |
| `POST /auth/verify-email` | `{ email, code }` | `200` + tokens |
| `POST /auth/resend-verification` | `{ email }` | `200` + generic `{ sent: true }` |
| `POST /auth/login` (unverified) | `{ email, password }` | `200` + `needsEmailVerification` |

Codes: 6 digits, 10 minute TTL, max 5 attempts, hashed in `otp_verifications`.

## Adding phone / MSG91 later

Today signup **requires email**. Phone can be added on profile; phone-change OTP is generated but **not SMS-delivered**.

When you are ready:

1. Create an MSG91 (or Twilio) account and DLT templates if required in India.
2. Add env vars (e.g. `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`).
3. Implement `sendSmsOtp` next to `email.service.ts`.
4. Wire `requestPhoneChange` and optionally a phone-signup path.

Until then, stay on email OTP only.
