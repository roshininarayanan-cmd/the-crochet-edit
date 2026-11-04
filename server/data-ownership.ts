import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import type { Request, RequestHandler } from "express";
import { categories, inspirations } from "../shared/schema";
import { db } from "./db";

export class DataOwnershipError extends Error {
  constructor(public readonly status: 401 | 404) {
    super(status === 401 ? "Sign in to continue." : "Not found.");
  }
}

// Accept only the verified Clerk session, never a body/query/URL user ID.
// These are authorization primitives, not resource CRUD endpoints.
export function dataOwnership(request: Request, connection: Pick<typeof db, "select"> = db) {
  const { userId } = getAuth(request);
  if (!userId) throw new DataOwnershipError(401);

  const categoryFilter = eq(categories.userId, userId);
  const inspirationFilter = eq(inspirations.userId, userId);

  return Object.freeze({
    userId,
    categoryFilter,
    inspirationFilter,
    async requireCategory(id: string) {
      const [owned] = await connection.select({ id: categories.id }).from(categories)
        .where(and(categoryFilter, eq(categories.id, id))).limit(1);
      if (!owned) throw new DataOwnershipError(404);
    },
    async requireInspiration(id: string) {
      const [owned] = await connection.select({ id: inspirations.id }).from(inspirations)
        .where(and(inspirationFilter, eq(inspirations.id, id))).limit(1);
      if (!owned) throw new DataOwnershipError(404);
    },
  });
}

// Reserve the future resource namespaces without exposing any CRUD operations.
export const requireLibraryOwner: RequestHandler = (request, response, next) => {
  try {
    response.locals.dataOwnership = dataOwnership(request);
    next();
  } catch (error) {
    if (error instanceof DataOwnershipError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    next(error);
  }
};
