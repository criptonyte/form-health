import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), kind: text('kind').notNull(),
 date: text('date').notNull(), value: real('value').notNull(), label: text('label').notNull().default(''),
 source: text('source').notNull().default('manual'), bodyFat: real('body_fat'),
 createdAt: integer('created_at').notNull(),
}, t => [index('records_owner_date').on(t.owner, t.date)]);
export const preferences = sqliteTable('preferences', {
 owner: text('owner').primaryKey(), goal: real('goal').notNull().default(85),
 calories: integer('calories').notNull().default(2000), water: integer('water').notNull().default(2500),
 timezone: text('timezone').notNull().default('Australia/Sydney'),
});
export const connections = sqliteTable('connections', {
 owner: text('owner').primaryKey(), credentials: text('credentials').notNull(),
 tokens: text('tokens'), syncedAt: integer('synced_at'), lockUntil: integer('lock_until').notNull().default(0),
});
export const oauthStates = sqliteTable('oauth_states', {
 state: text('state').primaryKey(), owner: text('owner').notNull(), expiresAt: integer('expires_at').notNull(),
});
