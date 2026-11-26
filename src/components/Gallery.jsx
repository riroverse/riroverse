import { useEffect, useMemo, useState } from "react";
import { isAdminUser, isSupabaseConfigured, supabase } from "../lib/supabase";

const formatFullDate = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

const formatDayChip = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));

const toSocialUrl = (handle, platform) => {
  if (!handle) return "";
  const clean = handle.replace(/^@+/, "");
  return platform === "x"
    ? `https://x.com/${clean}`
    : `https://www.tiktok.com/@${clean}`;
};

export default function Gallery({ session, refreshKey, onChanged }) {
  const [selected, setSelected] = useState(null);
  const [dbItems, setDbItems] = useState([]);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);
  const [adminFilter, setAdminFilter] = useState("all"); // "all" | "pending" | "approved"
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState("");

  const isAdmin = isAdminUser(session);

  // Fetch artworks: admin sees all submissions, visitors/non-admin see approved only
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const query = isAdmin
      ? supabase
          .from("artworks")
          .select("*")
          .order("created_at", { ascending: false })
      : supabase
          .from("artworks")
          .select("*")
          .eq("is_favorite", true)
          .order("created_at", { ascending: false });

    query.then(({ data, error }) => {
      if (!active) return;
      if (!error && data) {
        setDbItems(
          data.map((row) => ({
            ...row,
            src: row.media_url,
          }))
        );
      }
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [refreshKey, session, isAdmin]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!selected) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    for (const item of dbItems) {
      if (item.is_favorite) approved += 1;
      else pending += 1;
    }
    return { all: dbItems.length, pending, approved };
  }, [dbItems]);

  const visibleItems = useMemo(() => {
    if (!isAdmin) return dbItems;
    if (adminFilter === "pending") {
      return dbItems.filter((item) => !item.is_favorite);
    }
    if (adminFilter === "approved") {
      return dbItems.filter((item) => Boolean(item.is_favorite));
    }
    return dbItems;
  }, [dbItems, isAdmin, adminFilter]);

  async function handleToggleApproval(e, item) {
    e?.stopPropagation();
    if (!isAdmin || !supabase || busyId === item.id) return;

    const nextApproved = !item.is_favorite;
    setBusyId(item.id);
    setActionError("");
    setConfirmDeleteId(null);

    // Optimistic update
    setDbItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, is_favorite: nextApproved } : row
      )
    );
    setSelected((prev) =>
      prev && prev.id === item.id ? { ...prev, is_favorite: nextApproved } : prev
    );

    const { error } = await supabase
      .from("artworks")
      .update({ is_favorite: nextApproved })
      .eq("id", item.id);

    setBusyId(null);

    if (error) {
      setActionError("Failed to update status: " + error.message);
      setDbItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, is_favorite: !nextApproved } : row
        )
      );
      setSelected((prev) =>
        prev && prev.id === item.id
          ? { ...prev, is_favorite: !nextApproved }
          : prev
      );
      return;
    }

    onChanged?.();
  }

  async function handleDeleteItem(e, item) {
    e?.stopPropagation();
    if (!isAdmin || !supabase || busyId === item.id) return;

    setBusyId(item.id);
    setActionError("");

    try {
      const fileName = item.media_url?.split("/artworks-media/")[1];
      if (fileName) {
        await supabase.storage
          .from("artworks-media")
          .remove([decodeURIComponent(fileName)]);
      }
      const { error } = await supabase
        .from("artworks")
        .delete()
        .eq("id", item.id);
      if (error) throw error;

      setDbItems((prev) => prev.filter((row) => row.id !== item.id));
      setSelected((prev) => (prev && prev.id === item.id ? null : prev));
      setConfirmDeleteId(null);
      onChanged?.();
    } catch (err) {
      setActionError("Delete failed: " + err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="works" className="works-page works-page-clean">
      {/* Subtle filter bar — visible to Admin only */}
      {isAdmin && (
        <div className="admin-filter-strip" role="tablist" aria-label="Filter submissions">
          <button
            type="button"
            role="tab"
            aria-selected={adminFilter === "all"}
            className={`admin-filter-pill ${adminFilter === "all" ? "active" : ""}`}
            onClick={() => setAdminFilter("all")}
          >
            All <span className="pill-count">{counts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminFilter === "pending"}
            className={`admin-filter-pill ${adminFilter === "pending" ? "active" : ""}`}
            onClick={() => setAdminFilter("pending")}
          >
            Pending{" "}
            <span className={`pill-count ${counts.pending > 0 ? "has-pending" : ""}`}>
              {counts.pending}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminFilter === "approved"}
            className={`admin-filter-pill ${adminFilter === "approved" ? "active" : ""}`}
            onClick={() => setAdminFilter("approved")}
          >
            Approved <span className="pill-count">{counts.approved}</span>
          </button>
        </div>
      )}

      {isAdmin && actionError && (
        <div className="admin-toast" role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      <div className="about-gallery-scroll">
        {!loaded ? (
          <div className="empty-gallery-minimal">
            <p>Loading...</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="empty-gallery-minimal">
            <p>
              {isAdmin && adminFilter === "pending"
                ? "No pending requests."
                : isAdmin && adminFilter === "approved"
                ? "No approved pieces yet."
                : "No artworks available yet."}
            </p>
          </div>
        ) : (
          <div className="gallery-grid">
            {visibleItems.map((item) => {
              const isBusy = busyId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;

              return (
                <article
                  key={item.id}
                  className={`art-card ${isAdmin && !item.is_favorite ? "art-card-pending" : ""}`}
                  onClick={() => setSelected(item)}
                >
                  <div className="art-thumb">
                    {item.src ? (
                      item.media_type === "video" ? (
                        <video src={item.src} muted loop autoPlay playsInline />
                      ) : (
                        <img src={item.src} alt={item.title} loading="lazy" />
                      )
                    ) : (
                      <div className="art-text-plaque">
                        <span className="art-plaque-tag">Request</span>
                        <h5>{item.title}</h5>
                        {item.description && (
                          <p className="art-plaque-desc">{item.description}</p>
                        )}
                      </div>
                    )}
                    <span className="day-chip">{formatDayChip(item.created_at)}</span>
                    {item.src && item.media_type === "video" && (
                      <span className="media-badge">VIDEO</span>
                    )}

                    {/* Admin-only status indicator on each photo */}
                    {isAdmin && (
                      <span
                        className={`card-status-pill ${
                          item.is_favorite ? "is-approved" : "is-pending"
                        }`}
                      >
                        <span className="status-dot" aria-hidden="true" />
                        {item.is_favorite ? "Approved" : "Pending"}
                      </span>
                    )}

                    <span className="art-hover-label">View Piece</span>
                  </div>

                  <div className="art-meta">
                    <div className="art-meta-top">
                      <h4>{item.title}</h4>
                      {item.price && <span className="art-price">{item.price}</span>}
                    </div>
                    <div className="art-meta-sub">
                      <time dateTime={item.created_at}>
                        {formatFullDate(item.created_at)}
                      </time>
                      {item.artist_name && <span>by {item.artist_name}</span>}
                    </div>
                    {(item.twitter_handle || item.tiktok_handle) && (
                      <div
                        className="art-socials"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.twitter_handle && (
                          <a
                            href={toSocialUrl(item.twitter_handle, "x")}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            X {item.twitter_handle}
                          </a>
                        )}
                        {item.tiktok_handle && (
                          <a
                            href={toSocialUrl(item.tiktok_handle, "tiktok")}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            TikTok {item.tiktok_handle}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Admin-only per-photo manage request bar */}
                    {isAdmin && (
                      <div
                        className="card-admin-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isConfirmingDelete ? (
                          <>
                            <span className="card-delete-prompt">Delete piece?</span>
                            <div className="card-admin-btn-group">
                              <button
                                type="button"
                                className="card-action-btn card-action-cancel"
                                disabled={isBusy}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="card-action-btn card-action-confirm-delete"
                                disabled={isBusy}
                                onClick={(e) => handleDeleteItem(e, item)}
                              >
                                {isBusy ? "Deleting..." : "Confirm"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`card-action-btn ${
                                item.is_favorite
                                  ? "card-action-revoke"
                                  : "card-action-approve"
                              }`}
                              disabled={isBusy}
                              onClick={(e) => handleToggleApproval(e, item)}
                            >
                              {item.is_favorite ? (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  Revoke
                                </>
                              ) : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Approve
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="card-action-btn card-action-delete"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Delete ${item.title}`}
                              title="Delete submission"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="lightbox"
          onClick={() => {
            setSelected(null);
            setConfirmDeleteId(null);
          }}
        >
          <div
            className={`lightbox-panel ${!selected.src ? "lightbox-panel-text-only" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              onClick={() => {
                setSelected(null);
                setConfirmDeleteId(null);
              }}
              aria-label="Close preview"
            >
              &times;
            </button>

            {selected.src && (
              <div className="lightbox-media">
                {selected.media_type === "video" ? (
                  <video src={selected.src} controls autoPlay playsInline />
                ) : (
                  <img src={selected.src} alt={selected.title} />
                )}
              </div>
            )}

            <div className="lightbox-details">
              <div className="lightbox-meta-row">
                <span className="eyebrow">{formatFullDate(selected.created_at)}</span>
                {isAdmin && (
                  <span
                    className={`card-status-pill card-status-inline ${
                      selected.is_favorite ? "is-approved" : "is-pending"
                    }`}
                  >
                    <span className="status-dot" aria-hidden="true" />
                    {selected.is_favorite ? "Approved" : "Pending"}
                  </span>
                )}
              </div>

              <h3>{selected.title}</h3>
              {selected.artist_name && (
                <p className="lightbox-artist">Created by {selected.artist_name}</p>
              )}
              <p className="lightbox-desc">
                {selected.description ||
                  "Published in the Riroverse archive. Available for print inquiry, licensing, or custom commissions."}
              </p>

              {(selected.twitter_handle || selected.tiktok_handle) && (
                <div className="lightbox-socials">
                  {selected.twitter_handle && (
                    <a
                      href={toSocialUrl(selected.twitter_handle, "x")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-social"
                    >
                      X {selected.twitter_handle}
                    </a>
                  )}
                  {selected.tiktok_handle && (
                    <a
                      href={toSocialUrl(selected.tiktok_handle, "tiktok")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-social"
                    >
                      TikTok {selected.tiktok_handle}
                    </a>
                  )}
                </div>
              )}

              {selected.price && (
                <div className="lightbox-price">
                  <span>Valuation / Rate</span>
                  <strong>{selected.price}</strong>
                </div>
              )}

              {isAdmin && (
                <div className="lightbox-admin-bar">
                  {confirmDeleteId === selected.id ? (
                    <>
                      <span className="card-delete-prompt">Delete permanently?</span>
                      <div className="card-admin-btn-group">
                        <button
                          type="button"
                          className="card-action-btn card-action-cancel"
                          disabled={busyId === selected.id}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="card-action-btn card-action-confirm-delete"
                          disabled={busyId === selected.id}
                          onClick={(e) => handleDeleteItem(e, selected)}
                        >
                          {busyId === selected.id ? "Deleting..." : "Confirm"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`card-action-btn ${
                          selected.is_favorite
                            ? "card-action-revoke"
                            : "card-action-approve"
                        }`}
                        disabled={busyId === selected.id}
                        onClick={(e) => handleToggleApproval(e, selected)}
                      >
                        {selected.is_favorite ? "Revoke Approval" : "Approve Request"}
                      </button>
                      <button
                        type="button"
                        className="card-action-btn card-action-delete"
                        disabled={busyId === selected.id}
                        onClick={() => setConfirmDeleteId(selected.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
