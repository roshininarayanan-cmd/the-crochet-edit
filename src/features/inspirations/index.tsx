import { useEffect, useRef, useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, Redirect, Route, Switch, useLocation, useParams } from "wouter";
import { useUser } from "@clerk/react";
import {
  createInspiration,
  deleteInspiration,
  getCategories,
  getInspiration,
  INSPIRATION_STATUSES,
  listFavorites,
  LibraryApiError,
  listInspirations,
  starInspiration,
  updateInspirationStatus,
  updateInspiration,
  unstarInspiration,
  type CategoryOption,
  type InspirationInput,
  type InspirationRecord,
  type InspirationStatus,
} from "../../lib/inspirations-api";
import { filterAndSortInspirations, type InspirationSort } from "./gallery-utils";
import "./inspirations.css";

const difficulties = ["Beginner", "Intermediate", "Advanced"] as const;
const maxPhotoBytes = 5 * 1024 * 1024;
const supportedPhotoTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const supportedPhotoExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
type InspirationFormField = "title" | "categoryId" | "patternUrl" | "imageUrl";
type InspirationFormErrors = Partial<Record<InspirationFormField, string>>;
const formFieldIds: Record<InspirationFormField, string> = {
  title: "inspiration-title",
  categoryId: "inspiration-category",
  patternUrl: "inspiration-pattern",
  imageUrl: "inspiration-image",
};

function validateWebUrl(value: string, label: "pattern" | "image"): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return null;
  } catch {
    // Report malformed and unsupported URLs with the same helpful field message.
  }
  return `Please enter a valid ${label} URL beginning with http:// or https://.`;
}

function validateInspirationForm(
  title: string,
  categoryId: string,
  patternUrl: string,
  imageUrl: string,
  categories: CategoryOption[],
): InspirationFormErrors {
  const errors: InspirationFormErrors = {};
  if (!title.trim()) errors.title = "Please add a title for this inspiration.";
  if (!categoryId || !categories.some((category) => category.id === categoryId)) {
    errors.categoryId = "Please choose a category from the list.";
  }
  const patternError = validateWebUrl(patternUrl, "pattern");
  const imageError = validateWebUrl(imageUrl, "image");
  if (patternError) errors.patternUrl = patternError;
  if (imageError) errors.imageUrl = imageError;
  return errors;
}

function fieldForServerError(message: string): InspirationFormField | null {
  const normalized = message.toLowerCase();
  if (normalized.includes("title is required")) return "title";
  if (normalized.includes("choose a category")) return "categoryId";
  if (normalized.includes("pattern url")) return "patternUrl";
  if (normalized.includes("image url")) return "imageUrl";
  return null;
}

const categoryIcons: Record<string, string> = {
  Plushies: "/category-plushies.svg",
  Clothing: "/category-clothing.svg",
  Bags: "/category-bag.svg",
  Accessories: "/category-accessories.svg",
  "Home Decor": "/category-home-decor.svg",
  Gifts: "/category-gifts.svg",
};
const categoryChipClasses: Record<string, string> = {
  Plushies: "plushies",
  Clothing: "clothing",
  Bags: "bags",
  Accessories: "accessories",
  "Home Decor": "home-decor",
  Gifts: "gifts",
};

function AccountGate({ Page }: { Page: ComponentType }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <main className="inspiration-area inspiration-account-loading" aria-label="Loading account" />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <Page />;
}

function PageTop({ children }: { children: ReactNode }) {
  return (
    <div className="inspiration-topline">
      <Link href="/welcome"><span className="in-back-arrow" aria-hidden="true">←</span> Your little corner</Link>
      <span>{children}</span>
    </div>
  );
}

function BrokenImageMark({ category }: { category: string }) {
  const icon = categoryIcons[category] ?? categoryIcons.Accessories;
  return (
    <div className="inspiration-placeholder" aria-label={`${category} crochet idea without a photo`}>
      <img
        className="inspiration-placeholder-icon"
        src={icon}
        alt=""
        aria-hidden="true"
        data-category={category.toLowerCase().replace(/\s+/g, "-")}
      />
    </div>
  );
}

function CategoryChip({ name }: { name: string }) {
  const colorClass = categoryChipClasses[name] ?? "other";
  return <span className={`inspiration-chip category-chip category-${colorClass}`}>{name}</span>;
}

