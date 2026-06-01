import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { categories } from '../src/db/schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

const seedCategories = [
  { name: 'Running', slug: 'running', sortOrder: 1 },
  { name: 'Cycling', slug: 'cycling', sortOrder: 2 },
  { name: 'Yoga & Zumba', slug: 'yoga-zumba', sortOrder: 3 },
  { name: 'Sports & Games', slug: 'sports-games', sortOrder: 4 },
  { name: 'Treks', slug: 'treks', sortOrder: 5 },
  { name: 'Fun Events', slug: 'fun-events', sortOrder: 6 },
];

async function seed() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding categories...');

  for (const cat of seedCategories) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoNothing({ target: categories.slug });
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete');
  await pool.end();
}

void seed();
