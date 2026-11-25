import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
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
    if (!confirmSignOut) return;
    const handleEsc = (e) => {
      if (e.key === "Escape" && !signingOut) setConfirmSignOut(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [confirmSignOut, signingOut]);

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

  const isMainPage = page === "home" || page === "about" || page === "request";

  return (
    <div className={`page ${page === "home" ? "page-home" : ""} ${page === "request" ? "page-request" : ""}`}>
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
            onGoUpload={() => handleNavigate("request", "#request")}
            onBackHome={() => handleNavigate("home", "#home")}
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

      {/* Subtle admin sign-out — only visible on Home when signed in */}
      {page === "home" && session && (
        <button
          type="button"
          className="admin-signout-icon"
          onClick={() => setConfirmSignOut(true)}
          title={`Signed in as ${session.user.email}`}
          aria-label="Sign out"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
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

      <FloatingX socials={SOCIAL_LINKS} />
    </div>
  );
}
