import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import { eq, inArray } from "drizzle-orm";
import { categories, inspirations, users } from "../../shared/schema";
import { db, pool } from "../db";
import { createLibraryRouter } from "../inspirations";
import type { InspirationRecord, CategoryOption } from "../../shared/inspiration-contract";

test("Feature 3 HTTP CRUD and two-user privacy", async (t) => {
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
              ["GET", "/categories"], ["GET", "/inspirations"], ["POST", "/inspirations"],
              ["GET", `/inspirations/${randomUUID()}`], ["PUT", `/inspirations/${randomUUID()}`],
              ["DELETE", `/inspirations/${randomUUID()}`],
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
          await t.test("missing required fields, invalid URLs, and unsupported difficulties are rejected", async () => {
            for (const body of [
              { ...input, title: "  " }, { ...input, categoryId: null },
              { ...input, patternUrl: "javascript:alert(1)" },
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
          await t.test("owner delete persists, and subsequent reads and repeated deletes return 404", async () => {
            assert.equal((await request(userA, "DELETE", `/inspirations/${item.id}`)).status, 204);
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
