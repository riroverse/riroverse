import { useEffect, useMemo, useRef, useState } from "react";
import { artworks as fallbackArtworks } from "../data/artworks";
import { createArtDataUrl } from "../utils/artPlaceholder";
import { isAdminUser, isSupabaseConfigured, supabase } from "../lib/supabase";
import AuthSection from "./AuthSection";

const START_YEAR = 2026;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

export default function Gallery({ session, refreshKey, onChanged, onGoUpload, onBackHome }) {
  const [selected, setSelected] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() =>
    Math.max(START_YEAR, new Date().getFullYear())
  );
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [adminShowAll, setAdminShowAll] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() =>
    Math.max(START_YEAR, new Date().getFullYear())
  );
  const [showExample, setShowExample] = useState(false);

  const [dbItems, setDbItems] = useState([]);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);
  const pickerRef = useRef(null);
  const lastRealMonthRef = useRef(
    `${new Date().getFullYear()}-${new Date().getMonth()}`
  );

  const isAdmin = isAdminUser(session);

  // Admin: fetch all submitted requests for approve/delete panel
  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqStatus, setReqStatus] = useState("");
  const [showReqPanel, setShowReqPanel] = useState(false);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let active = true;
    supabase
      .from("artworks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) setRequests(data);
      });
    return () => { active = false; };
  }, [isAdmin, refreshKey]);

  async function toggleApproval(item) {
    if (!isAdmin || !supabase) return;
    const nextFav = !item.is_favorite;
    setRequests((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, is_favorite: nextFav } : r))
    );
    const { error } = await supabase
      .from("artworks")
      .update({ is_favorite: nextFav })
      .eq("id", item.id);
    if (error) {
      setReqStatus("Error: " + error.message);
      setRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, is_favorite: !nextFav } : r))
      );
      return;
    }
    onChanged?.();
  }

  async function handleDeleteRequest(item) {
    if (!isAdmin || !supabase) return;
    setReqLoading(true);
    setReqStatus("");
    try {
      const fileName = item.media_url?.split("/artworks-media/")[1];
      if (fileName) {
        await supabase.storage.from("artworks-media").remove([decodeURIComponent(fileName)]);
      }
      const { error } = await supabase.from("artworks").delete().eq("id", item.id);
      if (error) throw error;
      setRequests((prev) => prev.filter((r) => r.id !== item.id));
      onChanged?.();
    } catch (err) {
      setReqStatus("Delete failed: " + err.message);
    } finally {
      setReqLoading(false);
    }
  }

  // Fetch artworks for everyone — admin sees all, non-admin sees approved only
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const query = isAdmin
      ? supabase.from("artworks").select("*").order("created_at", { ascending: false })
      : supabase.from("artworks").select("*").eq("is_favorite", true).order("created_at", { ascending: false });

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
  useEffect(() => {
    function checkMonthRollover() {
      const now = new Date();
      const key = `${now.getFullYear()}-${now.getMonth()}`;
      if (key !== lastRealMonthRef.current) {
        lastRealMonthRef.current = key;
        const safeYear = Math.max(START_YEAR, now.getFullYear());
        setSelectedYear(safeYear);
        setSelectedMonth(now.getMonth());
        setPickerYear(safeYear);
      }
    }

    const timer = setInterval(checkMonthRollover, 60000);
    window.addEventListener("focus", checkMonthRollover);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", checkMonthRollover);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [pickerOpen]);

  const { years, yearMonthCounts, yearTotals } = useMemo(() => {
    const endYear = Math.max(new Date().getFullYear() + 4, START_YEAR + 4);
    const yearSet = new Set();
    for (let y = START_YEAR; y <= endYear; y++) {
      yearSet.add(y);
    }

    const ymMap = new Map();
    const yTotals = new Map();

    for (const item of dbItems) {
      const d = new Date(item.created_at);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (y < START_YEAR) continue;
      yearSet.add(y);
      if (!ymMap.has(y)) ymMap.set(y, Array(12).fill(0));
      ymMap.get(y)[m] += 1;
      yTotals.set(y, (yTotals.get(y) || 0) + 1);
    }

    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
    return { years: sortedYears, yearMonthCounts: ymMap, yearTotals: yTotals };
  }, [dbItems]);

  // Sample items only available for Admin preview
  const exampleMonthItems = useMemo(() => {
    if (!isAdmin || !showExample) return [];
    const sampleDays = [20, 14, 8, 2];
    const mm = String(selectedMonth + 1).padStart(2, "0");

    return sampleDays.map((day, idx) => {
      const base = fallbackArtworks[idx % fallbackArtworks.length];
      const dd = String(day).padStart(2, "0");
      return {
        ...base,
        id: `example-${selectedYear}-${mm}-${dd}`,
        created_at: `${selectedYear}-${mm}-${dd}T12:00:00Z`,
        src: base.image || createArtDataUrl(idx + 1, base.palette),
        media_type: "image",
        isExample: true,
      };
    });
  }, [isAdmin, showExample, selectedYear, selectedMonth]);

  const realFilteredItems = useMemo(() => {
    if (isAdmin && adminShowAll) return dbItems;
    return dbItems.filter((item) => {
      const d = new Date(item.created_at);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [dbItems, isAdmin, adminShowAll, selectedYear, selectedMonth]);

  const monthlyItems = useMemo(() => {
    const source =
      realFilteredItems.length > 0 ? realFilteredItems : exampleMonthItems;
    return [...source].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [realFilteredItems, exampleMonthItems]);

  async function toggleFavorite(e, item) {
    e.stopPropagation();
    if (!isAdmin || !supabase || item.isExample) return;

    const nextFav = !item.is_favorite;
    setDbItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_favorite: nextFav } : row))
    );

    const { error } = await supabase
      .from("artworks")
      .update({ is_favorite: nextFav })
      .eq("id", item.id);

    if (error) {
      setDbItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, is_favorite: !nextFav } : row
        )
      );
      return;
    }

    onChanged?.();
  }

  function stepMonth(delta) {
    const next = new Date(selectedYear, selectedMonth + delta, 1);
    if (next.getFullYear() < START_YEAR) return;
    setAdminShowAll(false);
    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth());
    setPickerYear(next.getFullYear());
  }

  function jumpToTodayMonth() {
    const now = new Date();
    const safeYear = Math.max(START_YEAR, now.getFullYear());
    setAdminShowAll(false);
    setSelectedYear(safeYear);
    setSelectedMonth(now.getMonth());
    setPickerYear(safeYear);
    setPickerOpen(false);
  }

  function selectYearMonth(year, monthIndex) {
    setAdminShowAll(false);
    setSelectedYear(year);
    setSelectedMonth(monthIndex);
    setPickerOpen(false);
  }

  const isAtEarliestMonth = selectedYear === START_YEAR && selectedMonth === 0;
  const activeMonthLabel = `${MONTHS_FULL[selectedMonth]} ${selectedYear}`;
  const monthCountsForPickerYear =
    yearMonthCounts.get(pickerYear) || Array(12).fill(0);

  return (
    <section id="works" className="works-page">
      <div className="gallery-topbar">
        <div>
          <p className="eyebrow">
            {isAdmin ? "Admin Overview · All Accounts" : "Monthly Archive"}
          </p>
          <h1>{isAdmin && adminShowAll ? "All Studio Uploads" : activeMonthLabel}</h1>
          <p className="gallery-subtitle">
            {!loaded
              ? "Loading archive..."
              : isAdmin && adminShowAll
              ? `Showing all ${realFilteredItems.length} uploads across every month and user.`
              : realFilteredItems.length > 0
              ? isAdmin
                ? `${realFilteredItems.length} ${
                    realFilteredItems.length === 1 ? "piece" : "pieces"
                  } from all users in ${activeMonthLabel}.`
                : `${realFilteredItems.length} ${
                    realFilteredItems.length === 1 ? "piece" : "pieces"
                  } uploaded in ${activeMonthLabel}, sorted by day.`
              : isAdmin && showExample
              ? `Previewing example uploads across different days in ${activeMonthLabel}.`
              : `0 pieces uploaded for ${activeMonthLabel}.`}
          </p>
        </div>

        <div className="works-controls">
          {isAdmin && (
            <button
              type="button"
              className={`filter-tab admin-all-btn ${adminShowAll ? "active" : ""}`}
              onClick={() => setAdminShowAll((v) => !v)}
            >
              {adminShowAll ? "By Month" : `All Uploads (${dbItems.length})`}
            </button>
          )}

          <div className="month-stepper" role="group" aria-label="Switch month">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => stepMonth(-1)}
              disabled={isAtEarliestMonth}
              aria-label="Previous month"
              title="Previous month"
            >
              ‹
            </button>

            <div className="date-picker-wrap" ref={pickerRef}>
              <button
                type="button"
                className="date-picker-trigger"
                onClick={() => {
                  setPickerYear(selectedYear);
                  setPickerOpen((v) => !v);
                }}
                aria-expanded={pickerOpen}
              >
                <span>
                  {MONTHS_SHORT[selectedMonth]} {selectedYear}
                </span>
                <span className="caret" aria-hidden="true">▾</span>
              </button>

              {pickerOpen && (
                <div
                  className="date-picker-popover"
                  role="dialog"
                  aria-label="Choose Month and Year"
                >
                  <div className="date-picker-head">
                    <strong>Select Month</strong>
                    <button
                      type="button"
                      className="date-reset-btn"
                      onClick={jumpToTodayMonth}
                    >
                      This Month
                    </button>
                  </div>

                  <div className="date-years-row">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        className={`year-pill ${pickerYear === y ? "active" : ""}`}
                        onClick={() => setPickerYear(y)}
                      >
                        <span>{y}</span>
                        {(yearTotals.get(y) || 0) > 0 && (
                          <small>{yearTotals.get(y)}</small>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="date-months-grid">
                    {MONTHS_SHORT.map((label, mIdx) => {
                      const count = monthCountsForPickerYear[mIdx];
                      const isSelected =
                        !adminShowAll &&
                        selectedYear === pickerYear &&
                        selectedMonth === mIdx;
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`month-cell ${isSelected ? "active" : ""}`}
                          onClick={() => selectYearMonth(pickerYear, mIdx)}
                        >
                          <span>{label}</span>
                          <small>{count > 0 ? count : "0"}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="stepper-btn"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
              title="Next month"
            >
              ›
            </button>
          </div>

          <button type="button" className="btn-primary" onClick={onGoUpload}>
            + Upload Work
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-requests-panel">
          <button
            type="button"
            className="admin-req-toggle"
            onClick={() => setShowReqPanel((v) => !v)}
          >
            <span>🛡 Manage Requests</span>
            <span className="admin-req-count">{requests.length} total · {requests.filter(r => !r.is_favorite).length} pending</span>
            <span className="admin-req-caret">{showReqPanel ? "▲" : "▼"}</span>
          </button>

          {showReqPanel && (
            <div className="admin-req-list">
              {reqStatus && <p className="admin-status">{reqStatus}</p>}
              {requests.length === 0 ? (
                <p className="admin-note">No requests submitted yet.</p>
              ) : (
                requests.map((item) => (
                  <div key={item.id} className="admin-row">
                    <div className="admin-row-info">
                      <div className="admin-thumb">
                        {item.media_type === "video" ? (
                          <video src={item.media_url} muted playsInline />
                        ) : (
                          <img src={item.media_url} alt={item.title} />
                        )}
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.created_at))}
                          {item.artist_name ? ` · ${item.artist_name}` : ""}
                          {item.price ? ` · ${item.price}` : ""}
                        </small>
                        <span className={`request-status-badge ${item.is_favorite ? "status-approved" : "status-pending"}`}>
                          {item.is_favorite ? "✓ Approved" : "⏳ Pending"}
                        </span>
                      </div>
                    </div>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className={`approve-btn ${item.is_favorite ? "is-approved" : ""}`}
                        onClick={() => toggleApproval(item)}
                        title={item.is_favorite ? "Revoke approval" : "Approve request"}
                      >
                        {item.is_favorite ? "Revoke" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleDeleteRequest(item)}
                        disabled={reqLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {isAdmin && showExample && realFilteredItems.length === 0 && (
        <div className="active-filter-bar">
          <span>
            <strong>Example Preview</strong> — showing how uploads from different days
            (2, 8, 14, 20) appear in <strong>{activeMonthLabel}</strong>.
          </span>
          <button type="button" onClick={() => setShowExample(false)}>
            Close example ×
          </button>
        </div>
      )}

      {!loaded ? (
        <div className="empty-month-card">
          <p>Loading artworks for {activeMonthLabel}...</p>
        </div>
      ) : monthlyItems.length === 0 ? (
        <div className="empty-month-card">
          <span className="eyebrow">{activeMonthLabel} · 0 Works</span>
          <h2>No artworks uploaded for {activeMonthLabel} yet</h2>
          <p>
            Each month starts fresh. Upload your images or videos with a date in{" "}
            {activeMonthLabel} to see them appear here.
          </p>
          {isAdmin && (
            <button
              type="button"
              className="example-link"
              onClick={() => setShowExample(true)}
            >
              Preview example with different days
            </button>
          )}
        </div>
      ) : (
        <div className="gallery-grid">
          {monthlyItems.map((item) => (
            <article
              key={item.id}
              className="art-card"
              onClick={() => setSelected(item)}
            >
              <div className="art-thumb">
                {item.media_type === "video" ? (
                  <video src={item.src} muted loop autoPlay playsInline />
                ) : (
                  <img src={item.src} alt={item.title} loading="lazy" />
                )}
                <span className="day-chip">{formatDayChip(item.created_at)}</span>
                {item.media_type === "video" && (
                  <span className="media-badge">VIDEO</span>
                )}

                {isAdmin && !item.isExample && (
                  <button
                    type="button"
                    className={`fav-btn ${item.is_favorite ? "is-fav" : ""}`}
                    onClick={(e) => toggleFavorite(e, item)}
                    aria-label={
                      item.is_favorite ? "Remove from Home favorites" : "Feature on Home"
                    }
                    title={item.is_favorite ? "Featured on Home" : "Favorite for Home"}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
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
                  <div className="art-socials" onClick={(e) => e.stopPropagation()}>
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
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelected(null)}
              aria-label="Close preview"
            >
              &times;
            </button>

            <div className="lightbox-media">
              {selected.media_type === "video" ? (
                <video src={selected.src} controls autoPlay playsInline />
              ) : (
                <img src={selected.src} alt={selected.title} />
              )}
            </div>

            <div className="lightbox-details">
              <span className="eyebrow">{formatFullDate(selected.created_at)}</span>
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

              <a
                href={`mailto:riroartdsg@gmail.com?subject=${encodeURIComponent(
                  `Inquiry: ${selected.title}`
                )}`}
                className="btn-primary lightbox-cta"
              >
                Inquire About This Piece
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
