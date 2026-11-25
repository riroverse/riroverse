import { useEffect, useMemo, useRef, useState } from "react";
import { isAdminUser, supabase } from "../lib/supabase";
import AuthSection from "./AuthSection";

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

const todayInput = () => new Date().toISOString().slice(0, 10);

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

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  const isAdmin = isAdminUser(session);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      onChanged?.();
    } catch (err) {
      setStatus("Upload failed: " + err.message);
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
          <h1>Submit a Request</h1>
          <p className="gallery-subtitle">
            Upload your work and we'll review it. You can track the approval status below.
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={onBack}>
          ← Back to Home
        </button>
      </div>

      <div className="upload-workspace">
        <div className="admin-box">
          <div className="admin-top">
            <div>
              <h3>New Request</h3>
              <p className="admin-note">{session ? `Signed in as ${session.user.email}` : "Sign in to submit a request"}</p>
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
                  <span>Mark as Approved on submit</span>
                </label>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
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
                  <p>Choose an image or video to preview.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
