import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import YarnIllustration from "./components/YarnIllustration";
import { InspirationRoutes } from "./features/inspirations";

const DashboardPage = lazy(() => import("./features/dashboard"));
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY. Set up Clerk Auth for this app.");
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#71816b",
    colorForeground: "#333a34",
    colorMutedForeground: "#737a70",
    colorDanger: "#aa594b",
    colorBackground: "#fffefa",
    colorInput: "#ffffff",
    colorInputForeground: "#333a34",
    colorNeutral: "#333a34",
    fontFamily: '"DM Sans", Arial, sans-serif',
    borderRadius: "0.8rem",
  },
  elements: {
    rootBox: { width: "100%", display: "flex", justifyContent: "center" },
    cardBox: {
      backgroundColor: "#fffefa",
      borderRadius: "16px",
      boxShadow: "0 18px 60px rgba(57, 63, 53, .12)",
      width: "420px",
      maxWidth: "100%",
      overflow: "hidden",
    },
    card: { boxShadow: "none", border: "none", backgroundColor: "transparent" },
    footer: { boxShadow: "none", border: "none", backgroundColor: "transparent" },
    headerTitle: { color: "#333a34", fontWeight: 500 },
    headerSubtitle: { color: "#737a70" },
    socialButtonsBlockButtonText: { color: "#333a34" },
    formFieldLabel: { color: "#454b43" },
    footerActionLink: { color: "#62765b" },
    footerActionText: { color: "#737a70" },
    dividerText: { color: "#737a70" },
    identityPreviewEditButton: { color: "#62765b" },
    formFieldSuccessText: { color: "#62765b" },
    alertText: { color: "#733b33" },
    socialButtonsBlockButton: { borderColor: "#e8e5dc", backgroundColor: "#fff" },
    formButtonPrimary: { backgroundColor: "#71816b", color: "#fff" },
    formFieldInput: { borderColor: "#e5e2d9", backgroundColor: "#fff", color: "#333a34" },
    dividerLine: { backgroundColor: "#e8e5dc" },
    alert: { backgroundColor: "#fbefec", borderColor: "#f1d9d4" },
    otpCodeFieldInput: { borderColor: "#e5e2d9", backgroundColor: "#fff" },
    formFieldRow: { color: "#454b43" },
    main: { color: "#333a34" },
  },
};

function UserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(null);
    if (!isLoaded || !isSignedIn || !user) return;
    const controller = new AbortController();

    void fetch("/api/auth/sync", {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "We couldn't finish setting up your account.");
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "Account setup failed. Please try again.");
      }
    });
    return () => controller.abort();
  }, [isLoaded, isSignedIn, user?.id, attempt]);

  return error && isSignedIn ? (
    <div role="alert" style={{ padding: "14px 24px", background: "#fbefec", color: "#733b33", textAlign: "center" }}>
      {error}{" "}
      <button type="button" onClick={() => setAttempt((value) => value + 1)} style={{ cursor: "pointer", textDecoration: "underline", border: 0, background: "transparent" }}>
        Retry account setup
      </button>
    </div>
  ) : null;
}

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="The Crochet Edit home">
      <span className="brand-mark" aria-hidden="true">
        <img src={`${basePath}/logo.svg`} alt="" />
      </span>
      <span className="brand-name">the crochet edit</span>
    </Link>
  );
}

