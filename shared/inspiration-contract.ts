export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export const INSPIRATION_STATUSES = ["Want to Make", "In Progress", "Completed"] as const;
export type InspirationStatus = typeof INSPIRATION_STATUSES[number];
export interface CategoryOption { id: string; name: string }
export interface InspirationInput {
  title: string;
  categoryId: string;
  patternUrl?: string | null;
  difficulty?: Difficulty | null;
  notes?: string | null;
  imageUrl?: string | null;
}
export interface InspirationRecord {
  id: string;
  title: string;
  status: InspirationStatus;
  categoryId: string;
  categoryName: string;
  difficulty: Difficulty | null;
  patternUrl: string | null;
  imageUrl: string | null;
  photoUrl: string | null;
  notes: string | null;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}
