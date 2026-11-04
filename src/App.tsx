import { useEffect } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
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
    fontFamily: "Arial, sans-serif",
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    void fetch("/api/auth/sync", {
      method: "POST",
      credentials: "include",
    }).then(async (response) => {
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        console.error("Account sync failed:", result.error ?? response.statusText);
      }
    }).catch((error: unknown) => {
      console.error("Account sync request failed:", error);
    });
  }, [isLoaded, isSignedIn, user?.id]);

  return null;
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
            <span className="header-note">Your little corner</span>
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

function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <main className="loading-state" aria-label="Loading account" />;
  }

  if (isSignedIn) {
    const firstName = user.firstName?.trim();
    return (
      <main className="welcome-page">
        <div className="welcome-orb orb-sage" />
        <div className="welcome-orb orb-lilac" />
        <section className="welcome-card">
          <span className="eyebrow">A place for your next little project</span>
          <h1>Welcome{firstName ? `, ${firstName}` : " back"}.</h1>
          <p>
            Your crochet corner is ready whenever inspiration finds you.
            We’re glad you’re here.
          </p>
          <span className="welcome-stitch" aria-hidden="true">✳</span>
        </section>
      </main>
    );
  }

  return (
    <main className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> A softer place to save inspiration</span>
        <h1>Make room for<br /><em>your next</em> lovely thing.</h1>
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
        <div className="hero-footnote">
          <span className="footnote-spark" aria-hidden="true">✳</span>
          Made for the ideas that make your hands itch to create.
        </div>
      </div>
      <div className="hero-art" aria-label="Decorative yarn and crochet-inspired illustration">
        <div className="art-wash" />
        <div className="art-label label-top">A LITTLE SPACE TO MAKE</div>
        <div className="yarn-ball yarn-sage"><span /></div>
        <div className="yarn-ball yarn-lilac"><span /></div>
        <div className="yarn-ball yarn-cream"><span /></div>
        <svg className="yarn-line" viewBox="0 0 520 420" fill="none" aria-hidden="true">
          <path d="M145 228c46-91 132-92 177-18 28 46 71 73 131 37 29-18 46-45 45-72" stroke="#697761" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 1"/>
          <path d="M68 293c38-5 52-33 74-65 17-25 32-30 48-21" stroke="#b09bc0" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div className="art-note note-left">for the things<br />you can’t wait<br />to make</div>
        <div className="art-note note-right">ideas<br />worth keeping</div>
        <div className="art-label label-bottom">GATHER · DREAM · CREATE</div>
        <span className="art-spark spark-one">✳</span>
        <span className="art-spark spark-two">✳</span>
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
  return (
    <main className="auth-page">
      <div className="auth-backdrop auth-backdrop-sage" />
      <div className="auth-backdrop auth-backdrop-lilac" />
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
  return (
    <main className="auth-page">
      <div className="auth-backdrop auth-backdrop-sage" />
      <div className="auth-backdrop auth-backdrop-lilac" />
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
