import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { categories } from '../src/db/schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

/** Keep in sync with mobile/constants/eventCategories.ts */
const seedCategories = [
  { name: 'Running', slug: 'running', sortOrder: 1 },
  { name: 'Cycling', slug: 'cycling', sortOrder: 2 },
  { name: 'Swimming', slug: 'swimming', sortOrder: 3 },
  { name: 'Yoga', slug: 'yoga', sortOrder: 4 },
  { name: 'Zumba', slug: 'zumba', sortOrder: 5 },
  { name: 'Gym', slug: 'gym', sortOrder: 6 },
  { name: 'CrossFit', slug: 'crossfit', sortOrder: 7 },
  { name: 'Football', slug: 'football', sortOrder: 8 },
  { name: 'Cricket', slug: 'cricket', sortOrder: 9 },
  { name: 'Basketball', slug: 'basketball', sortOrder: 10 },
  { name: 'Badminton', slug: 'badminton', sortOrder: 11 },
  { name: 'Tennis', slug: 'tennis', sortOrder: 12 },
  { name: 'Volleyball', slug: 'volleyball', sortOrder: 13 },
  { name: 'Table Tennis', slug: 'table-tennis', sortOrder: 14 },
  { name: 'Squash', slug: 'squash', sortOrder: 15 },
  { name: 'Pickleball', slug: 'pickleball', sortOrder: 16 },
  { name: 'Hockey', slug: 'hockey', sortOrder: 17 },
  { name: 'Rugby', slug: 'rugby', sortOrder: 18 },
  { name: 'Golf', slug: 'golf', sortOrder: 19 },
  { name: 'Boxing', slug: 'boxing', sortOrder: 20 },
  { name: 'Martial Arts', slug: 'martial-arts', sortOrder: 21 },
  { name: 'Dance', slug: 'dance', sortOrder: 22 },
  { name: 'Pilates', slug: 'pilates', sortOrder: 23 },
  { name: 'Hiking', slug: 'hiking', sortOrder: 24 },
  { name: 'Skating', slug: 'skating', sortOrder: 25 },
  { name: 'Calisthenics', slug: 'calisthenics', sortOrder: 26 },
  { name: 'Triathlon', slug: 'triathlon', sortOrder: 27 },
  { name: 'Functional Training', slug: 'functional-training', sortOrder: 28 },
  { name: 'Outdoor Adventure', slug: 'outdoor', sortOrder: 29 },
  { name: 'Social & Fun', slug: 'fun-events', sortOrder: 30 },
  // Legacy slugs for older events
  { name: 'Yoga & Zumba', slug: 'yoga-zumba', sortOrder: 31 },
  { name: 'Sports & Games', slug: 'sports-games', sortOrder: 32 },
  { name: 'Treks', slug: 'treks', sortOrder: 33 },
];

async function seed() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding categories...');

  for (const cat of seedCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing({ target: categories.slug });
  }

  // eslint-disable-next-line no-console
  console.log(
    `✅ Seeded ${seedCategories.length} categories (new slugs only — existing rows unchanged)`,
  );
  await pool.end();
}

void seed();
