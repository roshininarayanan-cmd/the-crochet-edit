export interface DashboardCategoryCount {
  categoryId: string;
  categoryName: string;
  inspirationCount: number;
}

export interface DashboardSummary {
  totalInspirations: number;
  starredInspirations: number;
  categoriesUsed: number;
  categoryCounts: DashboardCategoryCount[];
}
