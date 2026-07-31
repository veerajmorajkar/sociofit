import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('fitsocial-media'),
  R2_PUBLIC_URL: z.string().optional(),
  /** Optional CDN fronting R2 (or elsewhere) — added to the server-side media fetch allowlist. */
  MEDIA_CDN_URL: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLATFORM_FEE_PERCENT: z.coerce.number().default(12),

  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),
  STRAVA_REDIRECT_URI: z.string().optional(),
  STRAVA_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  TYPESENSE_HOST: z.string().default('localhost'),
  TYPESENSE_PORT: z.coerce.number().default(8108),
  TYPESENSE_PROTOCOL: z.string().default('http'),
  TYPESENSE_API_KEY: z.string().optional(),

  EXPO_ACCESS_TOKEN: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),

  GOOGLE_PLACES_API_KEY: z.string().optional(),

  GOOGLE_OAUTH_IOS_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_WEB_CLIENT_ID: z.string().optional(),

  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_BUNDLE_ID: z.string().default('app.fitsocial.mobile'),

  /** Resend — transactional email (password reset) */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Mumbai Fitness Mafia <noreply@fitsocial.app>'),
  /** Deep link base, e.g. fitsocial://reset-password */
  PASSWORD_RESET_DEEP_LINK: z.string().default('fitsocial://reset-password'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

if (data.NODE_ENV === 'production') {
  const errors: string[] = [];

  if (!/^postgres(ql)?:\/\//i.test(data.DATABASE_URL)) {
    errors.push('DATABASE_URL must start with postgresql:// or postgres://');
  }
  if (data.JWT_ACCESS_SECRET.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters in production');
  }
  if (data.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters in production');
  }
  if (
    !data.R2_ACCOUNT_ID ||
    !data.R2_ACCESS_KEY_ID ||
    !data.R2_SECRET_ACCESS_KEY ||
    !data.R2_PUBLIC_URL
  ) {
    errors.push(
      'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL are required in production',
    );
  }
  if (!data.GOOGLE_PLACES_API_KEY) {
    errors.push('GOOGLE_PLACES_API_KEY is required in production');
  }
  if (!data.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is required in production (password reset emails)');
  }
  if (!data.EMAIL_FROM.includes('@')) {
    errors.push('EMAIL_FROM must be a valid sender address verified in Resend');
  }

  const hasGoogleOAuth =
    data.GOOGLE_OAUTH_IOS_CLIENT_ID ||
    data.GOOGLE_OAUTH_ANDROID_CLIENT_ID ||
    data.GOOGLE_OAUTH_WEB_CLIENT_ID;
  if (!hasGoogleOAuth && !data.APPLE_CLIENT_ID) {
    errors.push('GOOGLE_OAUTH_* and/or APPLE_CLIENT_ID is required in production for Sign-In');
  }

  const corsOrigins = data.CORS_ORIGINS.split(',').map((o) => o.trim());
  if (corsOrigins.includes('*')) {
    errors.push('Wildcard CORS_ORIGINS is not allowed in production');
  }

  if (errors.length > 0) {
    console.error('❌ Production environment validation failed:');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

export const env = data;
