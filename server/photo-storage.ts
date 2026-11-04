import { createHash, randomUUID } from "node:crypto";
import { Client } from "@replit/object-storage";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type PhotoFormat = {
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export class PhotoStorageError extends Error {
  constructor() {
    super("Photo storage is unavailable. Please make sure an App Storage bucket is configured, then try again.");
  }
}

export class InvalidPhotoError extends Error {
  constructor() {
    super("Please choose a valid JPG, PNG, or WebP image.");
  }
}

const storage = new Client();
const managedPhotoKey = /^users\/([a-f0-9]{64})\/inspirations\/([0-9a-f-]{36})\.(jpg|png|webp)$/i;

function ownerNamespace(userId: string) {
  return createHash("sha256").update(userId).digest("hex");
}

export function getPhotoFormat(bytes: Buffer): PhotoFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 8
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png", contentType: "image/png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

export function isOwnedPhotoKey(userId: string, key: string) {
  const match = managedPhotoKey.exec(key);
  return Boolean(match && match[1].toLowerCase() === ownerNamespace(userId));
}

export async function storeUserPhoto(userId: string, bytes: Buffer) {
  const format = getPhotoFormat(bytes);
  if (!format) throw new InvalidPhotoError();

  const key = `users/${ownerNamespace(userId)}/inspirations/${randomUUID()}.${format.extension}`;
  try {
    const result = await storage.uploadFromBytes(key, bytes, { compress: false });
    if (!result.ok) throw new PhotoStorageError();
  } catch {
    throw new PhotoStorageError();
  }
  return { key, contentType: format.contentType };
}

export async function readUserPhoto(userId: string, key: string) {
  if (!isOwnedPhotoKey(userId, key)) throw new PhotoStorageError();

  try {
    const result = await storage.downloadAsBytes(key);
    if (!result.ok) throw new PhotoStorageError();

    const bytes = result.value[0];
    const format = getPhotoFormat(bytes);
    if (!format) throw new PhotoStorageError();
    return { bytes, contentType: format.contentType };
  } catch {
    throw new PhotoStorageError();
  }
}

export async function deleteUserPhoto(userId: string, key: string) {
  // Never delete a key that was not generated for this account.
  if (!isOwnedPhotoKey(userId, key)) return;

  try {
    const result = await storage.delete(key, { ignoreNotFound: true });
    if (!result.ok) throw new PhotoStorageError();
  } catch {
    throw new PhotoStorageError();
  }
}
