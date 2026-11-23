import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { createArtDataUrl } from "../utils/artPlaceholder";

export default function AuthSection({
  initialMode = "signin",
  subtitle,
  onSuccess,
  onBack,
}) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const showcaseArt = useMemo(
    () => createArtDataUrl(2, ["#9E5A38", "#3B281E", "#E6D7C3"]),
    []
  );

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrorMsg("");
    setSuccessMsg("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) return;

    setErrorMsg("");
    setSuccessMsg("");

    if (mode === "signup") {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setPassword("");
        onSuccess?.(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          onSuccess?.(data.session);
        } else {
          setSuccessMsg(
            "Account created! Check your email inbox to confirm your address, then sign in."
          );
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        {/* Left editorial studio panel */}
        <aside className="auth-aside">
          <div>
            <span className="auth-badge">Riroverse Studio Access</span>
            <h2>
              Curate, publish, and share your <em>visual world</em>.
            </h2>
            <p className="auth-aside-copy">
              {subtitle ||
                "Sign in or create an account to publish artworks, attach your X & TikTok profiles, and manage your chronological archive."}
            </p>
          </div>

          <div className="auth-aside-frame">
            <img src={showcaseArt} alt="Riroverse featured composition" />
            <div className="auth-aside-meta">
              <span>STUDIO EDITION</span>
              <strong>Earth &amp; Form Archive</strong>
            </div>
          </div>

          <ul className="auth-perks">
            <li>Chronological archive organized by day, month &amp; year</li>
            <li>Direct image &amp; video uploads up to 50 MB</li>
            <li>Verified X &amp; TikTok creator attribution on every piece</li>
          </ul>
        </aside>

        {/* Right form panel */}
        <div className="auth-form-panel">
          <div className="auth-form-top">
            {onBack && (
              <button type="button" className="auth-back-link" onClick={onBack}>
                ← Back to Home
              </button>
            )}
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`auth-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-heading">
            <h1>{mode === "signin" ? "Welcome back" : "Create your studio account"}</h1>
            <p>
              {mode === "signin"
                ? "Enter your credentials to access your studio & upload desk."
                : "Join Riroverse to publish artworks and link your X & TikTok."}
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <p className="admin-note">
              Supabase is not configured yet. Fill in <code>.env.local</code> and restart{" "}
              <code>npm run dev</code>.
            </p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <label className="field">
                  <span>Full / Creator Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Riro"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </label>
              )}

              <label className="field">
                <span>Email Address</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      mode === "signup" ? "At least 6 characters" : "Enter your password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {mode === "signup" && (
                <label className="field">
                  <span>Confirm Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}

              {errorMsg && <p className="auth-alert auth-alert-error">{errorMsg}</p>}
              {successMsg && (
                <p className="auth-alert auth-alert-success">{successMsg}</p>
              )}

              <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                {loading
                  ? mode === "signin"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          )}

          <p className="auth-switch-note">
            {mode === "signin" ? (
              <>
                New to Riroverse?{" "}
                <button type="button" onClick={() => switchMode("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("signin")}>
                  Sign in instead
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
