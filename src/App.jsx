import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import FeaturedHome from "./components/FeaturedHome";
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
  if (hash === "#upload") return "upload";
  if (hash === "#works") return "works";
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

  return (
    <div className="page">
      <Navbar
        currentPage={page}
        session={session}
        onNavigate={handleNavigate}
        onSignOut={() => setConfirmSignOut(true)}
      />

      <main className="container">
        {page === "signin" || page === "signup" ? (
          <AuthSection
            key={page}
            initialMode={page}
            onSuccess={() => handleNavigate("home", "#home")}
            onBack={() => handleNavigate("home", "#home")}
          />
        ) : page === "upload" ? (
          <AdminPanel
            session={session}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onBack={() => handleNavigate("home", "#home")}
          />
        ) : page === "works" ? (
          <Gallery
            session={session}
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onGoUpload={() => handleNavigate("upload", "#upload")}
            onBackHome={() => handleNavigate("home", "#home")}
          />
        ) : (
          <>
            <Hero />

            <FeaturedHome
              session={session}
              refreshKey={refreshKey}
              onOpenWorks={() => handleNavigate("works", "#works")}
              onOpenAuth={() => handleNavigate("signin", "#signin")}
            />

            <section id="about" className="studio-section">
              <div className="studio-grid">
                <div className="studio-block">
                  <p className="eyebrow">The Studio</p>
                  <h2>Crafted with warmth, restraint, and character.</h2>
                  <p>
                    Riroverse is the independent creative practice of Riro—an exploration
                    of earth-toned visual storytelling across digital illustration,
                    editorial composition, and short-form motion studies.
                  </p>
                </div>

                <div id="contact" className="studio-block studio-block-inquire">
                  <p className="eyebrow">Commissions &amp; Licensing</p>
                  <h2>Let&apos;s build something memorable.</h2>
                  <p>
                    Available for international commissions, album &amp; book covers,
                    brand illustrations, and creative collaborations.
                  </p>

                  <div className="contact-actions">
                    <a href="mailto:riroartdsg@gmail.com" className="btn-primary">
                      riroartdsg@gmail.com
                    </a>
                    <a
                      href={SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-social"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5zm8.95 1.35a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3zM12 6.85a5.15 5.15 0 1 1 0 10.3 5.15 5.15 0 0 1 0-10.3zm0 1.8a3.35 3.35 0 1 0 0 6.7 3.35 3.35 0 0 0 0-6.7z" />
                      </svg>
                      <span>Instagram</span>
                    </a>
                    <a
                      href={SOCIAL_LINKS.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-social"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
                      </svg>
                      <span>TikTok</span>
                    </a>
                    <a
                      href={SOCIAL_LINKS.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-social"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>X</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <strong>riroverse</strong>
            <span>Riro Art &amp; Design Studio · Worldwide</span>
          </div>

          <div className="footer-right">
            <div className="footer-socials">
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
              <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer">
                X
              </a>
              <a href="mailto:riroartdsg@gmail.com">Email</a>
            </div>
            <div className="footer-meta">
              <span>© {new Date().getFullYear()} Riroverse</span>
              {session && (
                <button
                  type="button"
                  className="admin-toggle"
                  onClick={() => handleNavigate("works", "#works")}
                >
                  Works
                </button>
              )}
              <button
                type="button"
                className="admin-toggle"
                onClick={() => handleNavigate("upload", "#upload")}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      </footer>

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
              Signing out will lock the full Works archive and Upload desk until you sign
              in again.
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
