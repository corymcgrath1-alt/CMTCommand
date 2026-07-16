import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userStatusValues = [
  "active",
  "invited",
  "suspended",
  "disabled",
] as const;

export type UserStatus = (typeof userStatusValues)[number];

export const userStatus = pgEnum("user_status", userStatusValues);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    displayName: text("display_name").notNull(),
    status: userStatus("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    lastAuthenticatedAt: timestamp("last_authenticated_at", {
      withTimezone: true,
      precision: 3,
    }),
  },
  (table) => [
    unique("users_normalized_email_unique").on(table.normalizedEmail),
    index("users_email_idx").on(table.email),
    check("users_email_not_blank_check", sql`length(trim(${table.email})) > 0`),
    check(
      "users_normalized_email_format_check",
      sql`${table.normalizedEmail} = lower(trim(${table.normalizedEmail})) and length(${table.normalizedEmail}) > 2`,
    ),
    check(
      "users_display_name_not_blank_check",
      sql`length(trim(${table.displayName})) > 0`,
    ),
  ],
);

export type UserRecord = typeof users.$inferSelect;
