import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import { inArray } from "drizzle-orm";
import { categories, inspirations, users } from "../../shared/schema";
import { db, pool } from "../db";
import { createLibraryRouter } from "../inspirations";

test("Test 2: Dashboard Calculation", async (t) => {
  const suffix = randomUUID();
  const userA = `dashboard-a-${suffix}`;
  const userB = `dashboard-b-${suffix}`;
  const rollback = new Error("ROLL BACK DASHBOARD TEST FIXTURES");

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

        await tx.insert(inspirations).values([
          { userId: userA, categoryId: categoryA.id, title: "Crochet bunny" },
          { userId: userA, categoryId: categoryA.id, title: "Market tote" },
          { userId: userA, categoryId: categoryA.id, title: "Soft blanket" },
          { userId: userB, categoryId: categoryB.id, title: "Another user's project" },
        ]);

        const app = express();
        // This loopback fixture simulates a verified Clerk identity; the real app
        // continues to verify sessions through its existing Clerk middleware.
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

        try {
          const response = await fetch(`http://127.0.0.1:${address.port}/api/dashboard`, {
            headers: { "x-fixture-user": userA },
          });
          assert.equal(response.status, 200);
          assert.equal(response.headers.get("cache-control"), "private, no-store");
          const dashboardData = await response.json() as {
            totalInspirations: number;
            starredInspirations: number;
            categoriesUsed: number;
            categoryCounts: Array<{ categoryName: string; inspirationCount: number }>;
          };

          await t.test("dashboard returns the signed-in user's live total to the UI", () => {
            // DashboardPage displays this exact API field in its Total Inspirations card.
            assert.equal(
              dashboardData.totalInspirations,
              3,
              "The dashboard UI should receive the count of the three saved inspirations",
            );
            assert.equal(typeof dashboardData.totalInspirations, "number");
          });

          await t.test("other users' inspirations do not affect the dashboard total", () => {
            assert.equal(dashboardData.totalInspirations, 3);
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

    await t.test("dashboard test users and inspirations are rolled back", async () => {
      const fixtureUsers = await db.select().from(users)
        .where(inArray(users.id, [userA, userB]));
      assert.deepEqual(fixtureUsers, []);
    });
  } finally {
    await pool.end();
  }
});
