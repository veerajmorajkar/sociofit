import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  autocompletePlaces,
  getPlaceDetails,
  isPlacesConfigured,
} from '../services/places.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

const autocompleteQuerySchema = z.object({
  q: z.string().min(2).max(120),
});

const detailsQuerySchema = z.object({
  placeId: z.string().min(1).max(256),
});

export function placesRoutes(app: FastifyInstance) {
  app.get('/status', { preHandler: authenticate }, async (_request, reply) => {
    return sendSuccess(reply, { configured: isPlacesConfigured() });
  });

  app.get('/autocomplete', { preHandler: authenticate }, async (request, reply) => {
    const { q } = autocompleteQuerySchema.parse(request.query);

    if (!isPlacesConfigured()) {
      return sendError(
        reply,
        'Location search is not configured. Add GOOGLE_PLACES_API_KEY on the server.',
        503,
      );
    }

    try {
      const suggestions = await autocompletePlaces(q);
      return sendSuccess(reply, suggestions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Location search failed';
      return sendError(reply, msg, 502);
    }
  });

  app.get('/details', { preHandler: authenticate }, async (request, reply) => {
    const { placeId } = detailsQuerySchema.parse(request.query);

    if (!isPlacesConfigured()) {
      return sendError(reply, 'Location search is not configured.', 503);
    }

    try {
      const details = await getPlaceDetails(placeId);
      if (!details) return sendError(reply, 'Place not found', 404);
      return sendSuccess(reply, details);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load place';
      return sendError(reply, msg, 502);
    }
  });
}
