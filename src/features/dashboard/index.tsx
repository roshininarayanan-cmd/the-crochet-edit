import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardSummary, getSurpriseInspiration } from "../../lib/inspirations-api";
import type { DashboardSummary, InspirationRecord } from "../../lib/inspirations-api";
import "./dashboard.css";

const categoryColors = ["#788a70", "#b7a2c8", "#9eae91", "#c8b7d5", "#647960", "#d1c1dc"];

function MetricIcon({ type }: { type: "collection" | "star" | "category" }) {
  if (type === "star") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.2Z" />
      </svg>
    );
  }
  if (type === "category") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5Z" />
      <path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19M8 8h7" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading your dashboard">
      <div className="dashboard-skeleton-heading" />
      <div className="dashboard-skeleton-metrics">
        <span /><span /><span />
      </div>
      <div className="dashboard-skeleton-chart" />
    </div>
  );
}

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value?: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-chart-tooltip">
      <strong>{payload[0].value ?? 0}</strong>
      <span>{payload[0].value === 1 ? "inspiration" : "inspirations"}</span>
    </div>
  );
}

function SurpriseProjectPhoto({ project }: { project: InspirationRecord }) {
  const [failed, setFailed] = useState(false);
  const src = project.photoUrl ?? project.imageUrl;
  if (!src || failed) {
    return (
      <div className="dashboard-surprise-photo-placeholder" aria-hidden="true">
        <span className="surprise-yarn-ball" />
      </div>
    );
  }
  return <img className="dashboard-surprise-photo" src={src} alt={project.title} onError={() => setFailed(true)} />;
}

