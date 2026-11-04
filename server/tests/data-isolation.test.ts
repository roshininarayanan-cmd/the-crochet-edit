import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import { eq } from "drizzle-orm";
import { categories, inspirations, users } from "../../shared/schema";
import { db, pool } from "../db";
import { createLibraryRouter } from "../inspirations";

test("Test 1: Data Isolation", async (t) => {
  const suffix = randomUUID();
  const userA = `isolation-a-${suffix}`;
  const userB = `isolation-b-${suffix}`;
  const rollback = new Error("ROLL BACK DATA ISOLATION FIXTURES");

  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values([
          { id: userA, email: `${userA}@example.invalid` },
          { id: userB, email: `${userB}@example.invalid` },
        ]);
        const [categoryA, categoryB] = await tx.insert(categories).values([
          { userId: userA, name: "Gifts" },
          { userId: userB, name: "Gifts" },
        ]).returning();

        const app = express();
        app.use(express.json());
        // Only this fixture server supplies simulated already-verified Clerk
        // sessions. The real app still uses Clerk's middleware and sessions.
        app.use((req, _res, next) => {
          const userId = req.header("x-fixture-user") ?? null;
          Object.assign(req, {
            auth: Object.assign(() => ({
              userId,
              sessionId: userId ? "fixture-session" : null,
              tokenType: "session_token",
              isAuthenticated: Boolean(userId),
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
        const request = async (userId: string, method: string, path: string, body?: unknown) => {
          const response = await fetch(`${origin}/api${path}`, {
            method,
            headers: {
              "Content-Type": "application/json",
              "x-fixture-user": userId,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
          });
          return {
            status: response.status,
            data: response.status === 204 ? null : await response.json(),
          };
        };

        try {
          const title = "User A's crochet bunny";
          const created = await request(userA, "POST", "/inspirations", {
            title,
            categoryId: categoryA.id,
            difficulty: "Beginner",
          });
          assert.equal(created.status, 201);
          const itemId = created.data.id as string;

          await t.test("User A can access their own inspiration", async () => {
            const ownDetails = await request(userA, "GET", `/inspirations/${itemId}`);
            assert.equal(ownDetails.status, 200);
            assert.equal(ownDetails.data.id, itemId);
            assert.equal(ownDetails.data.title, title);

            const ownList = await request(userA, "GET", "/inspirations");
            assert.equal(ownList.status, 200);
            assert.deepEqual(ownList.data.map((item: { id: string }) => item.id), [itemId]);
          });

          await t.test("User B cannot see User A's inspiration in their list", async () => {
            const otherUsersList = await request(userB, "GET", "/inspirations");
            assert.equal(otherUsersList.status, 200);
            assert.deepEqual(
              otherUsersList.data,
              [],
              "User B's list should not include User A's inspiration",
            );
          });

          await t.test("User B cannot access, edit, or delete User A's inspiration", async () => {
            const hidden = await request(userB, "GET", `/inspirations/${itemId}`);
            const missing = await request(userB, "GET", `/inspirations/${randomUUID()}`);
            assert.equal(hidden.status, 404);
            assert.deepEqual(hidden.data, missing.data);

            const edited = await request(userB, "PUT", `/inspirations/${itemId}`, {
              title: "Changed by User B",
              categoryId: categoryB.id,
            });
            assert.equal(edited.status, 404);

            const deleted = await request(userB, "DELETE", `/inspirations/${itemId}`);
            assert.equal(deleted.status, 404);

            const ownerCanStillAccess = await request(userA, "GET", `/inspirations/${itemId}`);
            assert.equal(ownerCanStillAccess.status, 200);
            assert.equal(ownerCanStillAccess.data.title, title);
            const [saved] = await tx.select().from(inspirations)
              .where(eq(inspirations.id, itemId)).limit(1);
            assert.equal(saved.userId, userA);
            assert.equal(saved.title, title);
          });
        } finally {
          await new Promise<void>((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
          });
        }
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }

    await t.test("test users and inspirations are rolled back", async () => {
      const fixtureUsers = await db.select().from(users).where(eq(users.id, userA));
      assert.deepEqual(fixtureUsers, []);
      const fixtureOwners = await db.select().from(inspirations).where(eq(inspirations.userId, userA));
      assert.deepEqual(fixtureOwners, []);
    });
  } finally {
    await pool.end();
  }
});
