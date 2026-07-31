import type { FastifyReply } from 'fastify';

interface PaginationMeta {
  cursor?: string | null;
  hasMore?: boolean;
  total?: number;
  permissions?: unknown;
  activity?: unknown;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
) {
  const response: ApiSuccessResponse<T> = { success: true, data };
  if (meta) {
    response.meta = meta;
  }
  return reply.status(statusCode).send(response);
}

export function sendError(reply: FastifyReply, error: string, statusCode = 400, code?: string) {
  const response: ApiErrorResponse = { success: false, error };
  if (code) response.code = code;
  return reply.status(statusCode).send(response);
}

export type { ApiResponse, PaginationMeta };
