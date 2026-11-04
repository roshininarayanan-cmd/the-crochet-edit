import { useEffect, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, Redirect, Route, Switch, useLocation, useParams } from "wouter";
import { useUser } from "@clerk/react";
import {
  createInspiration,
  deleteInspiration,
  getCategories,
  getInspiration,
  LibraryApiError,
  listInspirations,
  updateInspiration,
  type CategoryOption,
  type InspirationInput,
  type InspirationRecord,
} from "../../lib/inspirations-api";
import "./inspirations.css";

const difficulties = ["Beginner", "Intermediate", "Advanced"] as const;

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

function BrokenImageMark() {
  return (
    <div className="inspiration-placeholder" aria-label="No image available">
      <span className="inspiration-placeholder-mark" aria-hidden="true">the edit</span>
    </div>
  );
}

function InspirationImage({ src, title, detail = false }: { src: string | null; title: string; detail?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <BrokenImageMark />;
  return (
    <img
      className={detail ? "" : "inspiration-image"}
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

function GalleryPage() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<InspirationRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setItems(null);
    setError(null);
    listInspirations().then((records) => {
      if (active) setItems(records);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Please try again in a moment.");
    });
    return () => { active = false; };
  }, [attempt]);

  return (
    <main className="inspiration-area inspiration-library-page">
        <div className="inspiration-inner">
          <PageTop>THE CROCHET EDIT · YOUR COLLECTION</PageTop>
          <div className="inspiration-heading-row">
            <div className="inspiration-library-heading">
              <h1 className="inspiration-title">Your collection</h1>
              <div className="inspiration-count">{items ? `${items.length} ${items.length === 1 ? "idea" : "ideas"} gathered` : "Your saved ideas"}</div>
            </div>
            <button type="button" className="inspiration-button small" onClick={() => setLocation("/inspirations/new")}>
              <span aria-hidden="true">＋</span> Add an idea
            </button>
          </div>

          {error && <RetryState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
          {!error && !items && (
            <div className="inspiration-gallery" aria-label="Loading your collection">
              <span className="inspiration-skeleton" /><span className="inspiration-skeleton" />
              <span className="inspiration-skeleton" /><span className="inspiration-skeleton" />
            </div>
          )}
          {!error && items?.length === 0 && <EmptyState onAdd={() => setLocation("/inspirations/new")} />}
          {!error && !!items?.length && (
            <section className="inspiration-gallery" aria-label="Your crochet inspiration">
              {items.map((item) => (
                <article key={item.id} className="inspiration-card">
                  <Link href={`/inspirations/${encodeURIComponent(item.id)}`} className="inspiration-card-link" aria-label={`View ${item.title}`}>
                    <div className="inspiration-image-wrap">
                      <InspirationImage src={item.imageUrl} title={item.title} />
                    </div>
                    <div className="inspiration-card-body">
                      <h2 className="inspiration-card-title">{item.title}</h2>
                      <div className="inspiration-card-meta">
                        <span className="inspiration-chip lavender">{item.categoryName}</span>
                        {item.difficulty && <span className="inspiration-chip difficulty">{item.difficulty}</span>}
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
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
  const [difficulty, setDifficulty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveLock = useRef(false);

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
        setDifficulty(item.difficulty ?? "");
        setNotes(item.notes ?? "");
      } else if (options.length) {
        setCategoryId(options[0].id);
      }
    }).catch((reason: unknown) => {
      if (active) setLoadingError(reason instanceof Error ? reason.message : "Please try loading this form again.");
    });
    return () => { active = false; };
  }, [editing, id, loadAttempt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current) return;
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
        ? await updateInspiration(id, input)
        : await createInspiration(input);
      setLocation(`/inspirations/${encodeURIComponent(saved.id)}`);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "We couldn’t save your idea. Please try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

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
                <form className="inspiration-form" onSubmit={handleSubmit}>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-title">What are you dreaming up?</label>
                    <input id="inspiration-title" name="title" required maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. A little lavender market tote" />
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-category">Category</label>
                    <select id="inspiration-category" name="categoryId" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                      <option value="" disabled>Choose a category</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-pattern">Original pattern link <span>· optional</span></label>
                    <input id="inspiration-pattern" name="patternUrl" type="url" value={patternUrl} onChange={(event) => setPatternUrl(event.target.value)} placeholder="https://…" />
                  </div>
                  <div className="inspiration-field">
                    <label htmlFor="inspiration-image">Image link <span>· optional</span></label>
                    <input id="inspiration-image" name="imageUrl" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" />
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
  const deleteLock = useRef(false);
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
              <div className="inspiration-detail-visual"><InspirationImage src={record.imageUrl} title={record.title} detail /></div>
              <article className="inspiration-detail-copy">
                <div className="inspiration-detail-categories">
                  <span className="inspiration-chip lavender">{record.categoryName}</span>
                  {record.difficulty && <span className="inspiration-chip difficulty">{record.difficulty}</span>}
                </div>
                <h1>{record.title}</h1>
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
      <Route path="/inspirations/new" component={() => <AccountGate Page={() => <InspirationForm editing={false} />} />} />
      <Route path="/inspirations/:id/edit" component={() => <AccountGate Page={() => <InspirationForm editing />} />} />
      <Route path="/inspirations/:id" component={() => <AccountGate Page={DetailPage} />} />
    </Switch>
  );
}
