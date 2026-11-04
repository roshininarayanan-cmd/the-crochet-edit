import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Request } from "express";
import { categories, inspirations, users } from "../../shared/schema";
import { dataOwnership, DataOwnershipError } from "../data-ownership";
import { db, pool } from "../db";

// Test-only representation of a session already attached by Clerk middleware.
// No test auth route, token bypass, or fixture account exists in the running app.
function sessionRequest(userId: string | null, spoofedUserId?: string): Request {
  const auth = Object.assign(
    () => ({
      userId,
      sessionId: userId ? "test-session" : null,
      tokenType: "session_token",
      isAuthenticated: Boolean(userId),
    }),
    { [Symbol.for("@clerk/express.auth")]: true },
  );
  return {
    auth,
    body: { userId: spoofedUserId },
    query: { userId: spoofedUserId },
    params: { userId: spoofedUserId },
  } as unknown as Request;
}

test("Feature 2: PostgreSQL constraints and backend ownership", async (t) => {
  const suffix = randomUUID();
  const userA = `datamodel-a-${suffix}`;
  const userB = `datamodel-b-${suffix}`;
  const rollback = new Error("ROLL BACK ALL TEST FIXTURES");

  try {
    try {
      await db.transaction(async (tx) => {
        const expectConstraint = async (code: string, operation: (savepoint: typeof tx) => Promise<unknown>) => {
          await assert.rejects(
            tx.transaction(operation),
            (error: unknown) => {
              const queryError = error as { code?: string; cause?: { code?: string } };
              assert.equal(queryError.cause?.code ?? queryError.code, code);
              return true;
            },
          );
        };
        const expectNotFound = (error: unknown) =>
          error instanceof DataOwnershipError && error.status === 404 && error.message === "Not found.";

        await tx.insert(users).values([
          { id: userA, email: `a-${suffix}@example.invalid` },
          { id: userB, email: `b-${suffix}@example.invalid` },
        ]);
        const [categoryA, secondCategoryA, categoryB] = await tx.insert(categories).values([
          { userId: userA, name: "Gifts" },
          { userId: userA, name: "Plushies" },
          { userId: userB, name: "Gifts" },
        ]).returning();
        const [inspirationA, secondInspirationA, inspirationB] = await tx.insert(inspirations).values([
          { userId: userA, categoryId: categoryA.id, title: "Crochet gift" },
          { userId: userA, categoryId: secondCategoryA.id, title: "Small plushie" },
          { userId: userB, categoryId: categoryB.id, title: "Another private idea" },
        ]).returning();
        const ownerA = dataOwnership(sessionRequest(userA), tx);
        const ownerB = dataOwnership(sessionRequest(userB, userA), tx);

        await t.test("UUIDs, timestamps, nullable fields, and status defaults", () => {
          assert.match(categoryA.id, /^[0-9a-f-]{36}$/);
          assert.match(inspirationA.id, /^[0-9a-f-]{36}$/);
          assert(categoryA.createdAt instanceof Date);
          assert(inspirationA.createdAt instanceof Date);
          assert(inspirationA.updatedAt instanceof Date);
          assert.equal(inspirationA.status, "Want to Make");
          for (const value of [
            inspirationA.patternUrl, inspirationA.imageKey, inspirationA.difficulty, inspirationA.notes,
          ]) assert.equal(value, null);
        });

        await t.test("one user has many categories and inspirations; category/user relationships join correctly", async () => {
          const ownedCategories = await tx.select().from(categories).where(ownerA.categoryFilter);
          assert.equal(ownedCategories.length, 2);
          const rows = await tx.select({ id: inspirations.id, categoryName: categories.name })
            .from(inspirations)
            .innerJoin(categories, and(
              eq(inspirations.categoryId, categories.id),
              eq(inspirations.userId, categories.userId),
            ))
            .innerJoin(users, eq(inspirations.userId, users.id))
            .where(ownerA.inspirationFilter);
          assert.equal(rows.length, 2);
          assert.deepEqual(rows.map((row) => row.categoryName).sort(), ["Gifts", "Plushies"]);
          const relatedUser = await tx.query.users.findFirst({
            where: eq(users.id, userA),
            with: { categories: { with: { inspirations: true } }, inspirations: true },
          });
          assert.equal(relatedUser?.categories.length, 2);
          assert.equal(relatedUser?.inspirations.length, 2);
          assert(relatedUser.categories.every((category) =>
            category.userId === userA && category.inspirations.every((idea) => idea.userId === userA)));
          await tx.insert(inspirations).values({
            userId: userA, categoryId: categoryA.id, title: "Second gift",
          });
          const inCategory = await tx.select().from(inspirations)
            .where(and(ownerA.inspirationFilter, eq(inspirations.categoryId, categoryA.id)));
          assert.equal(inCategory.length, 2);
        });

        await t.test("category names are unique per user but shared names across users are allowed", async () => {
          assert.equal(categoryA.name, categoryB.name);
          await expectConstraint("23505", (sp) =>
            sp.insert(categories).values({ userId: userA, name: "Gifts" }));
        });

        await t.test("foreign keys reject nonexistent users and categories", async () => {
          await expectConstraint("23503", (sp) =>
            sp.insert(categories).values({ userId: `missing-${suffix}`, name: "Gifts" }));
          await expectConstraint("23503", (sp) =>
            sp.insert(inspirations).values({
              userId: `missing-${suffix}`, categoryId: categoryA.id, title: "Invalid owner",
            }));
          await expectConstraint("23503", (sp) =>
            sp.insert(inspirations).values({ userId: userA, categoryId: randomUUID(), title: "Missing category" }));
        });

        await t.test("database rejects assigning an inspiration to another user's category", async () => {
          await expectConstraint("23503", (sp) =>
            sp.insert(inspirations).values({
              userId: userB, categoryId: categoryA.id, title: "Cross-owner attempt",
            }));
          await expectConstraint("23503", (sp) =>
            sp.update(inspirations).set({ categoryId: categoryA.id }).where(eq(inspirations.id, inspirationB.id)));
        });

        await t.test("required ownership, name, title, and category columns reject nulls", async () => {
          await expectConstraint("23502", (sp) =>
            sp.execute(sql`INSERT INTO categories (user_id) VALUES (${userA})`));
          await expectConstraint("23502", (sp) =>
            sp.execute(sql`INSERT INTO categories (name) VALUES ('No owner')`));
          await expectConstraint("23502", (sp) =>
            sp.execute(sql`INSERT INTO inspirations (user_id, category_id) VALUES (${userA}, ${categoryA.id})`));
          await expectConstraint("23502", (sp) =>
            sp.execute(sql`INSERT INTO inspirations (user_id, title) VALUES (${userA}, 'No category')`));
        });

        await t.test("difficulty and status are constrained to PLAN.md values", async () => {
          for (const difficulty of ["Beginner", "Intermediate", "Advanced"] as const) {
            await tx.insert(inspirations).values({
              userId: userA, categoryId: categoryA.id, title: difficulty, difficulty,
            });
          }
          for (const status of ["Want to Make", "In Progress", "Completed"] as const) {
            await tx.insert(inspirations).values({
              userId: userA, categoryId: categoryA.id, title: status, status,
            });
          }
          await expectConstraint("23514", (sp) =>
            sp.execute(sql`INSERT INTO inspirations (user_id, category_id, title, difficulty)
              VALUES (${userA}, ${categoryA.id}, 'Invalid', 'Expert')`));
          await expectConstraint("23514", (sp) =>
            sp.execute(sql`INSERT INTO inspirations (user_id, category_id, title, status)
              VALUES (${userA}, ${categoryA.id}, 'Invalid', 'Finished')`));
        });

        await t.test("missing sessions are rejected and submitted owner IDs cannot change ownership", () => {
          assert.throws(() => dataOwnership(sessionRequest(null, userA), tx),
            (error: unknown) => error instanceof DataOwnershipError && error.status === 401);
          assert.equal(ownerB.userId, userB);
        });

        await t.test("ownership checks permit own records and hide guessed IDs belonging to another user", async () => {
          await ownerA.requireCategory(categoryA.id);
          await ownerA.requireInspiration(inspirationA.id);
          await ownerA.requireInspiration(secondInspirationA.id);
          await ownerB.requireInspiration(inspirationB.id);
          await assert.rejects(ownerB.requireCategory(categoryA.id), expectNotFound);
          await assert.rejects(ownerB.requireInspiration(inspirationA.id), expectNotFound);
          await assert.rejects(ownerA.requireCategory(categoryB.id), expectNotFound);
          await assert.rejects(ownerA.requireInspiration(inspirationB.id), expectNotFound);
          await assert.rejects(ownerB.requireCategory(randomUUID()), expectNotFound);
          await assert.rejects(ownerB.requireInspiration(randomUUID()), expectNotFound);
        });

        await t.test("owner-scoped queries expose only the authenticated user's data", async () => {
          const visibleCategories = await tx.select().from(categories).where(ownerB.categoryFilter);
          const visibleInspirations = await tx.select().from(inspirations).where(ownerB.inspirationFilter);
          assert.deepEqual(visibleCategories.map((row) => row.id), [categoryB.id]);
          assert.deepEqual(visibleInspirations.map((row) => row.id), [inspirationB.id]);
          const attemptedUpdate = await tx.update(inspirations).set({ notes: "Not permitted" })
            .where(and(ownerB.inspirationFilter, eq(inspirations.id, inspirationA.id))).returning();
          const attemptedDelete = await tx.delete(categories)
            .where(and(ownerB.categoryFilter, eq(categories.id, categoryA.id))).returning();
          assert.deepEqual(attemptedUpdate, []);
          assert.deepEqual(attemptedDelete, []);
        });

        await t.test("foreign keys prevent accidental deletion of parents with dependent records", async () => {
          await expectConstraint("23503", (sp) => sp.delete(categories).where(eq(categories.id, categoryA.id)));
          await expectConstraint("23503", (sp) => sp.delete(users).where(eq(users.id, userA)));
        });

        // Always roll back, even if individual subtests have failed.
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    await t.test("test fixtures leave no users, categories, or inspirations behind", async () => {
      assert.equal((await db.select().from(users).where(inArray(users.id, [userA, userB]))).length, 0);
      assert.equal((await db.select().from(categories).where(inArray(categories.userId, [userA, userB]))).length, 0);
      assert.equal((await db.select().from(inspirations).where(inArray(inspirations.userId, [userA, userB]))).length, 0);
    });
  } finally {
    await pool.end();
  }
});
