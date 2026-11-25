import { isAdminUser } from "../lib/supabase";

export default function Navbar({ currentPage, session, onNavigate, onSignOut }) {
  function go(e, page, hash) {
    e.preventDefault();
    onNavigate(page, hash);
  }

  const isAdmin = isAdminUser(session);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Row 1 — Brand */}
        <div className="navbar-top">
          <a href="#home" className="brand" onClick={(e) => go(e, "home", "#home")}>
            <span className="brand-name">riroverse</span>
            <span className="brand-tag">Art Studio</span>
          </a>
        </div>

        {/* Row 2 — Nav + Auth centered */}
        <div className="navbar-bottom">
          <nav className="nav-links" aria-label="Primary navigation">
            <a
              href="#home"
              className={currentPage === "home" ? "active" : ""}
              onClick={(e) => go(e, "home", "#home")}
            >
              Home
            </a>
            <a
              href="#about"
              className={currentPage === "about" ? "active" : ""}
              onClick={(e) => go(e, "about", "#about")}
            >
              About
            </a>
            <a
              href="#request"
              className={currentPage === "request" ? "active" : ""}
              onClick={(e) => go(e, "request", "#request")}
            >
              Request
            </a>

            {/* Sign-out only shown when logged in */}
            {session && (
              <>
                {isAdmin && <span className="admin-badge">Admin</span>}
                <button type="button" className="btn-nav btn-nav-signout" onClick={onSignOut} title="Sign Out">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
