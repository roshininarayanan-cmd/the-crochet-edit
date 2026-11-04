export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
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
  categoryId: string;
  categoryName: string;
  difficulty: Difficulty | null;
  patternUrl: string | null;
  imageUrl: string | null;
  notes: string | null;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}
