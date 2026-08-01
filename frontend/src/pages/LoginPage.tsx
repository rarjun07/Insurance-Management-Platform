import { useEffect, useMemo, useState } from "react";
import { FileText, Lock, Mail, RotateCw, ShieldCheck, UserRound } from "lucide-react";
import { BrandLockup } from "../components/BrandLockup";

type LoginPageProps = {
  error: string;
  onBackHome: () => void;
  onGoRegister: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
};

export function LoginPage({ error, onBackHome, onGoRegister, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptcha());
  const [captcha, setCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
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
      setCaptcha("");
      setResetNotice("");
    }, 100);

    return () => window.clearTimeout(clearSavedBrowserValues);
  }, []);

  async function submitLogin() {
    if (emailError) {
      return;
    }

    if (captcha.trim().toUpperCase() !== captchaCode) {
      setCaptchaError("Captcha does not match. Please try again.");
      setCaptchaCode(generateCaptcha());
      setCaptcha("");
      return;
    }

    setCaptchaError("");
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setIsSubmitting(false);
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
                  setResetNotice("Password reset is handled by the administrator in this demo. Please contact the admin to update your password.");
                }}
              >
                Forgot password?
              </button>
            </div>
            {resetNotice ? <p className="reset-notice">{resetNotice}</p> : null}
            <label>
              <span><ShieldCheck size={16} /> Captcha</span>
              <div className="captcha-row">
                <div className="captcha-box" aria-label="Captcha code">
                  {captchaCode.split("").map((letter, index) => (
                    <strong key={`${letter}-${index}`}>{letter}</strong>
                  ))}
                </div>
                <button
                  className="captcha-refresh"
                  type="button"
                  onClick={() => {
                    setCaptchaCode(generateCaptcha());
                    setCaptcha("");
                    setCaptchaError("");
                  }}
                  aria-label="Refresh captcha"
                >
                  <RotateCw size={22} />
                </button>
                <input
                  autoComplete="off"
                  name="healthinsure-login-captcha"
                  value={captcha}
                  onChange={(event) => setCaptcha(event.target.value)}
                  placeholder="Enter captcha"
                />
              </div>
              {captchaError ? <span className="field-error">{captchaError}</span> : null}
            </label>
            <button className="prime-submit" onClick={submitLogin} disabled={isSubmitting || Boolean(emailError)}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
            <button className="otp-link" onClick={onGoRegister}>Create new account</button>
          </div>
        </section>
      </section>
    </main>
  );
}

function generateCaptcha() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");
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
