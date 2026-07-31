import { api } from './api';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  accountType: 'personal' | 'club';
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

export interface AuthTokensResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  needsProfile?: boolean;
  needsLinkConfirmation?: false;
  needsEmailVerification?: false;
}

/**
 * Returned by /auth/google and /auth/apple when the OAuth email matches an
 * existing verified email/password account. No tokens are issued here — the
 * client must show an explicit "link this account?" confirmation and call
 * confirmAccountLink() with the account's password before any session exists.
 */
interface NeedsLinkConfirmationResponse {
  needsLinkConfirmation: true;
  linkToken: string;
  maskedEmail: string;
  provider: 'google' | 'apple';
}

/** Returned by register/login when the email/password account is not verified yet. */
export interface NeedsEmailVerificationResponse {
  needsEmailVerification: true;
  email: string;
  maskedEmail: string;
}

type OAuthResponse = AuthTokensResponse | NeedsLinkConfirmationResponse;
type AuthResponse = AuthTokensResponse;
type RegisterResponse = NeedsEmailVerificationResponse;
type LoginResponse = AuthTokensResponse | NeedsEmailVerificationResponse;

interface RegisterParams {
  email: string;
  password: string;
  accountType: 'personal' | 'club';
  displayName: string;
  username: string;
  birthdate: string;
  activities: string[];
}

interface LoginParams {
  email: string;
  password: string;
}

interface GoogleAuthParams {
  idToken: string;
  mode: 'login' | 'signup';
  accountType?: 'personal' | 'club';
}

interface AppleAuthParams {
  identityToken: string;
  mode: 'login' | 'signup';
  accountType?: 'personal' | 'club';
  fullName?: { givenName?: string; familyName?: string };
}

interface ForgotPasswordResponse {
  ok: boolean;
  resetToken?: string;
}

interface OAuthCompleteParams {
  displayName?: string;
  username?: string;
  accountType?: 'personal' | 'club';
  birthdate: string;
  activities: string[];
}

interface ConfirmLinkParams {
  linkToken: string;
  password: string;
}

export async function register(params: RegisterParams) {
  return api.post<RegisterResponse>('/auth/register', params, { auth: false });
}

export async function login(params: LoginParams) {
  return api.post<LoginResponse>('/auth/login', params, { auth: false });
}

export async function verifyEmail(params: { email: string; code: string }) {
  return api.post<AuthTokensResponse>('/auth/verify-email', params, { auth: false });
}

export async function resendVerification(params: { email: string }) {
  return api.post<{ sent: true; message: string }>('/auth/resend-verification', params, {
    auth: false,
  });
}

export async function loginWithGoogle(params: GoogleAuthParams) {
  return api.post<OAuthResponse>('/auth/google', params, { auth: false });
}

export async function loginWithApple(params: AppleAuthParams) {
  return api.post<OAuthResponse>('/auth/apple', params, { auth: false });
}

export async function completeOAuthProfile(params: OAuthCompleteParams) {
  return api.post<AuthResponse>('/auth/oauth/complete', params);
}

/** Second step of the OAuth-account-link flow: proves ownership of the
 * existing password account before it's linked to the OAuth identity. */
export async function confirmAccountLink(params: ConfirmLinkParams) {
  return api.post<AuthTokensResponse>('/auth/oauth/confirm-link', params, { auth: false });
}

export async function logout(refreshToken: string) {
  return api.post<{ message: string }>('/auth/logout', { refreshToken }, { auth: false });
}

export async function forgotPassword(params: { email: string }) {
  return api.post<ForgotPasswordResponse>('/auth/forgot-password', params, { auth: false });
}

export async function resetPassword(token: string, password: string) {
  return api.post<{ ok: boolean }>('/auth/reset-password', { token, password }, { auth: false });
}