function SiteHeader() {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();

  return (
    <header className="site-header">
      <Brand />
      <nav className="header-actions" aria-label="Account">
        {isLoaded && !isSignedIn && (
          <>
            <Link className="button button-text" href="/sign-in">Log in</Link>
            <Link className="button button-small" href="/sign-up">Sign up</Link>
          </>
        )}
        {isLoaded && isSignedIn && (
          <>
            <Link className="button button-text" href="/inspirations">My collection</Link>
            <Link className="button button-text" href="/dashboard">Dashboard</Link>
            <Link className="button button-text" href="/favorites">Favorites</Link>
            {!location.startsWith("/inspirations") && !location.startsWith("/favorites") && !location.startsWith("/dashboard") && <span className="header-note">Your little corner</span>}
            <button
              className="button button-text"
              type="button"
              onClick={() => void signOut({ redirectUrl: basePath || "/" })}
            >
              Log out
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

function DashboardRoute() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <main className="dashboard-page" aria-label="Loading account" />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return (
    <Suspense fallback={<main className="dashboard-page" aria-label="Loading dashboard" />}>
      <DashboardPage />
    </Suspense>
  );
}

function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [surpriseLauncher, setSurpriseLauncher] = useState<(() => void) | null>(null);
  const onSurpriseReady = useCallback((launch: (() => void) | null) => {
    setSurpriseLauncher(() => launch);
  }, []);

  if (!isLoaded) {
    return <main className="loading-state" aria-label="Loading account" />;
  }

  if (isSignedIn) {
    const firstName = user.firstName?.trim();
    return (
      <main className="welcome-page welcome-page-with-dashboard">
        <div className="welcome-orb orb-sage" />
        <div className="welcome-orb orb-pink" />
        <section className="welcome-card">
          <span className="eyebrow">A place for your next little project</span>
          <h1>Welcome{firstName ? `, ${firstName}` : " back"}.</h1>
          <p>
            Your crochet corner is ready whenever inspiration finds you.
            We’re glad you’re here.
          </p>
          <span className="welcome-stitch" aria-hidden="true" />
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link className="button button-primary" href="/inspirations">Open my collection <span aria-hidden="true">↗</span></Link>
            <button
              className="button button-primary welcome-surprise-button"
              type="button"
              onClick={() => surpriseLauncher?.()}
              disabled={!surpriseLauncher}
            >
              Surprise Me! <span aria-hidden="true">✦</span>
            </button>
          </div>
        </section>
        <Suspense fallback={<div className="dashboard-page dashboard-page-embedded" aria-label="Loading dashboard" />}>
          <DashboardPage embedded onSurpriseReady={onSurpriseReady} />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> A softer place to save inspiration</span>
        <h1>Your next<br /><em>pretty project</em></h1>
        <p className="hero-description">
          A cozy little home for the crochet ideas you find, love, and can’t
          wait to make.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/sign-up">
            Start your collection <span aria-hidden="true">↗</span>
          </Link>
          <Link className="quiet-link" href="/sign-in">I already have an account</Link>
        </div>
      </div>
      <div className="hero-art" aria-label="Decorative yarn and crochet-inspired illustration">
        <div className="art-wash" />
        <div className="art-label label-top">A LITTLE SPACE TO MAKE</div>
        <YarnIllustration />
        <div className="art-note note-left">for the things<br />you can’t wait<br />to make</div>
        <div className="art-note note-right">ideas<br />worth keeping</div>
        <div className="art-label label-bottom">GATHER · DREAM · CREATE</div>
      </div>
    </main>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <main className="loading-state" aria-label="Loading account" />;
  return isSignedIn ? <Redirect to="/welcome" /> : <HomePage />;
}

function WelcomePage() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <main className="loading-state" aria-label="Loading account" />;
  return isSignedIn ? <HomePage /> : <Redirect to="/" />;
}

function SignInPage() {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && isSignedIn) return <Redirect to="/welcome" />;
  return (
    <main className="auth-page">
      <div className="auth-backdrop auth-backdrop-sage" />
      <div className="auth-backdrop auth-backdrop-pink" />
      <Link className="auth-home-link" href="/"><span aria-hidden="true">←</span> Back home</Link>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </main>
  );
}

function SignUpPage() {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && isSignedIn) return <Redirect to="/welcome" />;
  return (
    <main className="auth-page">
      <div className="auth-backdrop auth-backdrop-sage" />
      <div className="auth-backdrop auth-backdrop-pink" />
      <Link className="auth-home-link" href="/"><span aria-hidden="true">←</span> Back home</Link>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </main>
  );
}

function AppRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your little corner of crochet.",
          },
        },
        signUp: {
          start: {
            title: "Let’s make a little space",
            subtitle: "Create an account to keep your inspiration close.",
          },
        },
      }}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
    >
      <UserSync />
      <div className="app-shell">
        <SiteHeader />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/welcome" component={WelcomePage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard" component={DashboardRoute} />
          <Route path="/favorites" component={InspirationRoutes} />
          <Route path="/inspirations" component={InspirationRoutes} />
          <Route path="/inspirations/*" component={InspirationRoutes} />
          <Route><HomeRedirect /></Route>
        </Switch>
        <footer className="site-footer">
          <span>the crochet edit</span>
          <span>Keep the lovely ideas close.</span>
        </footer>
      </div>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}
