import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(10).max(15).optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    accountType: z.enum(['personal', 'club']),
    displayName: z.string().min(2).max(100),
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    birthdate: z.string().datetime().optional(),
    activities: z
      .array(z.string().min(1).max(50))
      .min(3, 'Select at least 3 activities')
      .optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
  })
  .refine((data) => data.accountType !== 'personal' || !!data.birthdate, {
    message: 'Birthdate is required',
  });

export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(10).max(15).optional(),
    password: z.string().min(1),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(8),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
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

export const oauthCompleteSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .optional(),
    accountType: z.enum(['personal', 'club']).optional(),
    birthdate: z.string().datetime().optional(),
    activities: z.array(z.string().min(1).max(50)).min(3, 'Select at least 3 activities'),
  })
  .refine((data) => data.accountType !== 'personal' || !!data.birthdate, {
    message: 'Birthdate is required for athlete accounts',
  });

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type OAuthCompleteInput = z.infer<typeof oauthCompleteSchema>;
