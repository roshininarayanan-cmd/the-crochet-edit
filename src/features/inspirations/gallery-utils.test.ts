import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortInspirations, type GalleryFilters, type GallerySearchItem } from "./gallery-utils";

interface TestInspiration extends GallerySearchItem {
  id: string;
}

const ideas: TestInspiration[] = [
  { id: "plush", title: "Sleepy Bunny", categoryId: "plushies", difficulty: "Beginner", createdAt: "2024-03-01T12:00:00.000Z" },
  { id: "cardigan", title: "Cloud Cardigan", categoryId: "clothing", difficulty: "Advanced", createdAt: "2025-01-01T12:00:00.000Z" },
  { id: "gift-bag", title: "Gift Bag", categoryId: "bags", difficulty: "Beginner", createdAt: "2023-09-01T12:00:00.000Z" },
  { id: "tote", title: "Summer Tote", categoryId: "bags", difficulty: "Intermediate", createdAt: "2025-06-01T12:00:00.000Z" },
  { id: "custom", title: "Petal Shawl", categoryId: "custom-category", difficulty: "Beginner", createdAt: "2024-08-01T12:00:00.000Z" },
];

const defaultFilters: GalleryFilters = {
  search: "",
  categoryId: "all",
  difficulty: "all",
  sort: "newest",
};

test("search matches project titles case-insensitively and ignores surrounding spaces", () => {
  const results = filterAndSortInspirations(ideas, { ...defaultFilters, search: "  sUMMER  " });
  assert.deepEqual(results.map((idea) => idea.id), ["tote"]);
});

test("category filters include custom category IDs", () => {
  const results = filterAndSortInspirations(ideas, { ...defaultFilters, categoryId: "custom-category" });
  assert.deepEqual(results.map((idea) => idea.id), ["custom"]);
});

test("difficulty and combined category/difficulty filters work together", () => {
  const beginner = filterAndSortInspirations(ideas, { ...defaultFilters, difficulty: "Beginner" });
  assert.deepEqual(beginner.map((idea) => idea.id), ["custom", "plush", "gift-bag"]);

  const beginnerBags = filterAndSortInspirations(ideas, {
    ...defaultFilters, categoryId: "bags", difficulty: "Beginner",
  });
  assert.deepEqual(beginnerBags.map((idea) => idea.id), ["gift-bag"]);
});

test("sorting supports newest, oldest, and case-insensitive title order", () => {
  assert.deepEqual(filterAndSortInspirations(ideas, defaultFilters).map((idea) => idea.id),
    ["tote", "cardigan", "custom", "plush", "gift-bag"]);
  assert.deepEqual(filterAndSortInspirations(ideas, { ...defaultFilters, sort: "oldest" }).map((idea) => idea.id),
    ["gift-bag", "plush", "custom", "cardigan", "tote"]);
  assert.deepEqual(filterAndSortInspirations(ideas, { ...defaultFilters, sort: "title-asc" }).map((idea) => idea.title),
    ["Cloud Cardigan", "Gift Bag", "Petal Shawl", "Sleepy Bunny", "Summer Tote"]);
  assert.deepEqual(filterAndSortInspirations(ideas, { ...defaultFilters, sort: "title-desc" }).map((idea) => idea.title),
    ["Summer Tote", "Sleepy Bunny", "Petal Shawl", "Gift Bag", "Cloud Cardigan"]);
});

test("default filters restore the complete gallery and unmatched searches return no results", () => {
  assert.equal(filterAndSortInspirations(ideas, defaultFilters).length, ideas.length);
  assert.deepEqual(filterAndSortInspirations(ideas, { ...defaultFilters, search: "no such project" }), []);
});
