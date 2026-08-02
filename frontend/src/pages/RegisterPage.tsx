import { useEffect, useMemo, useState } from "react";
import { FileText, ShieldCheck, UserRound, Users } from "lucide-react";
import { BrandLockup } from "../components/BrandLockup";
import type { UserRole } from "../types";

type RegisterPageProps = {
  error: string;
  onBackHome: () => void;
  onGoLogin: () => void;
  onRegister: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    customer_id?: number | null;
    phone?: string | null;
    address?: string | null;
    profile_image?: File | null;
  }) => Promise<void>;
};

export function RegisterPage({ error, onBackHome, onGoLogin, onRegister }: RegisterPageProps) {
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailError = registerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email) ? "Enter a valid email address." : "";
  const phoneError = registerForm.phone && !/^\d{10}$/.test(registerForm.phone) ? "Phone number must be exactly 10 digits." : "";
  const hasValidationErrors = Boolean(emailError || phoneError || profileImageError);
  const friendlyError = useMemo(() => {
    if (!error) return "";
    if (error.includes("Failed to fetch") || error.includes("NetworkError")) {
      return "Backend is not reachable. Start FastAPI and PostgreSQL, then try again.";
    }
    return error;
  }, [error]);

  useEffect(() => {
    const clearSavedBrowserValues = window.setTimeout(() => {
      setRegisterForm((currentForm) => ({
        ...currentForm,
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
      }));
    }, 100);

    return () => window.clearTimeout(clearSavedBrowserValues);
  }, []);

  useEffect(() => {
    if (!profileImage) {
      setProfilePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(profileImage);
    setProfilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profileImage]);

  function updateRegisterField(name: keyof typeof registerForm, rawValue: string) {
    let value = rawValue;

    if (name === "email") {
      value = rawValue.toLowerCase().replace(/\s+/g, "");
    }

    if (name === "phone") {
      value = rawValue.replace(/[^\d]/g, "").slice(0, 10);
    }

    setRegisterForm({ ...registerForm, [name]: value });
  }

  async function submitRegister() {
    if (hasValidationErrors) return;
    setIsSubmitting(true);
    try {
      await onRegister({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        role: "customer",
        phone: registerForm.phone || null,
        address: registerForm.address || null,
        profile_image: profileImage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <AuthHeader onBackHome={onBackHome} onGoLogin={onGoLogin} />
      <section className="auth-stage">
        <div className="register-info-panel">
          <p className="auth-kicker">Join HealthInsure</p>
          <h1>Insurance care starts with one account.</h1>
          <p>Create a customer account to access your policies, payments, claims, and documents.</p>
          <InfoItem icon={Users} title="For customers" text="View own policies, premiums, claims, and documents." />
          <InfoItem icon={ShieldCheck} title="For staff" text="Agent accounts are created securely by an administrator." />
        </div>

        <section className="register-card">
          <button className="text-button" onClick={onGoLogin}>← Back to Login</button>
          <h2>Create your account</h2>
          <p>Register as a customer. Staff accounts are managed by the administrator.</p>

          <label className={`upload-avatar ${profilePreview ? "has-image" : ""}`}>
            {profilePreview ? (
              <img src={profilePreview} alt="Selected profile preview" />
            ) : (
              <>
                <UserRound size={38} />
                <strong>Add profile image</strong>
                <small>JPG, PNG or WebP · max 5 MB</small>
              </>
            )}
            <span className="upload-avatar-action">{profilePreview ? "Change photo" : "Choose photo"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                if (!selectedFile) {
                  setProfileImage(null);
                  setProfileImageError("");
                  return;
                }
                if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
                  setProfileImage(null);
                  setProfileImageError("Profile image must be JPG, PNG, or WebP.");
                  return;
                }
                if (selectedFile.size > 5 * 1024 * 1024) {
                  setProfileImage(null);
                  setProfileImageError("Profile image must be 5 MB or smaller.");
                  return;
                }
                setProfileImage(selectedFile);
                setProfileImageError("");
              }}
            />
          </label>

          <div className="prime-form">
            {friendlyError ? <p className="error-message">{friendlyError}</p> : null}
            {profileImageError ? <p className="field-error centered-error">{profileImageError}</p> : null}
            <div className="customer-account-type" aria-label="Customer account registration">
              <UserRound size={19} />
              <span>
                <strong>Customer account</strong>
                <small>Public registration is available for customers only</small>
              </span>
            </div>
            <input
              autoComplete="off"
              name="healthinsure-register-email"
              type="email"
              inputMode="email"
              className={emailError ? "input-invalid" : ""}
              value={registerForm.email}
              onChange={(event) => updateRegisterField("email", event.target.value)}
              placeholder="Email"
            />
            {emailError ? <span className="field-error">{emailError}</span> : null}
            <input
              autoComplete="new-password"
              name="healthinsure-register-password"
              type="password"
              value={registerForm.password}
              onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
              placeholder="Password"
            />
            <input
              autoComplete="off"
              name="healthinsure-register-name"
              value={registerForm.name}
              onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
              placeholder="Full Name"
            />
            <input
              autoComplete="off"
              name="healthinsure-register-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={phoneError ? "input-invalid" : ""}
              value={registerForm.phone}
              onChange={(event) => updateRegisterField("phone", event.target.value)}
              placeholder="Phone Number"
            />
            {phoneError ? <span className="field-error">{phoneError}</span> : null}
            <input
              autoComplete="off"
              name="healthinsure-register-address"
              value={registerForm.address}
              onChange={(event) => setRegisterForm({ ...registerForm, address: event.target.value })}
              placeholder="Address"
            />
            <p className="form-note">
              Profile image is optional. You can add or update it later from My Account.
            </p>
            <button className="prime-submit" onClick={submitRegister} disabled={isSubmitting || hasValidationErrors}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function AuthHeader({ onBackHome, onGoLogin }: { onBackHome: () => void; onGoLogin: () => void }) {
  return (
    <header className="prime-auth-header">
      <button className="prime-brand" onClick={onBackHome}>
        <div className="prime-logo">H</div>
        <BrandLockup />
      </button>
      <nav>
        <button className="prime-outline" onClick={onBackHome}>Home</button>
        <button className="prime-blue" onClick={onGoLogin}>Login</button>
        <button className="prime-circle"><UserRound size={24} /></button>
      </nav>
    </header>
  );
}

function InfoItem({ icon: Icon, title, text }: { icon: typeof FileText; title: string; text: string }) {
  return (
    <article className="register-info-item">
      <div><Icon size={24} /></div>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </article>
  );
}
