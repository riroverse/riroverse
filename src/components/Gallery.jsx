import { useEffect, useMemo, useState } from "react";
import { isAdminUser, isSupabaseConfigured, supabase } from "../lib/supabase";

const DEMO_REQUESTS = [
  {
    title: "Dusk in the Studio",
    desc: "Warm terracotta illustration inspired by late afternoon sunlight across a minimalist desk.",
  },
  {
    title: "Terracotta Stillness",
    desc: "Editorial character portrait with muted clay palette, soft grain texture, and calm expression.",
  },
  {
    title: "Morning Espresso",
    desc: "Cozy coffee corner scene in earthy brown and cream tones for a brand header visual.",
  },
  {
    title: "Warm Brushstrokes",
    desc: "Abstract painterly landscape blending ochre, raw umber, and linen white for print series.",
  },
  {
    title: "Clay & Shadow",
    desc: "Minimal architectural study focusing on geometric arches and long afternoon shadows.",
  },
  {
    title: "Autumn Horizon",
    desc: "Atmospheric landscape artwork with burnt sienna hills and quiet misty sky.",
  },
  {
    title: "Ochre Courtyard",
    desc: "Sun-washed Mediterranean courtyard concept art with ceramic pots and warm plaster walls.",
  },
  {
    title: "Quiet Monolith",
    desc: "Sculptural editorial cover concept using deep espresso silhouette against warm sand backdrop.",
  },
  {
    title: "Sienna Study IV",
    desc: "Botanical line work paired with soft watercolor wash in earth tones for stationery set.",
  },
  {
    title: "Timber & Light",
    desc: "Interior study of cedar beams and morning window light, calm and grounded composition.",
  },
  {
    title: "Sandstone Veil",
    desc: "Portrait illustration with flowing linen fabric and subtle sunlit rim lighting.",
  },
  {
    title: "Amber Solitude",
    desc: "Single figure overlooking a golden dusk valley, painted with tactile dry-brush texture.",
  },
  {
    title: "Raw Umber Form",
    desc: "Modernist color-block composition suitable for album cover and social campaign.",
  },
  {
    title: "Evening Linen",
    desc: "Still life of handmade ceramics, dried branches, and warm candlelight on linen table.",
  },
  {
    title: "Desert Archway",
    desc: "Minimalist poster illustration featuring terracotta doorway opening to twilight sky.",
  },
  {
    title: "Soft Kiln Glow",
    desc: "Artisan studio moment capturing freshly glazed pottery in warm ambient light.",
  },
  {
    title: "Cedar & Silence",
    desc: "Quiet forest clearing rendered in muted olive, bark brown, and soft parchment highlights.",
  },
  {
    title: "Burnt Earth No. 9",
    desc: "Textured abstract canvas piece exploring balance between organic shapes and negative space.",
  },
  {
    title: "Late Sun Frame",
    desc: "Window-framed cityscape at golden hour with soft nostalgic earth-tone grading.",
  },
  {
    title: "Earthen Echo",
    desc: "Editorial spot illustration series combining organic stones, hands, and warm typography.",
  },
];

const DEMO_ARTISTS = [
  { name: "Riro", x: "@riroartdsg", tiktok: "@riroartdsg" },
  { name: "Nadia K.", x: "@nadiastudio", tiktok: "@nadia.draws" },
  { name: "Sora Tanaka", x: "@sora_visual", tiktok: "@soratanaka" },
  { name: "Alya Putri", x: "@alyaputriart", tiktok: "@alya.sketch" },
  { name: "Kael M.", x: "@kaelforms", tiktok: "@kael.studio" },
];

function buildDemoTextRequests() {
  return DEMO_REQUESTS.map((entry, i) => {
    const artist = DEMO_ARTISTS[i % DEMO_ARTISTS.length];
    const day = String(Math.max(1, 26 - i)).padStart(2, "0");
    return {
      id: `demo-text-${i + 1}`,
      title: entry.title,
      artist_name: artist.name,
      twitter_handle: artist.x,
      tiktok_handle: artist.tiktok,
      price: null,
      description: entry.desc,
      media_type: "image",
      media_url: "",
      src: "",
      created_at: `2026-11-${day}T12:00:00.000Z`,
      is_favorite: i >= 14,
      isDemo: true,
    };
  });
}

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
  const [showDemoPreview, setShowDemoPreview] = useState(true);
  const [demoItems, setDemoItems] = useState(() => buildDemoTextRequests());
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

  const allItems = useMemo(() => {
    if (!showDemoPreview) return dbItems;
    if (isAdmin) return [...demoItems, ...dbItems];
    return [...demoItems.filter((item) => item.is_favorite), ...dbItems];
  }, [isAdmin, showDemoPreview, demoItems, dbItems]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    for (const item of allItems) {
      if (item.is_favorite) approved += 1;
      else pending += 1;
    }
    return { all: allItems.length, pending, approved };
  }, [allItems]);

  const visibleItems = useMemo(() => {
    if (!isAdmin) return allItems;
    if (adminFilter === "pending") {
      return allItems.filter((item) => !item.is_favorite);
    }
    if (adminFilter === "approved") {
      return allItems.filter((item) => Boolean(item.is_favorite));
    }
    return allItems;
  }, [allItems, isAdmin, adminFilter]);

  async function handleToggleApproval(e, item) {
    e?.stopPropagation();
    if (!isAdmin || busyId === item.id) return;

    const nextApproved = !item.is_favorite;
    setConfirmDeleteId(null);

    if (item.isDemo) {
      setDemoItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, is_favorite: nextApproved } : row
        )
      );
      setSelected((prev) =>
        prev && prev.id === item.id
          ? { ...prev, is_favorite: nextApproved }
          : prev
      );
      return;
    }

    if (!supabase) return;
    setBusyId(item.id);
    setActionError("");

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
    if (!isAdmin || busyId === item.id) return;

    if (item.isDemo) {
      setDemoItems((prev) => prev.filter((row) => row.id !== item.id));
      setSelected((prev) => (prev && prev.id === item.id ? null : prev));
      setConfirmDeleteId(null);
      return;
    }

    if (!supabase) return;
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
          <button
            type="button"
            className={`admin-filter-pill admin-demo-pill ${showDemoPreview ? "is-on" : ""}`}
            onClick={() => {
              if (!showDemoPreview && demoItems.length === 0) {
                setDemoItems(buildDemoTextRequests());
              }
              setShowDemoPreview((v) => !v);
            }}
            title="Toggle local 20-item text preview (not saved to database)"
          >
            {showDemoPreview ? "Hide 20 Preview" : "Preview 20"}
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
