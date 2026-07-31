/**
 * Demo posts + events for screen recordings and showcases.
 * Requires: npm run db:seed && npm run db:seed:clubs (categories + test users).
 * Idempotent — skips if showcase content already exists.
 */
import 'dotenv/config';
import { eq, and, inArray, ilike } from 'drizzle-orm';
import { db, pool } from '../src/config/database.js';
import {
  users,
  categories,
  posts,
  postMedia,
  likes,
  comments,
  events,
  eventParticipants,
  follows,
} from '../src/db/schema.js';

const SHOWCASE_TAG = '[showcase]';

const USER_HANDLES = [
  'test_anya',
  'test_rahul',
  'test_sneha',
  'test_karan',
  'bandra_run_club',
  'powai_cyclists',
  'andheri_yoga',
  'mumbai_trails',
] as const;

const IMG = {
  run: 'https://images.unsplash.com/photo-1476480862128-209f935237df?w=1080&q=80',
  cycle: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1080&q=80',
  yoga: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1080&q=80',
  trek: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1080&q=80',
  gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080&q=80',
  group: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1080&q=80',
  sunset: 'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1080&q=80',
} as const;

type UserMap = Record<(typeof USER_HANDLES)[number], string>;

async function loadUsers(): Promise<UserMap> {
  const rows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.username, [...USER_HANDLES]));

  const map = {} as UserMap;
  for (const row of rows) {
    map[row.username as (typeof USER_HANDLES)[number]] = row.id;
  }

  const missing = USER_HANDLES.filter((u) => !map[u]);
  if (missing.length > 0) {
    throw new Error(`Missing test users: ${missing.join(', ')}. Run: npm run db:seed:clubs`);
  }
  return map;
}

async function loadCategoryIds(): Promise<Record<string, string>> {
  const slugs = ['running', 'cycling', 'yoga', 'hiking', 'crossfit', 'fun-events'];
  const rows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, slugs));

  const map: Record<string, string> = {};
  for (const row of rows) map[row.slug] = row.id;

  if (!map.running) {
    throw new Error('Categories missing. Run: npm run db:seed');
  }
  return map;
}

async function isAlreadySeeded(): Promise<boolean> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(ilike(events.title, `%${SHOWCASE_TAG}%`))
    .limit(1);
  return Boolean(row);
}

async function ensureMutualFollows(userIds: string[]): Promise<void> {
  for (const followerId of userIds) {
    for (const followingId of userIds) {
      if (followerId === followingId) continue;
      const [existing] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
        .limit(1);
      if (!existing) {
        await db.insert(follows).values({ followerId, followingId });
      }
    }
  }
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function daysAheadAtIst(days: number, hourIst: number, minuteIst = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourIst - 5, minuteIst - 30, 0, 0);
  return d;
}

interface SeedPost {
  author: keyof UserMap;
  caption: string;
  image: string;
  locationName: string;
  lat: string;
  lng: string;
  categorySlug: string;
  hoursAgo: number;
  likes: number;
  commentCount: number;
  sampleComments?: { author: keyof UserMap; content: string }[];
}