function ProjectStatusBadge({ status }: { status: InspirationStatus }) {
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");
  return <span className={`inspiration-status-badge status-${statusClass}`}>{status}</span>;
}

function InspirationImage({
  src,
  title,
  category,
  detail = false,
  preserveAspectRatio = false,
}: {
  src: string | null;
  title: string;
  category: string;
  detail?: boolean;
  preserveAspectRatio?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <BrokenImageMark category={category} />;
  return (
    <img
      className={`${detail ? "" : "inspiration-image"}${preserveAspectRatio ? " inspiration-image-preserve" : ""}`}
      src={src}
      alt={title}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="inspiration-state">
      <div className="inspiration-state-mark" aria-hidden="true">01</div>
      <h2>A little room for an idea.</h2>
      <p>Your collection is waiting for the first pattern you can’t stop thinking about. Save a project for yourself, or a gift for someone dear.</p>
      <button type="button" className="inspiration-button" onClick={onAdd}>Add your first idea <span aria-hidden="true">↗</span></button>
    </section>
  );
}

function RetryState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="inspiration-state" role="alert">
      <div className="inspiration-state-mark" aria-hidden="true">…</div>
      <h2>We couldn’t open your collection.</h2>
      <p className="inspiration-error">{message}</p>
      <button type="button" className="inspiration-button secondary" onClick={onRetry}>Try again</button>
    </section>
  );
}

function EmptyFavoritesState() {
  return (
    <section className="inspiration-state">
      <div className="inspiration-state-mark" aria-hidden="true">☆</div>
      <h2>Your favorites are waiting.</h2>
      <p>Tap the star on any idea in your collection and it’ll be kept here for you.</p>
      <Link href="/inspirations" className="inspiration-button">Browse your collection <span aria-hidden="true">↗</span></Link>
    </section>
  );
}

