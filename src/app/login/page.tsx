"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, errorMessage } from "@/lib/apiClient";
import { getSetupStatus, login } from "@/lib/userApi";
import { USER_LIMITS } from "@/types/user";

type LoginErrors = Partial<Record<"email" | "password", string>>;

// Where to go after login: the page the user was trying to open (e.g. a
// pasted ticket link). Only same-site paths are accepted.
function afterLoginPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/tickets";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(afterLoginPath());
      return;
    }
    getSetupStatus()
      .then((s) => s.needed && router.replace("/setup"))
      .catch(() => {});
  }, [isLoading, user, router]);

  async function handleLogin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation: LoginErrors = {};
    if (email.trim() === "") validation.email = "Email is required.";
    if (password === "") validation.password = "Password is required.";
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      await refresh();
      router.replace(afterLoginPath());
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(errorMessage(err, "Could not log in."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || user) return <p className="reply-empty">Loading...</p>;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2 className="page-title">Login</h2>
        <p className="auth-subtitle">Log in with your email and password.</p>

        {error && <p className="alert-error" role="alert">{error}</p>}

        <form onSubmit={handleLogin} noValidate>
          <div className="form-fields">
            <div>
              <label htmlFor="login-email" className="form-label">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                maxLength={USER_LIMITS.email}
                onChange={(e) => setEmail(e.target.value)}
                className={`form-input ${errors.email ? "form-input-error" : ""}`}
              />
              {errors.email && <p className="form-error" role="alert">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                maxLength={USER_LIMITS.passwordMax}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input ${errors.password ? "form-input-error" : ""}`}
              />
              {errors.password && <p className="form-error" role="alert">{errors.password}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-submit btn-block">
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