const SEED_POSTS: SeedPost[] = [
  {
    author: 'bandra_run_club',
    caption: `${SHOWCASE_TAG} Tuesday tempo done. 8K at Bandstand — who is in for Sunday long run?`,
    image: IMG.run,
    locationName: 'Bandstand, Bandra West',
    lat: '19.0544',
    lng: '72.8235',
    categorySlug: 'running',
    hoursAgo: 3,
    likes: 42,
    commentCount: 2,
    sampleComments: [
      { author: 'test_anya', content: 'See you Sunday! 🏃‍♀️' },
      { author: 'test_rahul', content: 'Pacing group for sub-55?' },
    ],
  },
  {
    author: 'test_anya',
    caption: `${SHOWCASE_TAG} First 10K of the monsoon season. Legs are jelly but the sea breeze was worth it.`,
    image: IMG.sunset,
    locationName: 'Marine Drive',
    lat: '18.9432',
    lng: '72.8236',
    categorySlug: 'running',
    hoursAgo: 8,
    likes: 28,
    commentCount: 1,
    sampleComments: [{ author: 'test_sneha', content: 'Beast mode 🔥' }],
  },
  {
    author: 'powai_cyclists',
    caption: `${SHOWCASE_TAG} Saturday lake loop — 42 riders, perfect weather. Next week we add the Hiranandani climb.`,
    image: IMG.cycle,
    locationName: 'Powai Lake',
    lat: '19.1176',
    lng: '72.9060',
    categorySlug: 'cycling',
    hoursAgo: 14,
    likes: 56,
    commentCount: 2,
    sampleComments: [
      { author: 'test_karan', content: 'That climb destroyed me last time 😅' },
      { author: 'test_rahul', content: 'Registering now!' },
    ],
  },
  {
    author: 'andheri_yoga',
    caption: `${SHOWCASE_TAG} Sunrise flow on the terrace — 30 spots left for this weekend's community session.`,
    image: IMG.yoga,
    locationName: 'Andheri East',
    lat: '19.1136',
    lng: '72.8697',
    categorySlug: 'yoga',
    hoursAgo: 20,
    likes: 35,
    commentCount: 1,
    sampleComments: [{ author: 'test_sneha', content: 'Can beginners join?' }],
  },
  {
    author: 'mumbai_trails',
    caption: `${SHOWCASE_TAG} Karnala Fort trek recap — 18 of us made it to the top before the clouds rolled in.`,
    image: IMG.trek,
    locationName: 'Karnala Bird Sanctuary',
    lat: '18.8876',
    lng: '73.1194',
    categorySlug: 'hiking',
    hoursAgo: 30,
    likes: 61,
    commentCount: 2,
    sampleComments: [
      { author: 'test_karan', content: 'Best views this season!' },
      { author: 'test_anya', content: 'Already signed up for the next one' },
    ],
  },
  {
    author: 'test_rahul',
    caption: `${SHOWCASE_TAG} Brick workout: 40 min ride + 20 min run. Training for the triathlon squad.`,
    image: IMG.gym,
    locationName: 'Worli Sports Complex',
    lat: '19.0176',
    lng: '72.8174',
    categorySlug: 'crossfit',
    hoursAgo: 36,
    likes: 19,
    commentCount: 0,
  },
  {
    author: 'test_sneha',
    caption: `${SHOWCASE_TAG} Post-yoga coffee crew at Bandra — open invite every Friday after class.`,
    image: IMG.group,
    locationName: 'Hill Road, Bandra',
    lat: '19.0596',
    lng: '72.8295',
    categorySlug: 'fun-events',
    hoursAgo: 48,
    likes: 24,
    commentCount: 1,
    sampleComments: [{ author: 'test_anya', content: 'Count me in!' }],
  },
  {
    author: 'test_karan',
    caption: `${SHOWCASE_TAG} Night ride through South Mumbai — 28km, zero traffic, maximum vibes.`,
    image: IMG.cycle,
    locationName: 'Nariman Point',
    lat: '18.9218',
    lng: '72.8331',
    categorySlug: 'cycling',
    hoursAgo: 52,
    likes: 33,
    commentCount: 0,
  },
];

interface SeedEvent {
  organiser: keyof UserMap;
  title: string;
  description: string;
  categorySlug: string;
  coverImage: string;
  daysAhead: number;
  hourIst: number;
  durationHours: number;
  locationName: string;
  locationAddress: string;
  lat: string;
  lng: string;
  priceInr: number;
  maxCapacity?: number;
  rsvpUsers: (keyof UserMap)[];
}

