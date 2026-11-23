import { isAdminUser } from "../lib/supabase";

export default function Navbar({ currentPage, session, onNavigate, onSignOut }) {
  function go(e, page, hash) {
    e.preventDefault();
    onNavigate(page, hash);
  }

  const isAdmin = isAdminUser(session);
  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Studio";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="#home" className="brand" onClick={(e) => go(e, "home", "#home")}>
          <span className="brand-name">riroverse</span>
          <span className="brand-tag">Art Studio</span>
        </a>

        <nav className="nav-links" aria-label="Primary navigation">
          <a
            href="#home"
            className={currentPage === "home" ? "active" : ""}
            onClick={(e) => go(e, "home", "#home")}
          >
            Home
          </a>
          {session && (
            <a
              href="#works"
              className={currentPage === "works" ? "active" : ""}
              onClick={(e) => go(e, "works", "#works")}
            >
              Works
            </a>
          )}
          <a
            href="#upload"
            className={currentPage === "upload" ? "active" : ""}
            onClick={(e) => go(e, "upload", "#upload")}
          >
            Upload
          </a>
        </nav>

        <div className="nav-actions">
          {session ? (
            <>
              <button
                type="button"
                className="btn-nav-ghost nav-user-btn"
                onClick={(e) => go(e, "upload", "#upload")}
              >
                <span>{displayName}</span>
                {isAdmin && <span className="admin-badge">Admin</span>}
              </button>
              <button type="button" className="btn-nav" onClick={onSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a
                href="#signin"
                className="btn-nav-ghost"
                onClick={(e) => go(e, "signin", "#signin")}
              >
                Sign In
              </a>
              <a
                href="#signup"
                className="btn-nav-solid"
                onClick={(e) => go(e, "signup", "#signup")}
              >
                Sign Up
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
