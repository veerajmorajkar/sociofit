import 'dotenv/config';
import { eq, and } from 'drizzle-orm';
import { db, pool } from '../src/config/database.js';
import { users, clubProfiles, follows, messages, conversations } from '../src/db/schema.js';
import { hashPassword } from '../src/utils/hash.js';
import {
  ensureClubAnnouncementChannel,
  joinClubAnnouncement,
} from '../src/services/messaging-club.service.js';

const TEST_PASSWORD = 'Test1234';

const SEED_CLUBS = [
  {
    username: 'bandra_run_club',
    displayName: 'Bandra Run Club',
    email: 'bandra.run@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Bandra West',
    category: 'running',
    description: 'Weekly tempo runs and Sunday long runs along the coastal road.',
    adminName: 'Priya Nair',
    adminEmail: 'admin@bandrarun.test',
  },
  {
    username: 'powai_cyclists',
    displayName: 'Powai Cyclists',
    email: 'powai.cycle@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Powai',
    category: 'cycling',
    description: 'Early-morning lake loops and weekend highway rides.',
    adminName: 'Arjun Shah',
    adminEmail: 'admin@powaicycle.test',
  },
  {
    username: 'andheri_yoga',
    displayName: 'Andheri Yoga Collective',
    email: 'andheri.yoga@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Andheri East',
    category: 'yoga-zumba',
    description: 'Sunrise flows, breathwork, and community wellness sessions.',
    adminName: 'Meera Joshi',
    adminEmail: 'admin@andheriyoga.test',
  },
  {
    username: 'mumbai_trails',
    displayName: 'Mumbai Trail Blazers',
    email: 'mumbai.trails@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Sanjay Gandhi National Park',
    category: 'treks',
    description: 'Monsoon treks, night hikes, and Western Ghats weekend trips.',
    adminName: 'Vikram Rao',
    adminEmail: 'admin@mumbaitrails.test',
  },
] as const;

const SEED_PERSONAL = [
  {
    username: 'test_anya',
    displayName: 'Anya Sharma',
    email: 'anya@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Bandra',
    activities: ['running', 'yoga', 'cycling'],
  },
  {
    username: 'test_rahul',
    displayName: 'Rahul Mehta',
    email: 'rahul@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Powai',
    activities: ['cycling', 'treks', 'running'],
  },
  {
    username: 'test_sneha',
    displayName: 'Sneha Patel',
    email: 'sneha@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Andheri',
    activities: ['yoga', 'running', 'fun-events'],
  },
  {
    username: 'test_karan',
    displayName: 'Karan Desai',
    email: 'karan@test.sociofit.local',
    city: 'Mumbai',
    neighbourhood: 'Worli',
    activities: ['treks', 'cycling', 'sports-games'],
  },
] as const;

const WELCOME_MESSAGES: Record<string, string> = {
  bandra_run_club: 'Welcome to Bandra Run Club! Tuesday tempo at 6:30 AM — meet at Bandstand.',
  powai_cyclists: 'Powai Cyclists update: Saturday lake ride rolls out at 5:45 AM.',
  andheri_yoga: 'New month of sunrise sessions — first class is free for new members.',
  mumbai_trails: 'Monsoon trek signup is open. Next hike: Karnala Fort, this Sunday.',
};

async function findUserByUsername(username: string) {
  const [row] = await db
    .select({ id: users.id, username: users.username, accountType: users.accountType })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row ?? null;
}

async function upsertClub(
  club: (typeof SEED_CLUBS)[number],
  passwordHash: string,
): Promise<string> {
  const existing = await findUserByUsername(club.username);
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      email: club.email,
      passwordHash,
      accountType: 'club',
      displayName: club.displayName,
      username: club.username,
      authProvider: 'email',
      city: club.city,
      neighbourhood: club.neighbourhood,
      bio: club.description,
      isVerified: true,
      activities: [],
    })
    .returning({ id: users.id });

  if (!created) throw new Error(`Failed to create club ${club.username}`);
  return created.id;
}

