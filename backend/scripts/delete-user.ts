import { eq } from 'drizzle-orm';
import { db, pool } from '../src/config/database.js';
import { users } from '../src/db/schema.js';

const username = process.argv[2];

if (!username) {
  console.error('Usage: npx tsx scripts/delete-user.ts <username>');
  process.exit(1);
}

async function main() {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    console.log(`No user found with username: ${username}`);
    return;
  }

  console.log('Deleting user:', user);
  await db.delete(users).where(eq(users.id, user.id));
  console.log('Deleted successfully.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
