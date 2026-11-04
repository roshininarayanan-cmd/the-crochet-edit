import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, count, desc, eq, exists } from "drizzle-orm";
import multer from "multer";
import { categories, inspirations, stars, users } from "../shared/schema";
import type { Difficulty, InspirationInput } from "../shared/inspiration-contract";
import type { DashboardSummary } from "../shared/dashboard-contract";
import { db } from "./db";
import { dataOwnership, DataOwnershipError } from "./data-ownership";
import {
  deleteUserPhoto,
  InvalidPhotoError,
  isOwnedPhotoKey,
  MAX_PHOTO_BYTES,
  PhotoStorageError,
  readUserPhoto,
  storeUserPhoto,
} from "./photo-storage";

type Connection = Pick<typeof db, "select" | "insert" | "update" | "delete">;
const defaultCategories = ["Plushies", "Clothing", "Bags", "Accessories", "Home Decor", "Gifts"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class InputError extends Error {}
const multipartPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
}).single("photo");

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
  } catch {
    const label = key === "imageUrl" ? "image" : "pattern";
    throw new InputError(`Please enter a valid ${label} URL beginning with http:// or https://.`);
  }
}

function parseRemoveUploadedPhoto(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const value = (body as Record<string, unknown>).removeUploadedPhoto;
  if (value == null || value === "" || value === false || value === "false") return false;
  if (value === true || value === "true") return true;
  throw new InputError("Please choose whether to keep or remove the uploaded photo.");
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

function inspirationSelection(userId: string, connection: Connection) {
  return {
    id: inspirations.id, title: inspirations.title,
    categoryId: inspirations.categoryId, categoryName: categories.name,
    patternUrl: inspirations.patternUrl, imageUrl: inspirations.imageUrl,
    difficulty: inspirations.difficulty, notes: inspirations.notes,
    isStarred: exists(connection.select({ id: stars.id }).from(stars)
      .where(and(eq(stars.userId, userId), eq(stars.inspirationId, inspirations.id)))),
    createdAt: inspirations.createdAt, updatedAt: inspirations.updatedAt,
    imageKey: inspirations.imageKey,
  };
}

function presentInspiration<T extends { id: string; imageKey: string | null; imageUrl: string | null }>(row: T) {
  const { imageKey, ...record } = row;
  return {
    ...record,
    photoUrl: imageKey ? `/api/inspirations/${encodeURIComponent(row.id)}/photo` : null,
  };
}

export function createLibraryRouter(connection: Connection = db) {
  const router = Router();
  const parsePhoto = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "private, no-store");
    multipartPhoto(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Photos must be 5 MB or smaller." });
        return;
      }
      if (error instanceof multer.MulterError) {
        res.status(400).json({ error: "Please choose one photo in JPG, PNG, or WebP format." });
        return;
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Please choose a photo in JPG, PNG, or WebP format.",
      });
    });
  };
  const handle = (handler: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "private, no-store");
      Promise.resolve().then(() => handler(req, res)).catch((error: unknown) => {
        if (error instanceof DataOwnershipError) {
          res.status(error.status).json({ error: error.message });
        } else if (error instanceof InputError) {
          res.status(400).json({ error: error.message });
        } else if (error instanceof InvalidPhotoError) {
          res.status(400).json({ error: error.message });
        } else if (error instanceof PhotoStorageError) {
          res.status(503).json({ error: error.message });
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
    const [row] = await connection.select(inspirationSelection(scope.userId, connection)).from(inspirations)
      .innerJoin(categories, and(eq(inspirations.categoryId, categories.id), eq(inspirations.userId, categories.userId)))
      .where(and(scope.inspirationFilter, eq(inspirations.id, id))).limit(1);
    if (!row) throw new DataOwnershipError(404);
    return row;
  };
  const cleanupPhoto = async (userId: string, key: string) => {
    try {
      await deleteUserPhoto(userId, key);
    } catch {
      console.error("App Storage could not remove an old inspiration photo.");
    }
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
  router.get("/favorites", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const rows = await connection.select(inspirationSelection(scope.userId, connection))
      .from(stars)
      .innerJoin(inspirations, and(eq(stars.inspirationId, inspirations.id), eq(stars.userId, inspirations.userId)))
      .innerJoin(categories, and(eq(inspirations.categoryId, categories.id), eq(inspirations.userId, categories.userId)))
      .where(and(eq(stars.userId, scope.userId), scope.inspirationFilter))
      .orderBy(desc(stars.createdAt), desc(inspirations.createdAt));
    res.json(rows.map(presentInspiration));
  }));
  router.get("/dashboard", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const [inspirationTotals] = await connection.select({ total: count() }).from(inspirations)
      .where(scope.inspirationFilter);
    const [starTotals] = await connection.select({ total: count() }).from(stars)
      .innerJoin(inspirations, and(
        eq(stars.inspirationId, inspirations.id),
        eq(stars.userId, inspirations.userId),
      ))
      .where(and(eq(stars.userId, scope.userId), scope.inspirationFilter));
    const categoryCounts = await connection.select({
      categoryId: categories.id,
      categoryName: categories.name,
      inspirationCount: count(inspirations.id),
    })
      .from(categories)
      .leftJoin(inspirations, and(
        eq(inspirations.categoryId, categories.id),
        eq(inspirations.userId, scope.userId),
      ))
      .where(scope.categoryFilter)
      .groupBy(categories.id, categories.name)
      .orderBy(asc(categories.name));
    const summary: DashboardSummary = {
      totalInspirations: inspirationTotals.total,
      starredInspirations: starTotals.total,
      categoriesUsed: categoryCounts.filter((category) => category.inspirationCount > 0).length,
      categoryCounts,
    };
    res.json(summary);
  }));
  router.get("/inspirations", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const rows = await connection.select(inspirationSelection(scope.userId, connection)).from(inspirations)
      .innerJoin(categories, and(eq(inspirations.categoryId, categories.id), eq(inspirations.userId, categories.userId)))
      .where(scope.inspirationFilter).orderBy(desc(inspirations.createdAt), desc(inspirations.id));
    res.json(rows.map(presentInspiration));
  }));
  router.get("/inspirations/:id", handle(async (req, res) => {
    dataOwnership(req, connection);
    res.json(presentInspiration(await findOwned(req, requireId(req))));
  }));
  router.get("/inspirations/:id/photo", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const row = await findOwned(req, requireId(req));
    if (!row.imageKey || !isOwnedPhotoKey(scope.userId, row.imageKey)) {
      throw new DataOwnershipError(404);
    }
    const photo = await readUserPhoto(scope.userId, row.imageKey);
    res.setHeader("Content-Type", photo.contentType);
    res.setHeader("Content-Length", photo.bytes.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(photo.bytes);
  }));
  router.post("/inspirations/:id/star", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const id = requireId(req);
    await scope.requireInspiration(id);
    await connection.insert(stars).values({ userId: scope.userId, inspirationId: id })
      .onConflictDoNothing({ target: [stars.userId, stars.inspirationId] });
    res.status(204).end();
  }));
  router.delete("/inspirations/:id/star", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const id = requireId(req);
    await scope.requireInspiration(id);
    await connection.delete(stars)
      .where(and(eq(stars.userId, scope.userId), eq(stars.inspirationId, id)));
    res.status(204).end();
  }));
  router.post("/inspirations", parsePhoto, handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const input = parseInspirationInput(req.body);
    await scope.requireCategory(input.categoryId);
    let storedKey: string | null = null;
    let rowId: string;
    try {
      if (req.file) {
        const stored = await storeUserPhoto(scope.userId, req.file.buffer);
        storedKey = stored.key;
      }
      const [row] = await connection.insert(inspirations).values({
        ...input,
        imageUrl: storedKey ? null : input.imageUrl,
        imageKey: storedKey,
        userId: scope.userId,
      }).returning({ id: inspirations.id });
      rowId = row.id;
    } catch (error) {
      if (storedKey) await cleanupPhoto(scope.userId, storedKey);
      throw error;
    }
    res.status(201).json(presentInspiration(await findOwned(req, rowId)));
  }));
  router.put("/inspirations/:id", parsePhoto, handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const id = requireId(req);
    const existing = await findOwned(req, id);
    const input = parseInspirationInput(req.body);
    await scope.requireCategory(input.categoryId);
    const removeUploadedPhoto = parseRemoveUploadedPhoto(req.body);
    if (req.file && removeUploadedPhoto) {
      throw new InputError("Choose a new photo or remove the current one, but not both.");
    }

    let storedKey: string | null = null;
    let updatedId: string;
    const clearExistingPhoto = removeUploadedPhoto || Boolean(input.imageUrl);
    try {
      if (req.file) {
        const stored = await storeUserPhoto(scope.userId, req.file.buffer);
        storedKey = stored.key;
      }
      const [row] = await connection.update(inspirations).set({
        ...input,
        ...(storedKey
          ? { imageKey: storedKey, imageUrl: null }
          : clearExistingPhoto ? { imageKey: null } : {}),
        updatedAt: new Date(),
      })
        .where(and(scope.inspirationFilter, eq(inspirations.id, id))).returning({ id: inspirations.id });
      if (!row) throw new DataOwnershipError(404);
      updatedId = row.id;
    } catch (error) {
      if (storedKey) await cleanupPhoto(scope.userId, storedKey);
      throw error;
    }
    if (existing.imageKey && existing.imageKey !== storedKey && (storedKey || clearExistingPhoto)) {
      await cleanupPhoto(scope.userId, existing.imageKey);
    }
    res.json(presentInspiration(await findOwned(req, updatedId)));
  }));
  router.delete("/inspirations/:id", handle(async (req, res) => {
    const scope = dataOwnership(req, connection);
    const id = requireId(req);
    const [existing] = await connection.select({ imageKey: inspirations.imageKey }).from(inspirations)
      .where(and(scope.inspirationFilter, eq(inspirations.id, id))).limit(1);
    if (!existing) throw new DataOwnershipError(404);
    const [row] = await connection.delete(inspirations)
      .where(and(scope.inspirationFilter, eq(inspirations.id, id))).returning({ id: inspirations.id });
    if (!row) throw new DataOwnershipError(404);
    if (existing.imageKey) await cleanupPhoto(scope.userId, existing.imageKey);
    res.status(204).end();
  }));
  return router;
}
