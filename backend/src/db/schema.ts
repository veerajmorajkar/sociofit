import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  uniqueIndex,
  index,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// USERS
// ============================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique(),
    phone: varchar('phone', { length: 20 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    accountType: varchar('account_type', { length: 10 }).notNull(), // 'personal' | 'club'
    displayName: varchar('display_name', { length: 100 }).notNull(),
    username: varchar('username', { length: 50 }).unique().notNull(),
    bio: text('bio'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    coverPhotoUrl: varchar('cover_photo_url', { length: 500 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    dateOfBirth: timestamp('date_of_birth', { withTimezone: true }),
    city: varchar('city', { length: 100 }),
    neighbourhood: varchar('neighbourhood', { length: 100 }),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    authProvider: varchar('auth_provider', { length: 20 }).default('email'),
    googleId: varchar('google_id', { length: 255 }).unique(),
    appleId: varchar('apple_id', { length: 255 }).unique(),
    stravaId: varchar('strava_id', { length: 255 }).unique(),
    stravaAccessToken: text('strava_access_token'),
    stravaRefreshToken: text('strava_refresh_token'),
    stravaTokenExpires: timestamp('strava_token_expires', { withTimezone: true }),
    activities: text('activities').array().default([]),
    expoPushToken: varchar('expo_push_token', { length: 255 }),
    isVerified: boolean('is_verified').default(false),
    isActive: boolean('is_active').default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_users_account_type').on(table.accountType),
    index('idx_users_created_at').on(table.createdAt),
  ],
);

// ============================================================
// PASSWORD RESET TOKENS
// ============================================================
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_password_reset_user').on(table.userId),
    uniqueIndex('idx_password_reset_token_hash_unique').on(table.tokenHash),
  ],
);

// ============================================================
// CLUB PROFILES
// ============================================================
export const clubProfiles = pgTable(
  'club_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    description: text('description'),
    adminName: varchar('admin_name', { length: 100 }),
    adminEmail: varchar('admin_email', { length: 255 }),
    adminPhone: varchar('admin_phone', { length: 20 }),
    category: varchar('category', { length: 50 }),
    memberCount: integer('member_count').default(0),
    avgFootfall: decimal('avg_footfall', { precision: 10, scale: 2 }).default('0'),
    avgRating: decimal('avg_rating', { precision: 3, scale: 2 }).default('0'),
    totalReviews: integer('total_reviews').default(0),
    eventsCount: integer('events_count').default(0),
    isVerified: boolean('is_verified').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_club_profiles_category').on(table.category)],
);

// ============================================================
// FOLLOWS
// ============================================================
export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_follows_unique').on(table.followerId, table.followingId),
    index('idx_follows_follower').on(table.followerId),
    index('idx_follows_following').on(table.followingId),
  ],
);

// ============================================================
// CATEGORIES
// ============================================================
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  iconUrl: varchar('icon_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// POSTS
// ============================================================
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postType: varchar('post_type', { length: 20 }).notNull(), // photo, video, text, link, event_invite, route
    caption: text('caption'),
    linkUrl: varchar('link_url', { length: 500 }),
    linkPreview: jsonb('link_preview'),
    routeData: jsonb('route_data'),
    stravaActivityId: varchar('strava_activity_id', { length: 255 }),
    eventId: uuid('event_id'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    locationName: varchar('location_name', { length: 255 }),
    likeCount: integer('like_count').default(0),
    commentCount: integer('comment_count').default(0),
    shareCount: integer('share_count').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_posts_author').on(table.authorId),
    index('idx_posts_created_at').on(table.createdAt),
    index('idx_posts_category').on(table.categoryId),
    index('idx_posts_type').on(table.postType),
  ],
);

// ============================================================
// POST MEDIA
// ============================================================
export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    mediaType: varchar('media_type', { length: 10 }).notNull(), // image, video
    url: varchar('url', { length: 500 }).notNull(),
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_post_media_post').on(table.postId)],
);

// ============================================================
// POST TAGS (people tagged in posts)
// ============================================================
export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index('idx_post_tags_user').on(table.userId),
  ],
);

// ============================================================
// LIKES
// ============================================================
export const likes = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_likes_unique').on(table.userId, table.postId),
    index('idx_likes_post').on(table.postId),
  ],
);

// ============================================================
// REPOSTS (in-app retweet)
// ============================================================
export const reposts = pgTable(
  'reposts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_reposts_unique').on(table.userId, table.postId),
    index('idx_reposts_post').on(table.postId),
    index('idx_reposts_user').on(table.userId),
    index('idx_reposts_created_at').on(table.createdAt),
  ],
);

// ============================================================
// COMMENTS
// ============================================================
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    content: text('content').notNull(),
    likeCount: integer('like_count').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_comments_post').on(table.postId),
    index('idx_comments_author').on(table.authorId),
    index('idx_comments_created_at').on(table.createdAt),
  ],
);

