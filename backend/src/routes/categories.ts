import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { db } from '../config/database.js';
import { categories } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { sendSuccess, sendError } from '../utils/response.js';

export function categoryRoutes(app: FastifyInstance) {
  // ── List All Categories ───────────────────────────────────
  app.get('/', { preHandler: authenticate }, async (_request, reply) => {
    const all = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    return sendSuccess(reply, all);
  });

  // ── Get Category By Slug ──────────────────────────────────
  app.get('/:slug', { preHandler: authenticate }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

    if (!category) return sendError(reply, 'Category not found', 404);
    return sendSuccess(reply, category);
  });
}