export default function DashboardPage({
  embedded = false,
  onSurpriseReady,
}: {
  embedded?: boolean;
  onSurpriseReady?: (launch: (() => void) | null) => void;
}) {
  const Root = embedded ? "div" : "main";
  const pageClass = embedded ? "dashboard-page dashboard-page-embedded" : "dashboard-page";
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [surpriseProject, setSurpriseProject] = useState<InspirationRecord | null>(null);
  const [surpriseError, setSurpriseError] = useState<string | null>(null);
  const previousSurpriseId = useRef<string | null>(null);
  const surpriseRequestId = useRef(0);
  const surpriseLoadingLock = useRef(false);
  const surpriseTriggerRef = useRef<HTMLButtonElement>(null);
  const surpriseCloseRef = useRef<HTMLButtonElement>(null);
  const surpriseDialogRef = useRef<HTMLElement>(null);

  const closeSurprise = useCallback(() => {
    surpriseRequestId.current += 1;
    surpriseLoadingLock.current = false;
    setSurpriseLoading(false);
    setSurpriseOpen(false);
    window.requestAnimationFrame(() => surpriseTriggerRef.current?.focus());
  }, []);

  const pickSurprise = useCallback(async () => {
    if (surpriseLoadingLock.current) return;
    surpriseLoadingLock.current = true;
    const currentRequest = ++surpriseRequestId.current;
    setSurpriseOpen(true);
    setSurpriseLoading(true);
    setSurpriseError(null);
    try {
      const project = await getSurpriseInspiration(previousSurpriseId.current ?? undefined);
      if (surpriseRequestId.current !== currentRequest) return;
      setSurpriseProject(project);
      if (project) previousSurpriseId.current = project.id;
    } catch (caught) {
      if (surpriseRequestId.current === currentRequest) {
        setSurpriseError(caught instanceof Error ? caught.message : "We couldn’t pick a project. Please try again.");
      }
    } finally {
      if (surpriseRequestId.current === currentRequest) {
        surpriseLoadingLock.current = false;
        setSurpriseLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!onSurpriseReady) return;
    onSurpriseReady(() => { void pickSurprise(); });
    return () => onSurpriseReady(null);
  }, [onSurpriseReady, pickSurprise]);

  useEffect(() => {
    if (!surpriseOpen) return;
    surpriseCloseRef.current?.focus();
    function manageSurpriseDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSurprise();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = surpriseDialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]");
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
    window.addEventListener("keydown", manageSurpriseDialogKeys);
    return () => window.removeEventListener("keydown", manageSurpriseDialogKeys);
  }, [surpriseOpen, closeSurprise]);

  const loadSummary = useCallback(async (initial = false) => {
    const currentRequest = ++requestId.current;
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const result = await getDashboardSummary();
      if (requestId.current === currentRequest) setSummary(result);
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setError(caught instanceof Error ? caught.message : "We couldn't load your dashboard.");
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSummary(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadSummary(false);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      requestId.current += 1;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadSummary]);

  const retry = () => void loadSummary(!summary);

  if (loading && !summary) {
    return (
      <Root className={pageClass}>
        <div className="dashboard-inner"><DashboardSkeleton /></div>
      </Root>
    );
  }

  return (
    <Root className={pageClass}>
      <div className="dashboard-inner">
        <div className="dashboard-topline">
          <span className="dashboard-kicker"><span className="dashboard-kicker-mark" /> YOUR PRIVATE CROCHET NOTEBOOK</span>
          <span className="dashboard-refresh-status" aria-live="polite">
            {refreshing ? "Updating your notebook" : "A little space for what inspires you"}
          </span>
        </div>

        <section className="dashboard-heading">
          <div>
            <p className="dashboard-overline">THE CROCHET EDIT · DASHBOARD</p>
            <h1>Your ideas,<br /><em>gathered in one place.</em></h1>
            <p className="dashboard-intro">
              A quiet overview of the projects you’ve been dreaming up.
            </p>
            <button
              ref={surpriseTriggerRef}
              type="button"
              className="dashboard-surprise-button"
              onClick={() => void pickSurprise()}
              disabled={surpriseLoading}
            >
              <span aria-hidden="true">✦</span> Surprise Me!
            </button>
          </div>
          <div className="dashboard-heading-note" aria-hidden="true">
            <span className="dashboard-note-line" />
            <span>keep the lovely<br />ideas close</span>
            <span className="dashboard-note-scribble">—</span>
          </div>
        </section>

        {error && (
          <section className="dashboard-error" role="alert">
            <div>
              <strong>Your notebook didn’t open.</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="dashboard-retry" onClick={retry}>Try again</button>
          </section>
        )}

        {summary && (
          <>
            <section className="dashboard-metrics" aria-label="Inspiration summary">
              <article className="dashboard-metric metric-sage">
                <div className="dashboard-metric-top">
                  <span>Total Inspirations</span>
                  <span className="dashboard-metric-icon"><MetricIcon type="collection" /></span>
                </div>
                <strong>{summary.totalInspirations}</strong>
                <span className="dashboard-metric-foot">saved for another day</span>
              </article>
              <article className="dashboard-metric metric-lavender">
                <div className="dashboard-metric-top">
                  <span>Starred Inspirations</span>
                  <span className="dashboard-metric-icon"><MetricIcon type="star" /></span>
                </div>
                <strong>{summary.starredInspirations}</strong>
                <span className="dashboard-metric-foot">the ones you love most</span>
              </article>
              <article className="dashboard-metric metric-paper">
                <div className="dashboard-metric-top">
                  <span>Categories Used</span>
                  <span className="dashboard-metric-icon"><MetricIcon type="category" /></span>
                </div>
                <strong>{summary.categoriesUsed}</strong>
                <span className="dashboard-metric-foot">different kinds of making</span>
              </article>
            </section>

            {summary.totalInspirations === 0 ? (
              <section className="dashboard-empty">
                <div className="dashboard-empty-art" aria-hidden="true">
                  <span className="empty-loop loop-one" />
                  <span className="empty-loop loop-two" />
                  <span className="empty-loop loop-three" />
                  <span className="empty-needle" />
                </div>
                <div className="dashboard-empty-copy">
                  <p className="dashboard-overline">A FRESH PAGE</p>
                  <h2>Your collection is ready<br /><em>for its first idea.</em></h2>
                  <p>When a project catches your eye, save it here. Your personal library will be waiting when you’re ready to choose what to make.</p>
                  <Link href="/inspirations" className="dashboard-primary-link">
                    Visit my collection <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </section>
            ) : (
              <section className="dashboard-chart-panel" aria-labelledby="category-chart-title">
                <div className="dashboard-chart-heading">
                  <div>
                    <p className="dashboard-overline">YOUR COLLECTION, BY THEME</p>
                    <h2 id="category-chart-title">Ideas take <em>shape.</em></h2>
                  </div>
                  <Link href="/inspirations" className="dashboard-text-link">
                    Browse collection <span aria-hidden="true">↗</span>
                  </Link>
                </div>
                {summary.categoryCounts.length > 0 ? (
                  <div className="dashboard-chart" role="img" aria-label="Bar chart showing inspiration counts by category">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.categoryCounts}
                        layout="vertical"
                        margin={{ top: 6, right: 22, left: 4, bottom: 4 }}
                        barCategoryGap={13}
                      >
                        <CartesianGrid horizontal={false} stroke="#e8e4db" strokeDasharray="2 5" />
                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8b8a7f", fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="categoryName"
                          width={124}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#555b51", fontSize: 12 }}
                        />
                        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "rgba(120, 138, 112, .08)" }} />
                        <Bar dataKey="inspirationCount" radius={[0, 8, 8, 0]} maxBarSize={27} isAnimationActive>
                          {summary.categoryCounts.map((category, index) => (
                            <Cell key={category.categoryId} fill={categoryColors[index % categoryColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="dashboard-chart-empty">
                    <span className="dashboard-chart-empty-mark" aria-hidden="true">—</span>
                    <p>Your saved ideas haven’t been sorted into categories yet.</p>
                  </div>
                )}
                <div className="dashboard-chart-caption">
                  <span>COUNT OF SAVED INSPIRATIONS</span>
                  <span>{summary.categoryCounts.length} {summary.categoryCounts.length === 1 ? "category" : "categories"}</span>
                </div>
              </section>
            )}

            <nav className="dashboard-quick-links" aria-label="Your library">
              <Link href="/inspirations" className="dashboard-quick-link">
                <span className="quick-link-number">01</span>
                <span><strong>My collection</strong><small>All the ideas you’ve saved</small></span>
                <span className="quick-link-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link href="/favorites" className="dashboard-quick-link">
                <span className="quick-link-number">02</span>
                <span><strong>Starred ideas</strong><small>Your most-loved possibilities</small></span>
                <span className="quick-link-arrow" aria-hidden="true">↗</span>
              </Link>
            </nav>
          </>
        )}
      </div>
      {surpriseOpen && createPortal(
        <div className="dashboard-surprise-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSurprise();
        }}>
          <section
            ref={surpriseDialogRef}
            className="dashboard-surprise-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-surprise-title"
            aria-describedby="dashboard-surprise-description"
          >
            <button
              ref={surpriseCloseRef}
              type="button"
              className="dashboard-surprise-close"
              aria-label="Close Surprise Me"
              onClick={closeSurprise}
            >
              ×
            </button>
            <p className="dashboard-overline">A LITTLE CREATIVE NUDGE</p>
            <h2 id="dashboard-surprise-title">Your next project</h2>
            <p id="dashboard-surprise-description" className="dashboard-surprise-intro">
              A lovely idea from your “Want to Make” list.
            </p>

            {surpriseLoading ? (
              <div className="dashboard-surprise-message" role="status">
                <span className="dashboard-surprise-spinner" aria-hidden="true" />
                Finding an idea for you…
              </div>
            ) : surpriseError ? (
              <div className="dashboard-surprise-message dashboard-surprise-error" role="alert">
                <p>{surpriseError}</p>
                <button type="button" className="dashboard-surprise-secondary" onClick={() => void pickSurprise()}>Try again</button>
              </div>
            ) : surpriseProject ? (
              <article className="dashboard-surprise-card">
                <div className="dashboard-surprise-visual">
                  <SurpriseProjectPhoto key={surpriseProject.id} project={surpriseProject} />
                </div>
                <div className="dashboard-surprise-copy">
                  <span className="dashboard-surprise-category">{surpriseProject.categoryName}</span>
                  <h3>{surpriseProject.title}</h3>
                  {surpriseProject.difficulty && <span className="dashboard-surprise-difficulty">{surpriseProject.difficulty}</span>}
                  {surpriseProject.patternUrl && (
                    <a className="dashboard-surprise-pattern" href={surpriseProject.patternUrl} target="_blank" rel="noopener noreferrer">
                      Open original pattern <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  <Link className="dashboard-surprise-detail-link" href={`/inspirations/${encodeURIComponent(surpriseProject.id)}`}>
                    View project details <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ) : (
              <div className="dashboard-surprise-message dashboard-surprise-empty" role="status">
                <span className="surprise-empty-mark" aria-hidden="true">✿</span>
                <p>No “Want to Make” projects yet. Save a crochet idea or move one to “Want to Make,” and we’ll pick one for you.</p>
                <Link className="dashboard-surprise-detail-link" href="/inspirations" onClick={closeSurprise}>
                  Browse My Collection <span aria-hidden="true">↗</span>
                </Link>
              </div>
            )}

            <div className="dashboard-surprise-actions">
              {surpriseProject && (
                <button type="button" className="dashboard-surprise-secondary" onClick={() => void pickSurprise()} disabled={surpriseLoading}>
                  Pick Again
                </button>
              )}
              <button type="button" className="dashboard-surprise-secondary" onClick={closeSurprise}>Close</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </Root>
  );
}