// ============================================================
// EVENTS
// ============================================================
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organiserId: uuid('organiser_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    coverImageUrl: varchar('cover_image_url', { length: 500 }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
    locationName: varchar('location_name', { length: 255 }).notNull(),
    locationAddress: text('location_address'),
    maxCapacity: integer('max_capacity'),
    priceInr: integer('price_inr').default(0), // in paise, 0 = free
    currency: varchar('currency', { length: 3 }).default('INR'),
    participantCount: integer('participant_count').default(0),
    status: varchar('status', { length: 20 }).default('upcoming'), // draft, upcoming, live, completed, cancelled
    chatroomActive: boolean('chatroom_active').default(true),
    chatroomExpiresAt: timestamp('chatroom_expires_at', { withTimezone: true }),
    avgRating: decimal('avg_rating', { precision: 3, scale: 2 }).default('0'),
    totalReviews: integer('total_reviews').default(0),
    isActive: boolean('is_active').default(true),
    reminder24hSentAt: timestamp('reminder_24h_sent_at', { withTimezone: true }),
    reminder1hSentAt: timestamp('reminder_1h_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_events_organiser').on(table.organiserId),
    index('idx_events_category').on(table.categoryId),
    index('idx_events_start_time').on(table.startTime),
    index('idx_events_status').on(table.status),
    index('idx_events_created_at').on(table.createdAt),
  ],
);

// ============================================================
// EVENT PARTICIPANTS
// ============================================================
export const eventParticipants = pgTable(
  'event_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('confirmed'), // pending, confirmed, cancelled, waitlisted
    paymentId: uuid('payment_id'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_event_participants_unique').on(table.eventId, table.userId),
    index('idx_event_participants_event').on(table.eventId),
    index('idx_event_participants_user').on(table.userId),
  ],
);

// ============================================================
// CONVERSATIONS
// ============================================================
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 20 }).notNull(), // dm, event_chat, club_discussion, club_announcement
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
    clubId: uuid('club_id').references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_conversations_type').on(table.type),
    index('idx_conversations_last_message').on(table.lastMessageAt),
  ],
);

// ============================================================
// CONVERSATION PARTICIPANTS
// ============================================================
export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('member'),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    isMuted: boolean('is_muted').default(false),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_conv_participants_unique').on(table.conversationId, table.userId),
    index('idx_conv_participants_conv').on(table.conversationId),
    index('idx_conv_participants_user').on(table.userId),
  ],
);

// ============================================================
// MESSAGES
// ============================================================
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content'),
    messageType: varchar('message_type', { length: 20 }).default('text'),
    mediaUrl: varchar('media_url', { length: 500 }),
    isDeleted: boolean('is_deleted').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_messages_conversation').on(table.conversationId),
    index('idx_messages_created_at').on(table.createdAt),
  ],
);

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull(),
    title: varchar('title', { length: 200 }),
    body: text('body'),
    data: jsonb('data'),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notifications_user').on(table.userId),
    index('idx_notifications_created_at').on(table.createdAt),
  ],
);

// ============================================================
// REFRESH TOKENS
// ============================================================
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    deviceInfo: varchar('device_info', { length: 255 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_refresh_tokens_user').on(table.userId)],
);

// ============================================================
// PAYMENTS
// ============================================================
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    razorpayOrderId: varchar('razorpay_order_id', { length: 255 }).unique().notNull(),
    razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }).unique(),
    razorpaySignature: varchar('razorpay_signature', { length: 500 }),
    amountInr: integer('amount_inr').notNull(),
    platformFeeInr: integer('platform_fee_inr').default(0),
    status: varchar('status', { length: 20 }).default('created'),
    refundId: varchar('refund_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_payments_user').on(table.userId),
    index('idx_payments_event').on(table.eventId),
    index('idx_payments_status').on(table.status),
  ],
);

// ============================================================
// RELATIONS
// ============================================================
export const usersRelations = relations(users, ({ one, many }) => ({
  clubProfile: one(clubProfiles, { fields: [users.id], references: [clubProfiles.userId] }),
  posts: many(posts),
  reposts: many(reposts),
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'follower' }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  media: many(postMedia),
  likes: many(likes),
  reposts: many(reposts),
  comments: many(comments),
  tags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  user: one(users, { fields: [postTags.userId], references: [users.id] }),
}));

export const repostsRelations = relations(reposts, ({ one }) => ({
  user: one(users, { fields: [reposts.userId], references: [users.id] }),
  post: one(posts, { fields: [reposts.postId], references: [posts.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organiser: one(users, { fields: [events.organiserId], references: [users.id] }),
  category: one(categories, { fields: [events.categoryId], references: [categories.id] }),
  participants: many(eventParticipants),
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
  user: one(users, { fields: [eventParticipants.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, { fields: [postMedia.postId], references: [posts.id] }),
}));
