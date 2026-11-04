import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import { eq, inArray } from "drizzle-orm";
import { categories, inspirations, stars, users } from "../../shared/schema";
import { db, pool } from "../db";
import { createLibraryRouter } from "../inspirations";
import type { InspirationRecord, CategoryOption } from "../../shared/inspiration-contract";

test("Feature 3 CRUD and Feature 5 favorites privacy", async (t) => {
  const suffix = randomUUID();
  const userA = `crud-a-${suffix}`;
  const userB = `crud-b-${suffix}`;
  const rollback = new Error("ROLL BACK TEST DATA");
  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values([
          { id: userA, email: `crud-a-${suffix}@example.invalid` },
          { id: userB, email: `crud-b-${suffix}@example.invalid` },
        ]);
        const [categoryA, categoryB] = await tx.insert(categories).values([
          { userId: userA, name: "Gifts" }, { userId: userB, name: "Gifts" },
        ]).returning();
        const app = express();
        app.use(express.json());
        // This fixture server is loopback-only and never mounted in the real app.
        // Clerk itself verifies sessions on the real app; here we attach its
        // already-verified request shape to exercise the actual production router.
        app.use((req, _res, next) => {
          const userId = req.header("x-fixture-user") ?? null;
          Object.assign(req, {
            auth: Object.assign(() => ({
              userId, sessionId: userId ? "fixture-session" : null,
              tokenType: "session_token", isAuthenticated: Boolean(userId),
            }), { [Symbol.for("@clerk/express.auth")]: true }),
          });
          next();
        });
        app.use("/api", createLibraryRouter(tx));
        const server = app.listen(0, "127.0.0.1");
        await new Promise<void>((resolve) => server.once("listening", resolve));
        const address = server.address();
        assert(address && typeof address !== "string");
        const origin = `http://127.0.0.1:${address.port}`;
        const request = async (user: string | null, method: string, path: string, body?: unknown) => {
          const response = await fetch(`${origin}/api${path}`, {
            method,
            headers: { "Content-Type": "application/json", ...(user ? { "x-fixture-user": user } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
          });
          const data = response.status === 204 ? null : await response.json();
          return { status: response.status, data, cacheControl: response.headers.get("cache-control") };
        };
        let item: InspirationRecord;
        const input = {
          title: "A little crochet bunny", categoryId: categoryA.id,
          patternUrl: "https://example.com/bunny-pattern",
          imageUrl: "https://example.com/bunny.jpg",
          difficulty: "Beginner", notes: "A gift for spring.\nUse soft yarn.",
        };
        try {
          await t.test("every resource operation rejects a signed-out request", async () => {
            for (const [method, path] of [
              ["GET", "/categories"], ["GET", "/inspirations"], ["GET", "/favorites"], ["GET", "/dashboard"], ["POST", "/inspirations"],
              ["GET", `/inspirations/${randomUUID()}`], ["PUT", `/inspirations/${randomUUID()}`],
              ["DELETE", `/inspirations/${randomUUID()}`],
              ["POST", `/inspirations/${randomUUID()}/star`],
              ["DELETE", `/inspirations/${randomUUID()}/star`],
            ]) assert.equal((await request(null, method, path, method === "POST" || method === "PUT" ? input : undefined)).status, 401);
          });
          await t.test("per-user category options are private and defaults are idempotent", async () => {
            const a = await request(userA, "GET", "/categories");
            const b = await request(userB, "GET", "/categories");
            assert.equal(a.status, 200);
            assert.equal(a.data.length, 6);
            assert.equal(b.data.length, 6);
            assert(a.data.some((category: CategoryOption) => category.id === categoryA.id));
            assert(!b.data.some((category: CategoryOption) => category.id === categoryA.id));
            assert(b.data.some((category: CategoryOption) => category.id === categoryB.id));
            assert.equal((await request(userA, "GET", "/categories")).data.length, 6);
          });
          await t.test("create persists all fields and ignores submitted owner and status", async () => {
            const response = await request(userA, "POST", "/inspirations", {
              ...input, userId: userB, status: "Completed",
            });
            assert.equal(response.status, 201);
            item = response.data;
            assert.equal(item.title, input.title);
            assert.equal(item.notes, input.notes);
            assert.equal(item.patternUrl, input.patternUrl);
            assert.equal(item.imageUrl, input.imageUrl);
            assert.equal(item.categoryName, "Gifts");
            assert.equal(item.difficulty, "Beginner");
            const [saved] = await tx.select().from(inspirations).where(eq(inspirations.id, item.id));
            assert.equal(saved.userId, userA);
            assert.equal(saved.status, "Want to Make");
          });
          await t.test("User B cannot list or open User A's inspiration", async () => {
            const a = await request(userA, "GET", "/inspirations");
            const b = await request(userB, "GET", "/inspirations");
            assert.equal(a.data.length, 1);
            assert.equal(b.status, 200);
            assert.deepEqual(b.data, []);
            assert.equal(a.cacheControl, "private, no-store");
            assert.equal((await request(userA, "GET", `/inspirations/${item.id}`)).status, 200);
            const hidden = await request(userB, "GET", `/inspirations/${item.id}`);
            const missing = await request(userB, "GET", `/inspirations/${randomUUID()}`);
            assert.equal(hidden.status, 404);
            assert.deepEqual(hidden.data, missing.data);
          });
          await t.test("User B cannot edit or delete User A's inspiration", async () => {
            assert.equal((await request(userB, "PUT", `/inspirations/${item.id}`, {
              title: "Stolen", categoryId: categoryB.id,
            })).status, 404);
            assert.equal((await request(userB, "DELETE", `/inspirations/${item.id}`)).status, 404);
            const own = await request(userA, "GET", `/inspirations/${item.id}`);
            assert.equal(own.data.title, input.title);
          });
          await t.test("another user's category is rejected on create and edit", async () => {
            assert.equal((await request(userA, "POST", "/inspirations", { ...input, categoryId: categoryB.id })).status, 404);
            assert.equal((await request(userA, "PUT", `/inspirations/${item.id}`, { ...input, categoryId: categoryB.id })).status, 404);
          });
          await t.test("required fields and invalid pattern URLs are rejected on create and edit", async () => {
            const invalidFields: Array<[Record<string, unknown>, string]> = [
              [{ ...input, title: "  " }, "A title is required."],
              [{ ...input, categoryId: "" }, "Choose a category."],
              [{ ...input, patternUrl: "javascript:alert(1)" }, "Please enter a valid pattern URL beginning with http:// or https://."],
              [{ ...input, patternUrl: "not a URL" }, "Please enter a valid pattern URL beginning with http:// or https://."],
            ];
            for (const [body, message] of invalidFields) {
              for (const [method, path] of [
                ["POST", "/inspirations"],
                ["PUT", `/inspirations/${item.id}`],
              ] as const) {
                const response = await request(userA, method, path, body);
                assert.equal(response.status, 400);
                assert.deepEqual(response.data, { error: message });
              }
            }
            const unchanged = await request(userA, "GET", `/inspirations/${item.id}`);
            assert.equal(unchanged.data.title, input.title);
            assert.equal(unchanged.data.patternUrl, input.patternUrl);
          });
          await t.test("unsupported optional values are rejected", async () => {
            for (const body of [
              { ...input, imageUrl: "data:image/svg+xml,bad" },
              { ...input, difficulty: "Expert" }, { ...input, notes: 123 },
            ]) assert.equal((await request(userA, "POST", "/inspirations", body)).status, 400);
            assert.equal((await request(userA, "GET", "/inspirations/not-a-uuid")).status, 404);
          });
          await t.test("edit persists category/title changes and clears optional fields without touching storage references", async () => {
            await tx.update(inspirations).set({ imageKey: "reserved-upload-key" }).where(eq(inspirations.id, item.id));
            const options = (await request(userA, "GET", "/categories")).data as CategoryOption[];
            const response = await request(userA, "PUT", `/inspirations/${item.id}`, {
              title: "Updated bunny", categoryId: options.find((option) => option.name === "Plushies")!.id,
              notes: "", imageUrl: "", patternUrl: "", difficulty: "",
            });
            assert.equal(response.status, 200);
            assert.equal(response.data.title, "Updated bunny");
            assert.equal(response.data.categoryName, "Plushies");
            for (const key of ["notes", "imageUrl", "patternUrl", "difficulty"]) assert.equal(response.data[key], null);
            assert(new Date(response.data.updatedAt).getTime() >= new Date(item.updatedAt).getTime());
            const [saved] = await tx.select().from(inspirations).where(eq(inspirations.id, item.id));
            assert.equal(saved.imageKey, "reserved-upload-key");
            assert.equal(saved.userId, userA);
          });
          await t.test("stars are unique, private, persistent, and cascade on inspiration deletion", async () => {
            const path = `/inspirations/${item.id}/star`;
            assert.equal((await request(userA, "POST", path)).status, 204);
            assert.equal((await request(userA, "POST", path)).status, 204);

            const savedStars = await tx.select().from(stars).where(eq(stars.userId, userA));
            assert.equal(savedStars.length, 1);
            assert.equal(savedStars[0].inspirationId, item.id);
            assert.equal(typeof savedStars[0].id, "string");
            assert(savedStars[0].createdAt instanceof Date);

            const ownerFavorites = await request(userA, "GET", "/favorites");
            assert.equal(ownerFavorites.status, 200);
            assert.equal(ownerFavorites.data.length, 1);
            assert.equal(ownerFavorites.data[0].id, item.id);
            assert.equal(ownerFavorites.data[0].isStarred, true);
            assert.deepEqual((await request(userB, "GET", "/favorites")).data, []);
            assert.equal((await request(userA, "GET", "/favorites")).data.length, 1);
            assert.equal((await request(userA, "GET", "/inspirations")).data[0].isStarred, true);
            assert.equal((await request(userA, "GET", `/inspirations/${item.id}`)).data.isStarred, true);
            assert.equal((await request(userB, "POST", path)).status, 404);
            assert.equal((await request(userB, "DELETE", path)).status, 404);
            assert.equal((await tx.select().from(stars).where(eq(stars.userId, userA))).length, 1);

            assert.equal((await request(userA, "DELETE", path)).status, 204);
            assert.deepEqual((await request(userA, "GET", "/favorites")).data, []);
            assert.equal((await request(userA, "GET", "/inspirations")).data[0].isStarred, false);
            assert.equal((await tx.select().from(stars).where(eq(stars.userId, userA))).length, 0);

            assert.equal((await request(userA, "POST", path)).status, 204);
            assert.equal((await request(userA, "GET", "/favorites")).data.length, 1);
          });
          await t.test("dashboard totals and category chart use only the signed-in user's live records", async () => {
            const emptyDashboard = await request(userB, "GET", "/dashboard");
            assert.equal(emptyDashboard.status, 200);
            assert.equal(emptyDashboard.data.totalInspirations, 0);
            assert.equal(emptyDashboard.data.starredInspirations, 0);
            assert.equal(emptyDashboard.data.categoriesUsed, 0);
            assert(emptyDashboard.data.categoryCounts.every((category: { inspirationCount: number }) => category.inspirationCount === 0));

            const categoryOptions = await request(userA, "GET", "/categories");
            const plushies = categoryOptions.data.find((category: CategoryOption) => category.name === "Plushies");
            assert(plushies);
            const secondA = await request(userA, "POST", "/inspirations", {
              ...input, title: "A second project", categoryId: categoryA.id,
            });
            assert.equal(secondA.status, 201);
            const secondB = await request(userB, "POST", "/inspirations", {
              ...input, title: "Another user's project", categoryId: categoryB.id,
            });
            assert.equal(secondB.status, 201);
            assert.equal((await request(userB, "POST", `/inspirations/${secondB.data.id}/star`)).status, 204);

            const summary = await request(userA, "GET", "/dashboard");
            assert.equal(summary.status, 200);
            assert.equal(summary.cacheControl, "private, no-store");
            assert.equal(summary.data.totalInspirations, 2);
            assert.equal(summary.data.starredInspirations, 1);
            assert.equal(summary.data.categoriesUsed, 2);
            const counts = Object.fromEntries(summary.data.categoryCounts.map((category: {
              categoryName: string; inspirationCount: number;
            }) => [category.categoryName, category.inspirationCount]));
            assert.equal(counts.Plushies, 1);
            assert.equal(counts.Gifts, 1);

            const moved = await request(userA, "PUT", `/inspirations/${secondA.data.id}`, {
              ...input, title: "A second project", categoryId: plushies.id,
            });
            assert.equal(moved.status, 200);
            const afterEdit = await request(userA, "GET", "/dashboard");
            assert.equal(afterEdit.data.totalInspirations, 2);
            assert.equal(afterEdit.data.categoriesUsed, 1);
            const editedCounts = Object.fromEntries(afterEdit.data.categoryCounts.map((category: {
              categoryName: string; inspirationCount: number;
            }) => [category.categoryName, category.inspirationCount]));
            assert.equal(editedCounts.Plushies, 2);
            assert.equal(editedCounts.Gifts, 0);

            assert.equal((await request(userA, "DELETE", `/inspirations/${secondA.data.id}`)).status, 204);
            const afterDelete = await request(userA, "GET", "/dashboard");
            assert.equal(afterDelete.data.totalInspirations, 1);
            assert.equal(afterDelete.data.starredInspirations, 1);
            assert.equal(afterDelete.data.categoriesUsed, 1);
            const userBSummary = await request(userB, "GET", "/dashboard");
            assert.equal(userBSummary.data.totalInspirations, 1);
            assert.equal(userBSummary.data.starredInspirations, 1);
            assert.equal(userBSummary.data.categoriesUsed, 1);
          });
          await t.test("owner delete persists, and subsequent reads and repeated deletes return 404", async () => {
            assert.equal((await tx.select().from(stars).where(eq(stars.inspirationId, item.id))).length, 1);
            assert.equal((await request(userA, "DELETE", `/inspirations/${item.id}`)).status, 204);
            assert.equal((await tx.select().from(stars).where(eq(stars.inspirationId, item.id))).length, 0);
            assert.equal((await request(userA, "GET", `/inspirations/${item.id}`)).status, 404);
            assert.equal((await request(userA, "DELETE", `/inspirations/${item.id}`)).status, 404);
            assert.deepEqual((await request(userA, "GET", "/inspirations")).data, []);
          });
          await t.test("optional fields can be omitted entirely", async () => {
            const response = await request(userB, "POST", "/inspirations", { title: "Simple idea", categoryId: categoryB.id });
            assert.equal(response.status, 201);
            assert.equal(response.data.imageUrl, null);
            assert.equal(response.data.difficulty, null);
            assert.equal((await request(userA, "GET", `/inspirations/${response.data.id}`)).status, 404);
          });
        } finally {
          await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        }
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    await t.test("fixtures are rolled back", async () => {
      assert.equal((await db.select().from(users).where(inArray(users.id, [userA, userB]))).length, 0);
    });
  } finally { await pool.end(); }
});
