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

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RegisterParams {
  email: string;
  password: string;
  accountType: 'personal' | 'club';
  displayName: string;
  username: string;
  birthdate?: string;
  activities?: string[];
}

interface LoginParams {
  email: string;
  password: string;
}

export async function register(params: RegisterParams) {
  return api.post<AuthResponse>('/auth/register', params, { auth: false });
}

export async function login(params: LoginParams) {
  return api.post<AuthResponse>('/auth/login', params, { auth: false });
}

export async function logout(refreshToken: string) {
  return api.post<{ message: string }>('/auth/logout', { refreshToken }, { auth: false });
}

export async function forgotPassword(email: string) {
  return api.post<{ ok: boolean; token?: string }>(
    '/auth/forgot-password',
    { email },
    { auth: false },
  );
}

export async function resetPassword(token: string, password: string) {
  return api.post<{ ok: boolean }>('/auth/reset-password', { token, password }, { auth: false });
}
