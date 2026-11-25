import { useEffect, useMemo, useState } from "react";
import { artworks as fallbackArtworks } from "../data/artworks";
import { createArtDataUrl } from "../utils/artPlaceholder";
import { supabase } from "../lib/supabase";

const formatFullDate = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

export default function FeaturedHome({ session, refreshKey, onOpenWorks, onOpenAuth }) {
  const [favorites, setFavorites] = useState([]);
  const [selected, setSelected] = useState(null);

  const sampleFive = useMemo(
    () =>
      fallbackArtworks.slice(0, 5).map((item, idx) => ({
        ...item,
        src: item.image || createArtDataUrl(idx + 1, item.palette),
        media_type: "image",
        created_at: item.date,
      })),
    []
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase
      .from("artworks")
      .select("*")
      .eq("is_favorite", true)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) {
          setFavorites(
            data.map((row) => ({
              ...row,
              src: row.media_url,
            }))
          );
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!selected) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected]);

  const items = favorites.length > 0 ? favorites : sampleFive;
  const isShowingUploaded = favorites.length > 0;

  return (
    <section id="featured" className="featured-section">
      <div className="gallery-topbar">
        <div>
          <p className="eyebrow">Curated Reference</p>
          <h2>Featured Works</h2>
          <p className="gallery-subtitle">
            {isShowingUploaded
              ? "Hand-picked studio favorites from the archive."
              : "Five sample works for reference—mark uploaded pieces with ♥ to feature them here."}
          </p>
        </div>

        {session ? (
          <button type="button" className="btn-outline" onClick={onOpenWorks}>
            View Full Works →
          </button>
        ) : (
          <button type="button" className="btn-outline" onClick={onOpenWorks}>
            View Full Works →
          </button>
        )}
      </div>

      <div className={`featured-grid count-${items.length}`}>
        {items.map((item, idx) => (
          <article
            key={item.id}
            className={`art-card ${idx === 0 && items.length === 5 ? "featured-lead" : ""}`}
            onClick={() => setSelected(item)}
          >
            <div className="art-thumb">
              {item.media_type === "video" ? (
                <video src={item.src} muted loop autoPlay playsInline />
              ) : (
                <img src={item.src} alt={item.title} loading="lazy" />
              )}
              {item.media_type === "video" && <span className="media-badge">VIDEO</span>}
              <span className="fav-pill" title="Featured Favorite" aria-label="Favorite">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
              <span className="art-hover-label">View Piece</span>
            </div>

            <div className="art-meta">
              <div className="art-meta-top">
                <h4>{item.title}</h4>
                {item.price && <span className="art-price">{item.price}</span>}
              </div>
              <div className="art-meta-sub">
                <time dateTime={item.created_at}>{formatFullDate(item.created_at)}</time>
                {item.artist_name && <span>by {item.artist_name}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

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
                  "Featured studio work from Riroverse. Sign in to browse the full chronological archive."}
              </p>

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