function GalleryPage({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<InspirationRecord[] | null>(null);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starError, setStarError] = useState<string | null>(null);
  const [pendingStarIds, setPendingStarIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<InspirationSort>("newest");
  const [attempt, setAttempt] = useState(0);
  const starRequestLock = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    setItems(null);
    setAvailableCategories(null);
    setError(null);
    setStarError(null);
    const categoriesRequest: Promise<CategoryOption[]> = favoritesOnly ? Promise.resolve([]) : getCategories();
    Promise.all([favoritesOnly ? listFavorites() : listInspirations(), categoriesRequest]).then(([records, categories]) => {
      if (active) {
        setItems(records);
        setAvailableCategories(categories);
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Please try again in a moment.");
    });
    return () => { active = false; };
  }, [attempt, favoritesOnly]);

  async function toggleStar(item: InspirationRecord) {
    if (starRequestLock.current.has(item.id)) return;
    starRequestLock.current.add(item.id);
    setPendingStarIds((current) => new Set(current).add(item.id));
    setStarError(null);
    try {
      if (item.isStarred) await unstarInspiration(item.id);
      else await starInspiration(item.id);
      setItems((current) => {
        if (!current) return current;
        if (favoritesOnly && item.isStarred) return current.filter((entry) => entry.id !== item.id);
        return current.map((entry) => entry.id === item.id ? { ...entry, isStarred: !item.isStarred } : entry);
      });
    } catch (reason) {
      setStarError(reason instanceof Error ? reason.message : "We couldn’t update this favorite. Please try again.");
    } finally {
      starRequestLock.current.delete(item.id);
      setPendingStarIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  const filtersAreActive = Boolean(
    searchText.trim() || categoryFilter !== "all" || difficultyFilter !== "all" || sortOrder !== "newest",
  );
  const visibleItems = favoritesOnly || !items
    ? items ?? []
    : filterAndSortInspirations(items, {
      search: searchText,
      categoryId: categoryFilter,
      difficulty: difficultyFilter,
      sort: sortOrder,
    });

  function clearFilters() {
    setSearchText("");
    setCategoryFilter("all");
    setDifficultyFilter("all");
    setSortOrder("newest");
  }

  return (
    <main className="inspiration-area inspiration-library-page">
        <div className="inspiration-inner">
          <PageTop>THE CROCHET EDIT · {favoritesOnly ? "YOUR FAVORITES" : "YOUR COLLECTION"}</PageTop>
          <div className="inspiration-heading-row">
            <div className="inspiration-library-heading">
              <h1 className="inspiration-title">{favoritesOnly ? "Your favorites" : "Your collection"}</h1>
              <div className="inspiration-count" aria-live="polite">
                {items
                  ? `${visibleItems.length} ${visibleItems.length === 1 ? "idea" : "ideas"} ${filtersAreActive && !favoritesOnly ? "found" : "gathered"}`
                  : "Your saved ideas"}
              </div>
            </div>
            {!favoritesOnly && (
              <button type="button" className="inspiration-button small" onClick={() => setLocation("/inspirations/new")}>
                <span aria-hidden="true">＋</span> Add an idea
              </button>
            )}
          </div>

          {!favoritesOnly && items && availableCategories && (
            <section className="inspiration-gallery-controls" aria-label="Search, filter, and sort your inspirations">
              <label className="inspiration-filter-control inspiration-gallery-search">
                <span>Search by title</span>
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Try “tote bag”"
                  aria-label="Search inspirations by title"
                />
              </label>
              <label className="inspiration-filter-control">
                <span>Category</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
                  <option value="all">All Categories</option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="inspiration-filter-control">
                <span>Difficulty</span>
                <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} aria-label="Filter by difficulty">
                  <option value="all">All Difficulties</option>
                  {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                </select>
              </label>
              <label className="inspiration-filter-control">
                <span>Sort by</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as InspirationSort)} aria-label="Sort inspirations">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title-asc">Title A–Z</option>
                  <option value="title-desc">Title Z–A</option>
                </select>
              </label>
              <button
                type="button"
                className="inspiration-button secondary small inspiration-filter-clear"
                onClick={clearFilters}
                disabled={!filtersAreActive}
              >
                Clear Filters
              </button>
            </section>
          )}

          {starError && <div className="inspiration-form-error inspiration-favorite-error" role="alert">{starError}</div>}
          {error && <RetryState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
          {!error && !items && (
            <div className="inspiration-gallery" aria-label={favoritesOnly ? "Loading your favorites" : "Loading your collection"}>
              <span className="inspiration-skeleton" /><span className="inspiration-skeleton" />
              <span className="inspiration-skeleton" /><span className="inspiration-skeleton" />
            </div>
          )}
          {!error && items?.length === 0 && (
            favoritesOnly
              ? <EmptyFavoritesState />
              : filtersAreActive
                ? (
                  <section className="inspiration-state" role="status">
                    <div className="inspiration-state-mark" aria-hidden="true">⌕</div>
                    <h2>No crochet inspirations found.</h2>
                    <p>Try a different title or clear your filters to see your full collection.</p>
                    <button type="button" className="inspiration-button secondary" onClick={clearFilters}>Clear Filters</button>
                  </section>
                )
                : <EmptyState onAdd={() => setLocation("/inspirations/new")} />
          )}
          {!error && !!visibleItems.length && (
            <section className="inspiration-gallery" aria-label={favoritesOnly ? "Your favorite crochet inspiration" : "Your crochet inspiration"}>
              {visibleItems.map((item) => (
                <article key={item.id} className="inspiration-card">
                  <Link href={`/inspirations/${encodeURIComponent(item.id)}`} className="inspiration-card-link" aria-label={`View ${item.title}`}>
                    <div className="inspiration-image-wrap">
                      <InspirationImage
                        src={item.photoUrl ?? item.imageUrl}
                        title={item.title}
                        category={item.categoryName}
                        preserveAspectRatio={Boolean(item.photoUrl)}
                      />
                    </div>
                    <div className="inspiration-card-body">
                      <h2 className="inspiration-card-title">{item.title}</h2>
                      <div className="inspiration-card-meta">
                        <CategoryChip name={item.categoryName} />
                        {item.difficulty && <span className="inspiration-chip difficulty">{item.difficulty}</span>}
                        <ProjectStatusBadge status={item.status} />
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className={`inspiration-star-button${item.isStarred ? " is-starred" : ""}`}
                    aria-label={item.isStarred ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                    aria-pressed={item.isStarred}
                    disabled={pendingStarIds.has(item.id)}
                    onClick={() => void toggleStar(item)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m12 2.75 2.86 5.8 6.4.93-4.63 4.52 1.09 6.38L12 17.37l-5.72 3.01 1.09-6.38L2.74 9.48l6.4-.93L12 2.75Z" />
                    </svg>
                  </button>
                </article>
              ))}
            </section>
          )}
          {!error && !!items?.length && !favoritesOnly && !visibleItems.length && (
            <section className="inspiration-state" role="status">
              <div className="inspiration-state-mark" aria-hidden="true">⌕</div>
              <h2>No crochet inspirations found.</h2>
              <p>Try a different title or clear your filters to see your full collection.</p>
              <button type="button" className="inspiration-button secondary" onClick={clearFilters}>Clear Filters</button>
            </section>
          )}
        </div>
    </main>
  );
}

function InspirationForm({ editing }: { editing: boolean }) {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [record, setRecord] = useState<InspirationRecord | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [patternUrl, setPatternUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSelectionInvalid, setPhotoSelectionInvalid] = useState(false);
  const [removeUploadedPhoto, setRemoveUploadedPhoto] = useState(false);
  const [difficulty, setDifficulty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<InspirationFormErrors>({});
  const saveLock = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const preview = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);

  useEffect(() => {
    let active = true;
    setLoadingError(null);
    setCategories(null);
    setRecord(null);
    const categoriesRequest = getCategories();
    const recordRequest = editing && id ? getInspiration(id) : Promise.resolve(null);
    Promise.all([categoriesRequest, recordRequest]).then(([options, item]) => {
      if (!active) return;
      setCategories(options);
      setRecord(item);
      if (item) {
        setTitle(item.title);
        setCategoryId(item.categoryId);
        setPatternUrl(item.patternUrl ?? "");
        setImageUrl(item.imageUrl ?? "");
        setPhotoFile(null);
        setPhotoError(null);
        setRemoveUploadedPhoto(false);
        setDifficulty(item.difficulty ?? "");
        setNotes(item.notes ?? "");
      }
    }).catch((reason: unknown) => {
      if (active) setLoadingError(reason instanceof Error ? reason.message : "Please try loading this form again.");
    });
    return () => { active = false; };
  }, [editing, id, loadAttempt]);

  function updateField(field: InspirationFormField, update: (value: string) => void, value: string) {
    update(value);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSaveError(null);
  }

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (file.size > maxPhotoBytes) {
      setPhotoFile(null);
      setPhotoError("Photos must be 5 MB or smaller. Please choose a smaller image.");
      setPhotoSelectionInvalid(true);
      return;
    }
    if (!supportedPhotoTypes.has(file.type.toLowerCase()) && !supportedPhotoExtensions.has(extension)) {
      setPhotoFile(null);
      setPhotoError("Please choose a JPG, PNG, or WebP photo.");
      setPhotoSelectionInvalid(true);
      return;
    }

    setPhotoError(null);
    setPhotoSelectionInvalid(false);
    setPhotoFile(file);
    setRemoveUploadedPhoto(false);
    updateField("imageUrl", setImageUrl, "");
  }

  function handleImageUrlChange(value: string) {
    updateField("imageUrl", setImageUrl, value);
    setPhotoError(null);
    setPhotoSelectionInvalid(false);
    if (value.trim()) {
      setPhotoFile(null);
      setRemoveUploadedPhoto(Boolean(record?.photoUrl));
    } else if (record?.photoUrl) {
      setRemoveUploadedPhoto(false);
    }
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoError(null);
    setPhotoSelectionInvalid(false);
    setRemoveUploadedPhoto(Boolean(record?.photoUrl));
    updateField("imageUrl", setImageUrl, "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current) return;
    if (photoSelectionInvalid) return;
    const errors = validateInspirationForm(title, categoryId, patternUrl, imageUrl, categories ?? []);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const missing: string[] = [];
      if (errors.title) missing.push("add a title");
      if (errors.categoryId) missing.push("choose a category");
      setSaveError(missing.length
        ? `Please ${missing.join(" and ")} before saving.`
        : "Please check the highlighted fields before saving.");
      const firstInvalid = Object.keys(errors)[0] as InspirationFormField;
      document.getElementById(formFieldIds[firstInvalid])?.focus();
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    const input: InspirationInput = {
      title: title.trim(),
      categoryId,
      patternUrl: patternUrl.trim() || null,
      imageUrl: imageUrl.trim() || null,
      difficulty: difficulty ? difficulty as InspirationInput["difficulty"] : null,
      notes: notes.trim() || null,
    };
    try {
      const saved = editing && id
        ? await updateInspiration(id, input, photoFile ?? undefined, removeUploadedPhoto)
        : await createInspiration(input, photoFile ?? undefined);
      setLocation("/inspirations");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "We couldn’t save your idea. Please try again.";
      const field = fieldForServerError(message);
      if (field) {
        setFieldErrors((current) => ({ ...current, [field]: message }));
        setSaveError("Please check the highlighted field and try again.");
        document.getElementById(formFieldIds[field])?.focus();
      } else if (message.toLowerCase().includes("photo")) {
        setPhotoError(message);
        setPhotoSelectionInvalid(false);
        setSaveError(null);
      } else {
        setSaveError(message);
      }
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const photoPreview = photoPreviewUrl
    ?? (removeUploadedPhoto ? null : record?.photoUrl)
    ?? (imageUrl.trim() || null);

  return (
    <main className="inspiration-area">
        <div className="inspiration-inner inspiration-form-shell">
          <PageTop><Link href="/inspirations">YOUR COLLECTION</Link> · {editing ? "EDIT IDEA" : "NEW IDEA"}</PageTop>
          {loadingError ? (
            <RetryState message={loadingError} onRetry={() => setLoadAttempt((n) => n + 1)} />
          ) : !categories || (editing && !record) ? (
            <div className="inspiration-state inspiration-form-load" aria-label="Loading form"><span className="inspiration-skeleton" /></div>
          ) : (
            <>
              <span className="inspiration-chip lavender">{editing ? "A thoughtful little refresh" : "Save something lovely"}</span>
              <h1 className="inspiration-title" style={{ marginTop: 17 }}>{editing ? <>Make it <em>yours.</em></> : <>A new idea,<br /><em>for later.</em></>}</h1>
              <p className="inspiration-intro">Keep the useful details together, so it’s easy to find when you’re ready to make.</p>
              <div className="inspiration-form-card">
                <form className="inspiration-form" onSubmit={handleSubmit} noValidate>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-title">What are you dreaming up?</label>
                    <input id="inspiration-title" name="title" maxLength={300} value={title} onChange={(event) => updateField("title", setTitle, event.target.value)} placeholder="e.g. A little lavender market tote" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "inspiration-title-error" : undefined} className={fieldErrors.title ? "is-invalid" : undefined} />
                    {fieldErrors.title && <p id="inspiration-title-error" className="inspiration-field-error">{fieldErrors.title}</p>}
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-category">Category</label>
                    <select id="inspiration-category" name="categoryId" value={categoryId} onChange={(event) => updateField("categoryId", setCategoryId, event.target.value)} aria-invalid={Boolean(fieldErrors.categoryId)} aria-describedby={fieldErrors.categoryId ? "inspiration-category-error" : undefined} className={fieldErrors.categoryId ? "is-invalid" : undefined}>
                      <option value="" disabled>Choose a category</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    {fieldErrors.categoryId && <p id="inspiration-category-error" className="inspiration-field-error">{fieldErrors.categoryId}</p>}
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-pattern">Original pattern link <span>· optional</span></label>
                    <input id="inspiration-pattern" name="patternUrl" type="url" value={patternUrl} onChange={(event) => updateField("patternUrl", setPatternUrl, event.target.value)} placeholder="https://…" aria-invalid={Boolean(fieldErrors.patternUrl)} aria-describedby={fieldErrors.patternUrl ? "inspiration-pattern-error" : undefined} className={fieldErrors.patternUrl ? "is-invalid" : undefined} />
                    {fieldErrors.patternUrl && <p id="inspiration-pattern-error" className="inspiration-field-error">{fieldErrors.patternUrl}</p>}
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-image">Image link <span>· optional</span></label>
                    <input id="inspiration-image" name="imageUrl" type="url" value={imageUrl} onChange={(event) => handleImageUrlChange(event.target.value)} placeholder="https://…" aria-invalid={Boolean(fieldErrors.imageUrl)} aria-describedby={fieldErrors.imageUrl ? "inspiration-image-error" : undefined} className={fieldErrors.imageUrl ? "is-invalid" : undefined} />
                    {fieldErrors.imageUrl && <p id="inspiration-image-error" className="inspiration-field-error">{fieldErrors.imageUrl}</p>}
                  </div>
                  <div className="inspiration-field">
                    <label>Upload a photo <span>· optional</span></label>
                    <div className="inspiration-photo-actions">
                      <button
                        type="button"
                        className="inspiration-button secondary small"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={saving}
                      >
                        Upload Photo
                      </button>
                      {photoPreview && (
                        <button type="button" className="inspiration-photo-remove" onClick={removePhoto} disabled={saving}>
                          Remove photo
                        </button>
                      )}
                      <span className="inspiration-photo-filename">
                        {photoFile?.name ?? (record?.photoUrl && !removeUploadedPhoto ? "Saved photo" : "JPG, PNG, or WebP · up to 5 MB")}
                      </span>
                    </div>
                    <input
                      ref={photoInputRef}
                      className="inspiration-photo-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelection}
                      aria-label="Choose a JPG, PNG, or WebP photo"
                    />
                    {photoError && <p className="inspiration-field-error" role="alert">{photoError}</p>}
                    {photoSelectionInvalid && (
                      <button
                        type="button"
                        className="inspiration-photo-remove"
                        onClick={() => {
                          setPhotoSelectionInvalid(false);
                          setPhotoError(null);
                        }}
                      >
                        {imageUrl.trim() ? "Keep the image link" : record?.photoUrl ? "Keep the saved photo" : "Continue without a photo"}
                      </button>
                    )}
                    {photoPreview && (
                      <div className="inspiration-upload-preview">
                        <InspirationImage
                          src={photoPreview}
                          title="Selected inspiration photo preview"
                          category={record?.categoryName ?? categories.find((category) => category.id === categoryId)?.name ?? "Accessories"}
                          preserveAspectRatio={Boolean(photoFile || record?.photoUrl)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-difficulty">Difficulty <span>· optional</span></label>
                    <select id="inspiration-difficulty" name="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                      <option value="">Not sure yet</option>
                      {difficulties.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-notes">Notes <span>· optional</span></label>
                    <textarea id="inspiration-notes" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Who might love this? Any yarn or color ideas to remember?" />
                  </div>
                  {saveError && <div className="inspiration-form-error" role="alert">{saveError}</div>}
                  {categories.length === 0 && <div className="inspiration-form-error" role="alert">There are no categories available yet. Please try again after your collection finishes setting up.</div>}
                  <div className="inspiration-form-actions">
                    <button className="inspiration-button" type="submit" disabled={saving || categories.length === 0}>
                      {saving ? "Saving…" : editing ? "Save changes" : "Save this idea"}
                    </button>
                    <Link href={editing && id ? `/inspirations/${encodeURIComponent(id)}` : "/inspirations"} className="inspiration-button secondary">Cancel</Link>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
    </main>
  );
}

function DetailPage() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const [record, setRecord] = useState<InspirationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const deleteLock = useRef(false);
  const statusLock = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    setRecord(null);
    setError(null);
    setNotFound(false);
    if (!id) {
      setError("This idea doesn’t have a valid collection address.");
      return () => { active = false; };
    }
    getInspiration(id).then((item) => {
      if (active) setRecord(item);
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof LibraryApiError && reason.status === 404) setNotFound(true);
      else setError(reason instanceof Error ? reason.message : "We couldn’t open that idea.");
    });
    return () => { active = false; };
  }, [id, attempt]);

  useEffect(() => {
    if (!confirmDelete) return;
    cancelRef.current?.focus();
    function manageDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleteLock.current) {
        setConfirmDelete(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", manageDialogKeys);
    return () => window.removeEventListener("keydown", manageDialogKeys);
  }, [confirmDelete]);

  async function confirmRemove() {
    if (!id || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInspiration(id);
      setLocation("/inspirations");
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "We couldn’t delete this idea. Please try again.");
      setDeleting(false);
      deleteLock.current = false;
    }
  }

  async function saveStatus(event: ChangeEvent<HTMLSelectElement>) {
    if (!id || statusLock.current || !record) return;
    const nextStatus = event.currentTarget.value as InspirationStatus;
    if (!INSPIRATION_STATUSES.includes(nextStatus)) return;
    statusLock.current = true;
    setStatusSaving(true);
    setStatusError(null);
    try {
      setRecord(await updateInspirationStatus(id, nextStatus));
    } catch (reason) {
      setStatusError(reason instanceof Error ? reason.message : "We couldn’t update this project status. Please try again.");
    } finally {
      statusLock.current = false;
      setStatusSaving(false);
    }
  }

  return (
    <main className="inspiration-area">
        <div className="inspiration-inner">
          <PageTop><Link href="/inspirations">YOUR COLLECTION</Link> · IDEA</PageTop>
          {notFound ? (
            <section className="inspiration-state" role="alert">
              <div className="inspiration-state-mark" aria-hidden="true">↶</div>
              <h2>That idea isn’t here.</h2>
              <p>This idea may have been removed, or it may not belong to this collection.</p>
              <Link href="/inspirations" className="inspiration-button">Back to your collection</Link>
            </section>
          ) : error ? (
            <RetryState message={error} onRetry={() => setAttempt((n) => n + 1)} />
          ) : !record ? (
            <div className="inspiration-detail-layout" aria-label="Loading inspiration">
              <span className="inspiration-skeleton" /><span className="inspiration-skeleton" />
            </div>
          ) : (
            <div className="inspiration-detail-layout">
               <div className="inspiration-detail-visual">
                 <InspirationImage
                   src={record.photoUrl ?? record.imageUrl}
                   title={record.title}
                   category={record.categoryName}
                   detail
                   preserveAspectRatio={Boolean(record.photoUrl)}
                 />
               </div>
              <article className="inspiration-detail-copy">
                <div className="inspiration-detail-categories">
                  <CategoryChip name={record.categoryName} />
                  {record.difficulty && <span className="inspiration-chip difficulty">{record.difficulty}</span>}
                  <ProjectStatusBadge status={record.status} />
                </div>
                <h1>{record.title}</h1>
                <div className="inspiration-project-status-control">
                  <label htmlFor="inspiration-project-status">Project status</label>
                  <select
                    id="inspiration-project-status"
                    value={record.status}
                    onChange={(event) => void saveStatus(event)}
                    disabled={statusSaving}
                    aria-describedby={statusError ? "inspiration-project-status-error" : undefined}
                    aria-invalid={Boolean(statusError)}
                  >
                    {INSPIRATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  {statusSaving && <span className="inspiration-status-saving" role="status">Saving status…</span>}
                  {statusError && <p id="inspiration-project-status-error" className="inspiration-field-error" role="alert">{statusError}</p>}
                </div>
                {record.patternUrl && (
                  <a className="inspiration-pattern" href={record.patternUrl} target="_blank" rel="noopener noreferrer">
                    Open original pattern <span aria-hidden="true">↗</span>
                  </a>
                )}
                <h2>Notes to remember</h2>
                <div className="inspiration-notes">{record.notes?.trim() || "No notes saved for this one yet."}</div>
                <div className="inspiration-record-date">ADDED {new Date(record.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
                <div className="inspiration-detail-actions">
                  <Link href={`/inspirations/${encodeURIComponent(record.id)}/edit`} className="inspiration-button">Edit idea</Link>
                  <button type="button" className="inspiration-button secondary" onClick={() => { setDeleteError(null); setConfirmDelete(true); }}>Delete</button>
                </div>
              </article>
            </div>
          )}
        </div>
      {confirmDelete && record && (
        <div className="inspiration-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deleting) setConfirmDelete(false);
        }}>
          <section ref={dialogRef} className="inspiration-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <h2 id="delete-title">Are you sure?</h2>
            <p id="delete-description">“{record.title}” will be removed from your collection. This can’t be undone.</p>
            {deleteError && <div className="inspiration-form-error" role="alert">{deleteError}</div>}
            <div className="inspiration-dialog-actions" style={{ marginTop: 19 }}>
              <button ref={cancelRef} type="button" className="inspiration-button secondary small" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep idea</button>
              <button type="button" className="inspiration-button danger small" disabled={deleting} onClick={() => void confirmRemove()}>{deleting ? "Deleting…" : "Delete idea"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export function InspirationRoutes() {
  return (
    <Switch>
      <Route path="/inspirations" component={() => <AccountGate Page={GalleryPage} />} />
      <Route path="/favorites" component={() => <AccountGate Page={() => <GalleryPage favoritesOnly />} />} />
      <Route path="/inspirations/new" component={() => <AccountGate Page={() => <InspirationForm editing={false} />} />} />
      <Route path="/inspirations/:id/edit" component={() => <AccountGate Page={() => <InspirationForm editing />} />} />
      <Route path="/inspirations/:id" component={() => <AccountGate Page={DetailPage} />} />
    </Switch>
  );
}
