import type { CategoryOption, InspirationInput, InspirationRecord } from "../../shared/inspiration-contract";
export type { CategoryOption, InspirationInput, InspirationRecord } from "../../shared/inspiration-contract";

export class LibraryApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new LibraryApiError(body.error ?? "Something went wrong. Please try again.", response.status);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function getCategories(): Promise<CategoryOption[]> {
  // Avoid racing the first account synchronization after signup.
  await request("/api/auth/sync", { method: "POST" });
  return request("/api/categories");
}
export const listInspirations = () => request<InspirationRecord[]>("/api/inspirations");
export const listFavorites = () => request<InspirationRecord[]>("/api/favorites");
export const getInspiration = (id: string) =>
  request<InspirationRecord>(`/api/inspirations/${encodeURIComponent(id)}`);
export const starInspiration = (id: string) =>
  request<void>(`/api/inspirations/${encodeURIComponent(id)}/star`, { method: "POST" });
export const unstarInspiration = (id: string) =>
  request<void>(`/api/inspirations/${encodeURIComponent(id)}/star`, { method: "DELETE" });
export const createInspiration = (input: InspirationInput) =>
  request<InspirationRecord>("/api/inspirations", { method: "POST", body: JSON.stringify(input) });
export const updateInspiration = (id: string, input: InspirationInput) =>
  request<InspirationRecord>(`/api/inspirations/${encodeURIComponent(id)}`, {
    method: "PUT", body: JSON.stringify(input),
  });
export const deleteInspiration = (id: string) =>
  request<void>(`/api/inspirations/${encodeURIComponent(id)}`, { method: "DELETE" });
