import type { FastifyReply } from 'fastify';

interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface ApiErrorResponse {
  success: false;
  error: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200, meta?: PaginationMeta) {
  const response: ApiSuccessResponse<T> = { success: true, data };
  if (meta) {
    response.meta = meta;
  }
  return reply.status(statusCode).send(response);
}

export function sendError(reply: FastifyReply, error: string, statusCode = 400) {
  const response: ApiErrorResponse = { success: false, error };
  return reply.status(statusCode).send(response);
}

export type { ApiResponse, PaginationMeta };
