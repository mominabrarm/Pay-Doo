import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/paydoo";
import { setAuthSession, getAuthToken, ApiError } from "../api/client";
import { Logo } from "../components/Logo";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (getAuthToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Client-side password rules for immediate user feedback
  const hasMinLength = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasSpecial;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "register" && !isPasswordValid) {
      setError(
        "Password must be more than 8 characters and contain at least one uppercase letter, one lowercase letter, and one special character."
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        await api.register({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        });

        // After registration, automatically log in
        const tokenData = await api.login({
          email: email.trim(),
          password,
        });

        setAuthSession(tokenData.access_token, tokenData.user);
        navigate("/dashboard", { replace: true });
      } else {
        const tokenData = await api.login({
          email: email.trim(),
          password,
        });

        setAuthSession(tokenData.access_token, tokenData.user);

        // Retrieve redirect target if present
        const state = location.state as { from?: { pathname: string } } | undefined;
        const redirectPath = state?.from?.pathname || "/dashboard";
        navigate(redirectPath, { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please verify your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Reserved space for future branding / logo redesign */}
        <div className="auth-brand-placeholder">
          <Link to="/" className="brand" style={{ display: "inline-flex", justifyContent: "center", textDecoration: "none" }}>
            <Logo height={36} alt="PayDoo" />
          </Link>
          <span className="auth-subtitle">
            {mode === "login" ? "Sign in to access your operations dashboard" : "Create a customer portal account"}
          </span>
        </div>

        {error && <div className="flash error">{error}</div>}
        {successMessage && <div className="flash success">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <label className="field">
              <span>Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                disabled={loading}
              />
            </label>
          )}

          <label className="field">
            <span>Email Address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={loading}
              autoComplete="email"
            />
          </label>

          <label className="field">
            <div className="field-label-split">
              <span>Password</span>
              <button
                type="button"
                className="toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {/* Real-time password requirement checklist (visible during typing or registration) */}
          {mode === "register" && (
            <div className="password-checklist">
              <span className="checklist-title">Password requirements:</span>
              <ul>
                <li className={hasMinLength ? "met" : ""}>Over 8 characters</li>
                <li className={hasUpper ? "met" : ""}>At least one uppercase letter (A-Z)</li>
                <li className={hasLower ? "met" : ""}>At least one lowercase letter (a-z)</li>
                <li className={hasSpecial ? "met" : ""}>At least one special character (!@#$%^&*)</li>
              </ul>
            </div>
          )}

          <div className="auth-actions">
            <button type="submit" className="button submit-btn" disabled={loading}>
              {loading
                ? mode === "login"
                  ? "Authenticating..."
                  : "Creating account..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </div>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <p>
              Don't have an account yet?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Register
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        <div className="auth-footer-nav">
          <Link to="/" className="back-link">
            ← Return to Pay-Doo Home
          </Link>
        </div>
      </div>
    </div>
  );
}