const SEED_EVENTS: SeedEvent[] = [
  {
    organiser: 'bandra_run_club',
    title: `${SHOWCASE_TAG} Sunday Sea Link Long Run`,
    description:
      '21K along the coastal road. Pacers at 5:30, 6:00 and 6:30 min/km. Hydration at Carter Road.',
    categorySlug: 'running',
    coverImage: IMG.run,
    daysAhead: 2,
    hourIst: 6,
    durationHours: 2,
    locationName: 'Bandstand Promenade',
    locationAddress: 'Bandstand, Bandra West, Mumbai',
    lat: '19.0544',
    lng: '72.8235',
    priceInr: 0,
    maxCapacity: 80,
    rsvpUsers: ['test_anya', 'test_rahul', 'test_sneha'],
  },
  {
    organiser: 'powai_cyclists',
    title: `${SHOWCASE_TAG} Powai Lake Dawn Ride`,
    description: '45km loop with a coffee stop. Road bikes recommended. Lights mandatory.',
    categorySlug: 'cycling',
    coverImage: IMG.cycle,
    daysAhead: 3,
    hourIst: 5,
    durationHours: 3,
    locationName: 'Powai Lake Promenade',
    locationAddress: 'Powai, Mumbai',
    lat: '19.1176',
    lng: '72.9060',
    priceInr: 0,
    rsvpUsers: ['test_karan', 'test_rahul'],
  },
  {
    organiser: 'andheri_yoga',
    title: `${SHOWCASE_TAG} Sunrise Yoga on the Terrace`,
    description: '90-minute vinyasa flow for all levels. Mats provided. Arrive 10 min early.',
    categorySlug: 'yoga',
    coverImage: IMG.yoga,
    daysAhead: 4,
    hourIst: 6,
    durationHours: 2,
    locationName: 'Andheri Sports Club',
    locationAddress: 'Andheri East, Mumbai',
    lat: '19.1136',
    lng: '72.8697',
    priceInr: 0,
    maxCapacity: 40,
    rsvpUsers: ['test_sneha', 'test_anya'],
  },
  {
    organiser: 'mumbai_trails',
    title: `${SHOWCASE_TAG} Karnala Fort Monsoon Trek`,
    description:
      'Moderate difficulty, 3–4 hours. Carry 2L water and rain gear. Group leaves from Panvel station.',
    categorySlug: 'hiking',
    coverImage: IMG.trek,
    daysAhead: 6,
    hourIst: 6,
    durationHours: 5,
    locationName: 'Karnala Bird Sanctuary',
    locationAddress: 'Panvel, Navi Mumbai',
    lat: '18.8876',
    lng: '73.1194',
    priceInr: 35000,
    maxCapacity: 25,
    rsvpUsers: ['test_karan', 'test_anya', 'test_rahul'],
  },
  {
    organiser: 'test_anya',
    title: `${SHOWCASE_TAG} Marine Drive 5K Fun Run`,
    description: 'Casual community jog — no timing chips, just good energy and post-run chai.',
    categorySlug: 'running',
    coverImage: IMG.sunset,
    daysAhead: 5,
    hourIst: 7,
    durationHours: 1,
    locationName: 'Marine Drive',
    locationAddress: 'Netaji Subhash Chandra Bose Road, Mumbai',
    lat: '18.9432',
    lng: '72.8236',
    priceInr: 0,
    rsvpUsers: ['test_sneha'],
  },
  {
    organiser: 'bandra_run_club',
    title: `${SHOWCASE_TAG} Track Night — Bandra Reclamation`,
    description: 'Intervals on the 400m track. Coach-led warm-up at 7 PM. ₹200 entry.',
    categorySlug: 'running',
    coverImage: IMG.gym,
    daysAhead: 8,
    hourIst: 19,
    durationHours: 2,
    locationName: 'Bandra Reclamation Ground',
    locationAddress: 'Bandra West, Mumbai',
    lat: '19.0510',
    lng: '72.8360',
    priceInr: 20000,
    maxCapacity: 50,
    rsvpUsers: ['test_rahul'],
  },
];

