import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const externalIdentities = pgTable(
  "external_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    lastAuthenticatedAt: timestamp("last_authenticated_at", {
      withTimezone: true,
      precision: 3,
    }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "external_identities_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("external_identities_provider_subject_unique").on(
      table.provider,
      table.providerSubject,
    ),
    index("external_identities_user_idx").on(table.userId),
    check(
      "external_identities_provider_not_blank_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "external_identities_subject_not_blank_check",
      sql`length(trim(${table.providerSubject})) > 0`,
    ),
  ],
);

export type ExternalIdentityRecord = typeof externalIdentities.$inferSelect;
