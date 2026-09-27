import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LockKeyhole, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import api from "./lib/api";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/login", {
        email,
        password,
      });

      // The browser receives the HTTP-only cookie automatically.
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
  console.error("Admin login error:", err);

  if (axios.isAxiosError(err)) {
    console.error("API response:", err.response?.data);
    console.error("HTTP status:", err.response?.status);
    console.error("Request URL:", err.config?.url);

    setError(
      err.response?.data?.message ||
        err.message ||
        "Unable to sign in. Please try again.",
    );
  } else {
    setError("An unexpected error occurred.");
  }
} finally {
  setLoading(false);
}
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <ShieldCheck size={27} />
          </div>
          <span>RefundIQ</span>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">ADMINISTRATOR PORTAL</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage refund requests and review decisions.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label htmlFor="admin-email">Email address</label>
          <div className="login-input-wrapper">
            <Mail size={18} />
            <input
              id="admin-email"
              type="email"
              placeholder="admin@refundiq.local"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </div>

          <label htmlFor="admin-password">Password</label>
          <div className="login-input-wrapper">
            <LockKeyhole size={18} />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={128}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to dashboard"}
          </button>
        </form>

        <div className="login-security-note">
          <LockKeyhole size={15} />
          <span>Secure administrator access</span>
        </div>

        <a className="login-back-link" href="/">
          ← Back to customer refund portal
        </a>
      </section>
    </main>
  );
}
