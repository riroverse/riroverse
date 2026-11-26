import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Gallery from "./components/Gallery";
import AdminPanel from "./components/AdminPanel";
import AuthSection from "./components/AuthSection";
import FloatingX from "./components/FloatingX";

// Update these links if your Instagram, X, or TikTok handle changes
const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/riroartdsg/",
  tiktok: "https://www.tiktok.com/@riroartdsg",
  x: "https://x.com/riroartdsg",
};

function getPageFromHash() {
  const hash = window.location.hash;
  if (hash === "#request") return "request";
  if (hash === "#about") return "about";
  if (hash === "#signin") return "signin";
  if (hash === "#signup") return "signup";
  return "home";
}

export default function App() {
  const [page, setPage] = useState(getPageFromHash);
  const [session, setSession] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [signInShowPw, setSignInShowPw] = useState(false);

  useEffect(() => {
    const syncHash = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!confirmSignOut && !showSignInPopup) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (confirmSignOut && !signingOut) setConfirmSignOut(false);
        if (showSignInPopup && !signInLoading) {
          setShowSignInPopup(false);
          setSignInError("");
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [confirmSignOut, signingOut, showSignInPopup, signInLoading]);

  function handleNavigate(nextPage, hash) {
    setPage(nextPage);
    if (hash) {
      window.history.replaceState(null, "", hash);
    }
    if (nextPage !== "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (hash && hash !== "#home") {
      requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleConfirmSignOut() {
    setSigningOut(true);
    try {
      if (supabase) await supabase.auth.signOut();
      setConfirmSignOut(false);
      handleNavigate("home", "#home");
    } finally {
      setSigningOut(false);
    }
  }

  function handleMenuClick() {
    if (session) {
      setConfirmSignOut(true);
    } else {
      setShowSignInPopup(true);
      setSignInEmail("");
      setSignInPassword("");
      setSignInError("");
      setSignInShowPw(false);
    }
  }

  async function handleSignInSubmit(e) {
    e.preventDefault();
    if (!supabase) return;
    setSignInError("");
    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });
      if (error) throw error;
      setShowSignInPopup(false);
      setSignInPassword("");
    } catch (err) {
      setSignInError(err.message);
    } finally {
      setSignInLoading(false);
    }
  }

  const isMainPage = page === "home" || page === "about" || page === "request";

  return (
    <div className={`page ${page === "home" ? "page-home" : ""} ${page === "about" ? "page-about" : ""} ${page === "request" ? "page-request" : ""}`}>
      {!isMainPage && (
        <Navbar
          currentPage={page}
          session={session}
          onNavigate={handleNavigate}
          onSignOut={() => setConfirmSignOut(true)}
        />
      )}

      <main className="container">
        {page === "signin" || page === "signup" ? (
          <AuthSection
            key={page}
            initialMode={page}
            onSuccess={() => handleNavigate("home", "#home")}
            onBack={() => handleNavigate("home", "#home")}
          />
        ) : page === "request" ? (
          <AdminPanel
            session={session}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onBack={() => handleNavigate("home", "#home")}
          />
        ) : page === "about" ? (
          <Gallery
            session={session}
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        ) : (
          <Hero />
        )}
      </main>

      {isMainPage && (
        <nav className="home-bottom-nav" aria-label="Primary navigation">
          <a
            href="#home"
            className={page === "home" ? "active" : ""}
            onClick={(e) => { e.preventDefault(); handleNavigate("home", "#home"); }}
          >
            Home
          </a>
          <a
            href="#about"
            className={page === "about" ? "active" : ""}
            onClick={(e) => { e.preventDefault(); handleNavigate("about", "#about"); }}
          >
            About
          </a>
          <a
            href="#request"
            className={page === "request" ? "active" : ""}
            onClick={(e) => { e.preventDefault(); handleNavigate("request", "#request"); }}
          >
            Request
          </a>
        </nav>
      )}

      {/* Menu icon — always visible on Home page */}
      {page === "home" && (
        <button
          type="button"
          className="admin-signout-icon"
          onClick={handleMenuClick}
          title={session ? `Signed in as ${session.user.email}` : "Sign In"}
          aria-label={session ? "Menu" : "Sign In"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {confirmSignOut && session && (
        <div
          className="confirm-backdrop"
          onClick={() => !signingOut && setConfirmSignOut(false)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow">Confirm Sign Out</p>
            <h2 id="signout-title">Leave your studio session?</h2>
            <p className="confirm-copy">
              You are currently signed in as <strong>{session.user.email}</strong>.
              Signing out will end your session.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-outline"
                disabled={signingOut}
                onClick={() => setConfirmSignOut(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary confirm-signout-btn"
                disabled={signingOut}
                onClick={handleConfirmSignOut}
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign-in popup — when not logged in and menu is clicked */}
      {showSignInPopup && !session && (
        <div
          className="confirm-backdrop"
          onClick={() => !signInLoading && setShowSignInPopup(false)}
        >
          <div
            className="confirm-dialog signin-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow">Studio Access</p>
            <h2 id="signin-popup-title">Sign in to your account</h2>
            <p className="confirm-copy">
              Enter your credentials to access the studio.
            </p>

            {!isSupabaseConfigured ? (
              <p className="admin-note">
                Supabase is not configured yet.
              </p>
            ) : (
              <form className="signin-popup-form" onSubmit={handleSignInSubmit}>
                <label className="field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <div className="password-wrap">
                    <input
                      type={signInShowPw ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setSignInShowPw((v) => !v)}
                      aria-label={signInShowPw ? "Hide password" : "Show password"}
                    >
                      {signInShowPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {signInError && (
                  <p className="auth-alert auth-alert-error">{signInError}</p>
                )}

                <div className="confirm-actions signin-popup-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={signInLoading}
                    onClick={() => setShowSignInPopup(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={signInLoading}
                  >
                    {signInLoading ? "Signing in..." : "Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <FloatingX socials={SOCIAL_LINKS} />
    </div>
  );
}
