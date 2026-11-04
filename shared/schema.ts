import { relations, sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("categories_user_name_unique").on(table.userId, table.name),
  // Required as the target of the composite ownership foreign key below.
  unique("categories_id_user_unique").on(table.id, table.userId),
]);

export const inspirations = pgTable("inspirations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  categoryId: uuid("category_id").notNull(),
  title: text("title").notNull(),
  patternUrl: text("pattern_url"),
  imageKey: text("image_key"),
  imageUrl: text("image_url"),
  difficulty: text("difficulty", { enum: ["Beginner", "Intermediate", "Advanced"] }),
  notes: text("notes"),
  status: text("status", { enum: ["Want to Make", "In Progress", "Completed"] })
    .notNull().default("Want to Make"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    name: "inspirations_category_owner_fk",
    columns: [table.categoryId, table.userId],
    foreignColumns: [categories.id, categories.userId],
  }).onDelete("restrict"),
  check("inspirations_difficulty_check", sql`${table.difficulty} IN ('Beginner', 'Intermediate', 'Advanced')`),
  check("inspirations_status_check", sql`${table.status} IN ('Want to Make', 'In Progress', 'Completed')`),
  index("inspirations_user_idx").on(table.userId),
  index("inspirations_category_owner_idx").on(table.categoryId, table.userId),
]);

export const stars = pgTable("stars", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inspirationId: uuid("inspiration_id").notNull().references(() => inspirations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("stars_user_inspiration_unique").on(table.userId, table.inspirationId),
  index("stars_user_idx").on(table.userId),
  index("stars_inspiration_idx").on(table.inspirationId),
]);

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  inspirations: many(inspirations),
  stars: many(stars),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  inspirations: many(inspirations),
}));

export const inspirationsRelations = relations(inspirations, ({ one, many }) => ({
  user: one(users, { fields: [inspirations.userId], references: [users.id] }),
  category: one(categories, {
    fields: [inspirations.categoryId, inspirations.userId],
    references: [categories.id, categories.userId],
  }),
  stars: many(stars),
}));

export const starsRelations = relations(stars, ({ one }) => ({
  user: one(users, { fields: [stars.userId], references: [users.id] }),
  inspiration: one(inspirations, {
    fields: [stars.inspirationId],
    references: [inspirations.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type Inspiration = typeof inspirations.$inferSelect;
export type Star = typeof stars.$inferSelect;
