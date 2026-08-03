import { useEffect, useMemo, useState } from "react";
import { FileText, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { BrandLockup } from "../components/BrandLockup";
import { requestPasswordReset, resetPassword } from "../services/api";

type LoginPageProps = {
  error: string;
  onBackHome: () => void;
  onGoRegister: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  initialEmail?: string;
};

export function LoginPage({ error, onBackHome, onGoRegister, onLogin, initialEmail = "" }: LoginPageProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email address." : "";
  const friendlyError = useMemo(() => {
    if (!error) return "";
    if (error.includes("Failed to fetch") || error.includes("NetworkError")) {
      return "Backend is not reachable. Start FastAPI and PostgreSQL, then try again.";
    }
    return error;
  }, [error]);

  useEffect(() => {
    const clearSavedBrowserValues = window.setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 100);

    return () => window.clearTimeout(clearSavedBrowserValues);
  }, []);

  async function submitLogin() {
    if (emailError) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitResetRequest() {
    const resetEmailError = resetEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)
      ? "Enter a valid email address."
      : "";
    if (!resetEmail || resetEmailError) {
      setResetError(resetEmailError || "Enter your registered email address.");
      return;
    }

    setIsResetSubmitting(true);
    setResetError("");
    setResetMessage("");
    try {
      const response = await requestPasswordReset(resetEmail);
      setResetMessage(response.message);
      setResetToken(response.reset_token ?? "");
    } catch (resetRequestError) {
      setResetError(resetRequestError instanceof Error ? resetRequestError.message : "Could not start password reset.");
    } finally {
      setIsResetSubmitting(false);
    }
  }

  async function submitNewPassword() {
    if (!resetToken) {
      setResetError("Password reset link is not available. Request a new reset first.");
      return;
    }
    if (resetPasswordValue.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }

    setIsResetSubmitting(true);
    setResetError("");
    try {
      const response = await resetPassword(resetToken, resetPasswordValue);
      setResetMessage(response.message);
      setPassword("");
      setResetPasswordValue("");
      setResetToken("");
    } catch (resetConfirmError) {
      setResetError(resetConfirmError instanceof Error ? resetConfirmError.message : "Could not update password.");
    } finally {
      setIsResetSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <AuthHeader onBackHome={onBackHome} onGoRegister={onGoRegister} mode="login" />
      <section className="auth-stage login-stage">
        <div className="auth-copy">
          <p className="auth-kicker">Secure Access</p>
          <h1>
            Welcome back to <span>HealthInsure</span>
          </h1>
          <p>Sign in to manage policies, premiums, claims, documents, and insurance operations.</p>
          <div className="auth-feature-row">
            <AuthFeature icon={ShieldCheck} title="Policy control" text="Create, renew, cancel, and review health policies." />
            <AuthFeature icon={Lock} title="Secure login" text="JWT backend authentication protects dashboard access." />
            <AuthFeature icon={FileText} title="Smart workspace" text="Open your permitted insurance workspace automatically." />
          </div>
        </div>

        <section className="prime-auth-card">
          <div className="auth-avatar">
            <UserRound size={42} />
          </div>
          <h2>HealthInsure</h2>
          <p>Insurance management platform</p>

          <div className="prime-form">
            <h3>Welcome back</h3>
            <p className="form-note">Enter your registered email and password. The system opens your correct dashboard automatically.</p>
            {friendlyError ? <p className="error-message">{friendlyError}</p> : null}
            <label>
              <span><Mail size={16} /> Email ID</span>
              <input
                autoComplete="off"
                name="healthinsure-login-email"
                type="email"
                inputMode="email"
                className={emailError ? "input-invalid" : ""}
                value={email}
                onChange={(event) => setEmail(event.target.value.toLowerCase().replace(/\s+/g, ""))}
                placeholder="Enter email address"
              />
              {emailError ? <span className="field-error">{emailError}</span> : null}
            </label>
            <label>
              <span><Lock size={16} /> Password</span>
              <input
                autoComplete="new-password"
                name="healthinsure-login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
            </label>
            <div className="login-help-row">
              <button
                className="forgot-password-link"
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetPasswordValue("");
                  setResetToken("");
                  setResetMessage("");
                  setResetError("");
                  setIsResetOpen(true);
                }}
              >
                Forgot password?
              </button>
            </div>
            <button className="prime-submit" onClick={submitLogin} disabled={isSubmitting || Boolean(emailError)}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
            <button className="otp-link" onClick={onGoRegister}>Create new account</button>
          </div>
        </section>
      </section>
      {isResetOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
          <section className="modal-card reset-password-modal">
            <div className="modal-header">
              <div>
                <p className="auth-kicker">Account recovery</p>
                <h2 id="reset-password-title">Reset password</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setIsResetOpen(false)}>
                Close
              </button>
            </div>

            <div className="modal-form">
              <label>
                <span><Mail size={16} /> Registered email</span>
                <input
                  autoComplete="email"
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value.toLowerCase().replace(/\s+/g, ""))}
                  placeholder="Enter registered email"
                />
              </label>
              <button className="secondary-button" type="button" onClick={submitResetRequest} disabled={isResetSubmitting}>
                {isResetSubmitting ? "Checking..." : "Send reset link"}
              </button>

              {resetToken ? (
                <>
                  <label>
                    <span><Lock size={16} /> New password</span>
                    <input
                      autoComplete="new-password"
                      type="password"
                      value={resetPasswordValue}
                      onChange={(event) => setResetPasswordValue(event.target.value)}
                      placeholder="Enter new password"
                    />
                  </label>
                  <button className="prime-submit compact-submit" type="button" onClick={submitNewPassword} disabled={isResetSubmitting}>
                    {isResetSubmitting ? "Updating..." : "Update password"}
                  </button>
                </>
              ) : null}

              {resetMessage ? <p className="success-message">{resetMessage}</p> : null}
              {resetError ? <p className="error-message">{resetError}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function AuthHeader({ onBackHome, onGoRegister, mode }: { onBackHome: () => void; onGoRegister: () => void; mode: "login" | "register" }) {
  return (
    <header className="prime-auth-header">
      <button className="prime-brand" onClick={onBackHome}>
        <div className="prime-logo">H</div>
        <BrandLockup />
      </button>
      <nav>
        <button className="prime-outline" onClick={onBackHome}>Home</button>
        <button className="prime-blue" onClick={onGoRegister}>{mode === "login" ? "Register" : "Login"}</button>
        <button className="prime-circle"><UserRound size={24} /></button>
      </nav>
    </header>
  );
}

function AuthFeature({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <article>
      <div><Icon size={26} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