async function seedPosts(userMap: UserMap, categoryIds: Record<string, string>): Promise<void> {
  for (const item of SEED_POSTS) {
    const authorId = userMap[item.author];
    const createdAt = hoursAgo(item.hoursAgo);

    const [post] = await db
      .insert(posts)
      .values({
        authorId,
        postType: 'photo',
        caption: item.caption,
        categoryId: categoryIds[item.categorySlug],
        locationName: item.locationName,
        latitude: item.lat,
        longitude: item.lng,
        likeCount: item.likes,
        commentCount: item.sampleComments?.length ?? 0,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: posts.id });

    if (!post) continue;

    await db.insert(postMedia).values({
      postId: post.id,
      mediaType: 'image',
      url: item.image,
      width: 1080,
      height: 1350,
      sortOrder: 0,
    });

    const likers = USER_HANDLES.filter((u) => u !== item.author).slice(0, Math.min(4, item.likes));
    for (const handle of likers) {
      await db
        .insert(likes)
        .values({ userId: userMap[handle], postId: post.id })
        .onConflictDoNothing();
    }

    for (const c of item.sampleComments ?? []) {
      await db.insert(comments).values({
        postId: post.id,
        authorId: userMap[c.author],
        content: c.content,
        createdAt,
      });
    }

    // eslint-disable-next-line no-console
    console.log(`  ✓ post by @${item.author}`);
  }
}

async function seedEvents(userMap: UserMap, categoryIds: Record<string, string>): Promise<void> {
  for (const item of SEED_EVENTS) {
    const organiserId = userMap[item.organiser];
    const startTime = daysAheadAtIst(item.daysAhead, item.hourIst);
    const endTime = new Date(startTime.getTime() + item.durationHours * 60 * 60 * 1000);

    const [event] = await db
      .insert(events)
      .values({
        organiserId,
        title: item.title,
        description: item.description,
        categoryId: categoryIds[item.categorySlug] ?? categoryIds.running!,
        coverImageUrl: item.coverImage,
        coverNavTone: 'dark',
        startTime,
        endTime,
        latitude: item.lat,
        longitude: item.lng,
        locationName: item.locationName,
        locationAddress: item.locationAddress,
        maxCapacity: item.maxCapacity,
        priceInr: item.priceInr,
        status: 'upcoming',
        participantCount: item.rsvpUsers.length + 1,
      })
      .returning({ id: events.id });

    if (!event) continue;

    await db
      .insert(eventParticipants)
      .values({
        eventId: event.id,
        userId: organiserId,
        status: 'confirmed',
      })
      .onConflictDoNothing();

    for (const handle of item.rsvpUsers) {
      await db
        .insert(eventParticipants)
        .values({
          eventId: event.id,
          userId: userMap[handle],
          status: 'confirmed',
        })
        .onConflictDoNothing();
    }

    // eslint-disable-next-line no-console
    console.log(`  ✓ event: ${item.title.replace(SHOWCASE_TAG, '').trim()}`);
  }
}

async function seed() {
  // eslint-disable-next-line no-console
  console.log('🎬 Seeding showcase posts & events...\n');

  if (await isAlreadySeeded()) {
    // eslint-disable-next-line no-console
    console.log('Showcase content already exists — skipping.\n');
    await pool.end();
    return;
  }

  const userMap = await loadUsers();
  const categoryIds = await loadCategoryIds();

  const personalIds = [
    userMap.test_anya,
    userMap.test_rahul,
    userMap.test_sneha,
    userMap.test_karan,
  ];
  await ensureMutualFollows(personalIds);
  // eslint-disable-next-line no-console
  console.log('  ✓ personal accounts follow each other\n');

  // eslint-disable-next-line no-console
  console.log('Posts:');
  await seedPosts(userMap, categoryIds);

  // eslint-disable-next-line no-console
  console.log('\nEvents:');
  await seedEvents(userMap, categoryIds);

  // eslint-disable-next-line no-console
  console.log('\n✅ Showcase seed complete');
  // eslint-disable-next-line no-console
  console.log('Log in as anya@test.sociofit.local / Test1234 to see feed + events.\n');

  await pool.end();
}

void seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Showcase seed failed:', err);
  process.exit(1);
});
