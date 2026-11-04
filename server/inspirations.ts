import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { categories, inspirations, users } from "../shared/schema";
import type { Difficulty, InspirationInput } from "../shared/inspiration-contract";
import { db } from "./db";
import { dataOwnership, DataOwnershipError } from "./data-ownership";

type Connection = Pick<typeof db, "select" | "insert" | "update" | "delete">;
const defaultCategories = ["Plushies", "Clothing", "Bags", "Accessories", "Home Decor", "Gifts"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class InputError extends Error {}

function optionalText(body: Record<string, unknown>, key: string, max: number): string | null {
  const value = body[key];
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new InputError(`Please check ${key}.`);
  return value.trim() || null;
}
function optionalUrl(body: Record<string, unknown>, key: string): string | null {
  const value = optionalText(body, key, 4096);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new InputError(`Use a complete http:// or https:// URL for ${key === "imageUrl" ? "the image" : "the pattern"}.`); }
}
export function parseInspirationInput(body: unknown): Required<InspirationInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Please provide inspiration details.");
  const input = body as Record<string, unknown>;
  const title = optionalText(input, "title", 300);
  if (!title) throw new InputError("A title is required.");
  if (typeof input.categoryId !== "string" || !uuid.test(input.categoryId)) {
    throw new InputError("Choose a category.");
  }
  const difficulty = optionalText(input, "difficulty", 30);
  if (difficulty && !["Beginner", "Intermediate", "Advanced"].includes(difficulty)) {
    throw new InputError("Choose Beginner, Intermediate, or Advanced.");
  }
  return {
    title, categoryId: input.categoryId, difficulty: difficulty as Difficulty | null,
    notes: optionalText(input, "notes", 20000),
    patternUrl: optionalUrl(input, "patternUrl"), imageUrl: optionalUrl(input, "imageUrl"),
  };
}

const selection = {
  id: inspirations.id, title: inspirations.title,
  categoryId: inspirations.categoryId, categoryName: categories.name,
  patternUrl: inspirations.patternUrl, imageUrl: inspirations.imageUrl,
  difficulty: inspirations.difficulty, notes: inspirations.notes,
  createdAt: inspirations.createdAt, updatedAt: inspirations.updatedAt,
};

export function createLibraryRouter(connection: Connection = db) {
  const router = Router();
  const handle = (handler: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "private, no-store");
      Promise.resolve().then(() => handler(req, res)).catch((error: unknown) => {
        if (error instanceof DataOwnershipError) {
          res.status(error.status).json({ error: error.message });
        } else if (error instanceof InputError) {
          res.status(400).json({ error: error.message });
        } else if ((error as { cause?: { code?: string } }).cause?.code === "23503") {
          res.status(409).json({ error: "Your account or category changed. Reload and try again." });
        } else {
          console.error("An inspiration database request failed.");
          res.status(500).json({ error: "We couldn't save or load your inspiration. Please try again." });
        }
      });
    };
  const requireId = (req: Request): string => {
    const id = String(req.params.id);
    if (!uuid.test(id)) throw new DataOwnershipError(404);
    return id;
  };
  const findOwned = async (req: Request, id: string) => {
    const scope = dataOwnership(req, connection);
    const [row] = await connection.select(selection).from(inspirations)
      .innerJoin(categories, and(eq(inspirations.categoryId, categories.id), eq(inspirations.userId, categories.userId)))
      .where(and(scope.inspirationFilter, eq(inspirations.id, id))).limit(1);
    if (!row) throw new DataOwnershipError(404);
    return row;
  };

  router.get("/categories", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const [user] = await connection.select({ id: users.id }).from(users).where(eq(users.id, scope.userId)).limit(1);
    if (!user) {
      res.status(409).json({ error: "Finish account setup, then try again." });
      return;
    }
    // Only selection support for inspiration CRUD, not category management.
    await connection.insert(categories).values(defaultCategories.map((name) => ({ userId: scope.userId, name })))
      .onConflictDoNothing({ target: [categories.userId, categories.name] });
    res.json(await connection.select({ id: categories.id, name: categories.name })
      .from(categories).where(scope.categoryFilter).orderBy(asc(categories.name)));
  }));
  router.get("/inspirations", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    res.json(await connection.select(selection).from(inspirations)
      .innerJoin(categories, and(eq(inspirations.categoryId, categories.id), eq(inspirations.userId, categories.userId)))
      .where(scope.inspirationFilter).orderBy(desc(inspirations.createdAt), desc(inspirations.id)));
  }));
  router.get("/inspirations/:id", handle(async (req, res) => {
    dataOwnership(req, connection);
    res.json(await findOwned(req, requireId(req)));
  }));
  router.post("/inspirations", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const input = parseInspirationInput(req.body);
    await scope.requireCategory(input.categoryId);
    const [row] = await connection.insert(inspirations).values({ ...input, userId: scope.userId })
      .returning({ id: inspirations.id });
    res.status(201).json(await findOwned(req, row.id));
  }));
  router.put("/inspirations/:id", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const id = requireId(req);
    await scope.requireInspiration(id);
    const input = parseInspirationInput(req.body);
    await scope.requireCategory(input.categoryId);
    const [row] = await connection.update(inspirations).set({ ...input, updatedAt: new Date() })
      .where(and(scope.inspirationFilter, eq(inspirations.id, id))).returning({ id: inspirations.id });
    if (!row) throw new DataOwnershipError(404);
    res.json(await findOwned(req, row.id));
  }));
  router.delete("/inspirations/:id", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const id = requireId(req);
    const [row] = await connection.delete(inspirations)
      .where(and(scope.inspirationFilter, eq(inspirations.id, id))).returning({ id: inspirations.id });
    if (!row) throw new DataOwnershipError(404);
    res.status(204).end();
  }));
  return router;
}
