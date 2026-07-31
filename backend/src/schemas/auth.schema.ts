import { z } from 'zod';
import {
  displayNameSchema,
  emailSchema,
  passwordSchema,
  usernameSchema,
} from '../utils/auth-validation.js';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  accountType: z.enum(['personal', 'club']),
  displayName: displayNameSchema,
  username: usernameSchema,
  birthdate: z.string().datetime(),
  activities: z.array(z.string().min(1).max(50)).min(3, 'Select at least 3 activities'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(8),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(10),
  mode: z.enum(['login', 'signup']).default('login'),
  accountType: z.enum(['personal', 'club']).optional(),
});

export const appleAuthSchema = z.object({
  identityToken: z.string().min(10),
  mode: z.enum(['login', 'signup']).default('login'),
  accountType: z.enum(['personal', 'club']).optional(),
  fullName: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
});

export const oauthCompleteSchema = z.object({
  displayName: displayNameSchema.optional(),
  username: usernameSchema.optional(),
  accountType: z.enum(['personal', 'club']).optional(),
  birthdate: z.string().datetime(),
  activities: z.array(z.string().min(1).max(50)).min(3, 'Select at least 3 activities'),
});

export const confirmLinkSchema = z.object({
  linkToken: z.string().min(8),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, 'Enter the 6-digit code'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type OAuthCompleteInput = z.infer<typeof oauthCompleteSchema>;
export type ConfirmLinkInput = z.infer<typeof confirmLinkSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
