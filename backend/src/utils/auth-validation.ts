import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/^\S+$/, 'Password cannot contain spaces');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-z][a-z0-9_]{2,29}$/,
    'Username must start with a letter and use only lowercase letters, numbers, and underscores',
  );

export const displayNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .regex(
    /^[a-zA-Z][a-zA-Z\s'-]{1,99}$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes',
  );

export const emailSchema = z
  .string()
  .email('Enter a valid email address')
  .max(254, 'Email is too long')
  .transform((v) => v.trim().toLowerCase());

/** E.164 international format */
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone number with country code');
