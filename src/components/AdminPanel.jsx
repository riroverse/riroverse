import { useEffect, useMemo, useRef, useState } from "react";
import { isAdminUser, supabase } from "../lib/supabase";
import AuthSection from "./AuthSection";

const todayInput = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

function normalizeHandle(raw, platform) {
  let val = raw.trim();
  if (platform === "x") {
    val = val.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i, "");
  } else {
    val = val.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "");
  }
  val = val.split(/[/?#]/)[0].replace(/^@+/, "");
  return val ? `@${val}` : "";
}

const isValidXHandle = (handle) => /^@[A-Za-z0-9_]{1,15}$/.test(handle);
const isValidTikTokHandle = (handle) => /^@[A-Za-z0-9_.]{2,24}$/.test(handle);

async function fetchUserArtworks(userId, isAdmin) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("artworks")
    .select("*")
    .order("created_at", { ascending: false });
  if (!data) return [];
  return isAdmin ? data : data.filter((row) => row.user_id === userId);
}

export default function AdminPanel({ session, onChanged, onBack }) {
  const defaultName = session?.user?.user_metadata?.full_name || "";
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(defaultName);
  const [twitterInput, setTwitterInput] = useState("");
  const [tiktokInput, setTiktokInput] = useState("");
  const [artDate, setArtDate] = useState(todayInput);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  const isAdmin = isAdminUser(session);

  useEffect(() => {
    if (!session || !supabase) return;
    let active = true;

    fetchUserArtworks(session.user.id, isAdmin).then((rows) => {
      if (active) setItems(rows);
    });

    return () => {
      active = false;
    };
  }, [session, isAdmin]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!session) {
    return (
      <AuthSection
        initialMode="signin"
        subtitle="Sign in or create an account to upload images or videos to the Riroverse archive."
        onSuccess={onBack}
        onBack={onBack}
      />
    );
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setStatus("Please choose an image or video file first.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatus("Maximum file size is 50 MB on the Supabase free tier.");
      return;
    }

    const formattedX = normalizeHandle(twitterInput, "x");
    const formattedTikTok = normalizeHandle(tiktokInput, "tiktok");

    if (!isValidXHandle(formattedX)) {
      setStatus("Invalid X (Twitter) handle. Use format @username (1–15 letters, numbers, or _).");
      return;
    }
    if (!isValidTikTokHandle(formattedTikTok)) {
      setStatus("Invalid TikTok handle. Use format @username (2–24 letters, numbers, _ or .).");
      return;
    }

    setLoading(true);
    setStatus("Uploading to archive...");

    try {
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${Date.now()}-${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from("artworks-media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("artworks-media")
        .getPublicUrl(filePath);

      const chosenIso = artDate
        ? `${artDate}T12:00:00.000Z`
        : new Date().toISOString();

      const payload = {
        title,
        artist_name: artistName.trim(),
        twitter_handle: formattedX,
        tiktok_handle: formattedTikTok,
        category: "Archive",
        price: price || null,
        description: description || null,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        created_at: chosenIso,
        ...(isAdmin ? { is_favorite: isFavorite } : {}),
      };

      const { error: insertError } = await supabase.from("artworks").insert(payload);
      if (insertError) throw insertError;

      setTitle("");
      setTwitterInput("");
      setTiktokInput("");
      setArtDate(todayInput());
      setPrice("");
      setDescription("");
      setIsFavorite(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus("Published to your Works archive.");
      setItems(await fetchUserArtworks(session.user.id, isAdmin));
      onChanged?.();
    } catch (err) {
      setStatus("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(item) {
    if (!isAdmin) return;
    const nextFav = !item.is_favorite;
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_favorite: nextFav } : row))
    );
    const { error } = await supabase
      .from("artworks")
      .update({ is_favorite: nextFav })
      .eq("id", item.id);

    if (error) {
      setStatus("Could not update favorite: " + error.message);
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, is_favorite: !nextFav } : row
        )
      );
      return;
    }
    onChanged?.();
  }

  async function handleDelete(item) {
    setLoading(true);
    setStatus("");
    try {
      const fileName = item.media_url.split("/artworks-media/")[1];
      if (fileName) {
        await supabase.storage
          .from("artworks-media")
          .remove([decodeURIComponent(fileName)]);
      }
      const { error } = await supabase.from("artworks").delete().eq("id", item.id);
      if (error) throw error;
      setItems(await fetchUserArtworks(session.user.id, isAdmin));
      onChanged?.();
    } catch (err) {
      setStatus("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const xPreview = normalizeHandle(twitterInput, "x");
  const tiktokPreview = normalizeHandle(tiktokInput, "tiktok");

  return (
    <section className="upload-page">
      <div className="upload-page-head">
        <div>
          <p className="eyebrow">Studio Desk</p>
          <h1>Upload Image or Video</h1>
          <p className="gallery-subtitle">
            Publish your work with creator name, X &amp; TikTok handles, and exact release
            date.
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={onBack}>
          ← View Works Archive
        </button>
      </div>

      <div className="upload-workspace">
        <div className="admin-box">
          <div className="admin-top">
            <div>
              <h3>New Archive Entry</h3>
              <p className="admin-note">Signed in as {session.user.email}</p>
            </div>
          </div>

          <div className="upload-split">
            <form className="admin-fields" onSubmit={handleUpload}>
              <label className="field">
                <span>Photo or Video</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span>Artwork Title</span>
                  <input
                    type="text"
                    placeholder="e.g. Dusk in the Studio"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Creator / Your Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Riro"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>X (Twitter) Account</span>
                  <input
                    type="text"
                    placeholder="@username"
                    value={twitterInput}
                    onChange={(e) => setTwitterInput(e.target.value)}
                    onBlur={() => xPreview && setTwitterInput(xPreview)}
                    required
                  />
                  <small className="field-hint">
                    Format: {xPreview || "@username"} (auto-links to X app)
                  </small>
                </label>

                <label className="field">
                  <span>TikTok Account</span>
                  <input
                    type="text"
                    placeholder="@username"
                    value={tiktokInput}
                    onChange={(e) => setTiktokInput(e.target.value)}
                    onBlur={() => tiktokPreview && setTiktokInput(tiktokPreview)}
                    required
                  />
                  <small className="field-hint">
                    Format: {tiktokPreview || "@username"} (auto-links to TikTok app)
                  </small>
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>Date (Day / Month / Year)</span>
                  <input
                    type="date"
                    value={artDate}
                    onChange={(e) => setArtDate(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Price (Optional)</span>
                  <input
                    type="text"
                    placeholder="e.g. $45"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                <span>Notes / Medium (Optional)</span>
                <textarea
                  rows="3"
                  placeholder="Dimensions, medium, or story behind the piece..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              {isAdmin && (
                <label className="fav-checkbox">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                  />
                  <span>Favorite ♥ (Feature in the 5 Home reference slots)</span>
                </label>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Uploading..." : "Publish to Works"}
              </button>
              {status && <p className="admin-status">{status}</p>}
            </form>

            <div className="upload-preview-box">
              <span className="preview-label">Preview</span>
              <div className="upload-preview-frame">
                {previewUrl ? (
                  file?.type.startsWith("video/") ? (
                    <video src={previewUrl} controls muted playsInline />
                  ) : (
                    <img src={previewUrl} alt="Selected artwork preview" />
                  )
                ) : (
                  <p>Choose an image or video to preview how it frames in Works.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-box">
          <div className="admin-list-head">
            <h3>
              {isAdmin
                ? `All Studio Uploads (${items.length})`
                : `Your Published Timeline (${items.length})`}
            </h3>
            {isAdmin && <span className="admin-badge">Admin · Full Access</span>}
          </div>
          {items.length === 0 ? (
            <p className="admin-note">No artworks uploaded yet.</p>
          ) : (
            <div className="admin-list">
              {items.map((item) => (
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
                        {formatDate(item.created_at)}
                        {item.artist_name ? ` · ${item.artist_name}` : ""}
                        {item.twitter_handle ? ` · X ${item.twitter_handle}` : ""}
                        {item.tiktok_handle ? ` · TikTok ${item.tiktok_handle}` : ""}
                        {item.price ? ` · ${item.price}` : ""}
                      </small>
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    {isAdmin && (
                      <button
                        type="button"
                        className={`fav-btn-inline ${item.is_favorite ? "is-fav" : ""}`}
                        onClick={() => toggleFavorite(item)}
                        aria-label={
                          item.is_favorite ? "Unfavorite from Home" : "Favorite for Home"
                        }
                        title={
                          item.is_favorite ? "Featured on Home" : "Feature on Home"
                        }
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleDelete(item)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
