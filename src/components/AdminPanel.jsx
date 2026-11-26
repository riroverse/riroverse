import { useState } from "react";
import { isAdminUser, supabase } from "../lib/supabase";

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
  const [description, setDescription] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const isAdmin = isAdminUser(session);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setStatus("Supabase is not configured yet.");
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
    setStatus("Submitting request...");

    try {
      const chosenIso = artDate
        ? `${artDate}T12:00:00.000Z`
        : new Date().toISOString();

      const payload = {
        title: title.trim(),
        artist_name: artistName.trim(),
        twitter_handle: formattedX,
        tiktok_handle: formattedTikTok,
        category: "Archive",
        price: null,
        description: description.trim() || null,
        media_url: "",
        media_type: "image",
        created_at: chosenIso,
        ...(isAdmin ? { is_favorite: isFavorite } : {}),
      };

      const { error: insertError } = await supabase.from("artworks").insert(payload);
      if (insertError) throw insertError;

      setTitle("");
      setTwitterInput("");
      setTiktokInput("");
      setArtDate(todayInput());
      setDescription("");
      setIsFavorite(false);
      setStatus("Request submitted successfully.");
      onChanged?.();
    } catch (err) {
      setStatus("Submit failed: " + err.message);
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
            Share your request details below and we&apos;ll review it.
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={onBack}>
          ← Back to Home
        </button>
      </div>

      <div className="upload-workspace">
        <div className="admin-box request-box-single">
          <div className="admin-top">
            <div>
              <h3>New Request</h3>
              <p className="admin-note">
                {session
                  ? `Signed in as ${session.user.email}`
                  : "Fill in the form below to submit a request"}
              </p>
            </div>
          </div>

          <form className="admin-fields request-form-single" onSubmit={handleSubmit}>
            <div className="field-row field-row-3">
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

              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={artDate}
                  onChange={(e) => setArtDate(e.target.value)}
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

            <label className="field">
              <span>Description / Notes</span>
              <textarea
                rows="3"
                placeholder="Tell us about the idea, style, medium, or details behind your request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="request-submit-row">
              {isAdmin ? (
                <label className="fav-checkbox">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                  />
                  <span>Mark as Approved on submit</span>
                </label>
              ) : (
                <span />
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>

            {status && <p className="admin-status">{status}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
