export type InspirationSort = "newest" | "oldest" | "title-asc" | "title-desc";

export interface GallerySearchItem {
  title: string;
  categoryId: string;
  difficulty: string | null;
  createdAt: string;
}

export interface GalleryFilters {
  search: string;
  categoryId: string;
  difficulty: string;
  sort: InspirationSort;
}

export function filterAndSortInspirations<T extends GallerySearchItem>(
  items: readonly T[],
  filters: GalleryFilters,
): T[] {
  const query = filters.search.trim().toLowerCase();
  const matches = items.filter((item) =>
    (!query || item.title.toLowerCase().includes(query))
    && (filters.categoryId === "all" || item.categoryId === filters.categoryId)
    && (filters.difficulty === "all" || item.difficulty === filters.difficulty),
  );

  return matches.sort((a, b) => {
    switch (filters.sort) {
      case "oldest":
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      case "title-asc":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "title-desc":
        return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
      case "newest":
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });
}