async function upsertPersonal(
  person: (typeof SEED_PERSONAL)[number],
  passwordHash: string,
): Promise<string> {
  const existing = await findUserByUsername(person.username);
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      email: person.email,
      passwordHash,
      accountType: 'personal',
      displayName: person.displayName,
      username: person.username,
      authProvider: 'email',
      city: person.city,
      neighbourhood: person.neighbourhood,
      activities: [...person.activities],
      dateOfBirth: new Date('1995-06-15T00:00:00.000Z'),
      isVerified: false,
    })
    .returning({ id: users.id });

  if (!created) throw new Error(`Failed to create user ${person.username}`);
  return created.id;
}

async function ensureClubProfile(userId: string, club: (typeof SEED_CLUBS)[number]): Promise<void> {
  const [existing] = await db
    .select({ id: clubProfiles.id })
    .from(clubProfiles)
    .where(eq(clubProfiles.userId, userId))
    .limit(1);

  if (existing) return;

  await db.insert(clubProfiles).values({
    userId,
    description: club.description,
    adminName: club.adminName,
    adminEmail: club.adminEmail,
    category: club.category,
    memberCount: 0,
    isVerified: true,
  });
}

async function ensureWelcomeMessage(clubUserId: string, clubUsername: string): Promise<void> {
  const conversationId = await ensureClubAnnouncementChannel(clubUserId);
  const text = WELCOME_MESSAGES[clubUsername];
  if (!text) return;

  const [existing] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .limit(1);

  if (existing) return;

  const now = new Date();
  await db.insert(messages).values({
    conversationId,
    senderId: clubUserId,
    content: text,
    messageType: 'text',
    createdAt: now,
  });

  await db
    .update(conversations)
    .set({ lastMessageAt: now })
    .where(eq(conversations.id, conversationId));
}

async function ensureFollow(followerId: string, followingId: string): Promise<void> {
  const [existing] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);

  if (existing) return;
  await db.insert(follows).values({ followerId, followingId });
}

async function updateClubMemberCount(clubUserId: string): Promise<void> {
  const followers = await db
    .select({ id: follows.id })
    .from(follows)
    .where(eq(follows.followingId, clubUserId));

  await db
    .update(clubProfiles)
    .set({ memberCount: followers.length, updatedAt: new Date() })
    .where(eq(clubProfiles.userId, clubUserId));
}

async function seed() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding club accounts and test users...');

  const passwordHash = await hashPassword(TEST_PASSWORD);
  const clubIds: { username: string; id: string }[] = [];

  for (const club of SEED_CLUBS) {
    const id = await upsertClub(club, passwordHash);
    await ensureClubProfile(id, club);
    await ensureClubAnnouncementChannel(id);
    await ensureWelcomeMessage(id, club.username);
    clubIds.push({ username: club.username, id });
    // eslint-disable-next-line no-console
    console.log(`  ✓ club @${club.username}`);
  }

  const personalIds: string[] = [];
  for (const person of SEED_PERSONAL) {
    const id = await upsertPersonal(person, passwordHash);
    personalIds.push(id);
    // eslint-disable-next-line no-console
    console.log(`  ✓ user @${person.username}`);
  }

  const allPersonal = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.accountType, 'personal'));

  const connectIds = [...new Set([...personalIds, ...allPersonal.map((u) => u.id)])];

  for (const personId of connectIds) {
    for (const club of clubIds) {
      await ensureFollow(personId, club.id);
      await joinClubAnnouncement(personId, club.id);
    }
  }

  for (const club of clubIds) {
    await updateClubMemberCount(club.id);
  }

  // eslint-disable-next-line no-console
  console.log('\n✅ Club seed complete\n');
  // eslint-disable-next-line no-console
  console.log('Login password for all seeded accounts:', TEST_PASSWORD);
  // eslint-disable-next-line no-console
  console.log('\nClub accounts:');
  for (const club of SEED_CLUBS) {
    // eslint-disable-next-line no-console
    console.log(`  • @${club.username} — ${club.email}`);
  }
  // eslint-disable-next-line no-console
  console.log('\nPersonal test accounts:');
  for (const person of SEED_PERSONAL) {
    // eslint-disable-next-line no-console
    console.log(`  • @${person.username} — ${person.email}`);
  }
  // eslint-disable-next-line no-console
  console.log(
    `\nAll personal accounts (including your existing login) now follow and subscribe to these clubs.`,
  );

  await pool.end();
}

void seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
