import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  // Zod validation errors
  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return sendError(reply, `Validation error: ${messages}`, 422);
  }

  // Fastify validation errors
  if (error.validation) {
    return sendError(reply, `Validation error: ${error.message}`, 422);
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return sendError(reply, 'Too many requests. Please try again later.', 429);
  }

  // Known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    return sendError(reply, error.message, error.statusCode);
  }

  // Unexpected errors — log but don't expose details in production
  console.error('Unhandled error:', error);
  if (env.NODE_ENV !== 'production') {
    return reply.status(500).send({
      success: false,
      error: error.message || 'Internal server error',
      stack: error.stack,
    });
  }
  return sendError(reply, 'Internal server error', 500);
}
