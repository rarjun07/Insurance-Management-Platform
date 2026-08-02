import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";

import { StatusBadge } from "../components/StatusBadge";
import { getMediaUrl } from "../services/api";
import type { AppUser, Customer } from "../types";

type ProfilePageProps = {
  user: AppUser;
  customer: Customer | null;
  onLogout: () => void;
  onSave: (payload: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    address?: string;
    profile_image?: File | null;
  }) => Promise<void>;
};

export function ProfilePage({ user, customer, onLogout, onSave }: ProfilePageProps) {
  const [values, setValues] = useState({
    name: user.name,
    email: user.email,
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    password: "",
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const profileImageUrl = getMediaUrl(user.profile_image_url);
  const visibleProfileImage = profilePreview || profileImageUrl;

  const roleLabel = user.role === "admin" ? "Admin" : user.role === "agent" ? "Agent" : "Customer";
  const emailError = values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? "Enter a valid email address." : "";
  const phoneError = values.phone && !/^\d{10}$/.test(values.phone) ? "Phone number must be exactly 10 digits." : "";
  const passwordError = values.password && values.password.length < 8 ? "Password must be at least 8 characters." : "";
  const hasValidationErrors = Boolean(emailError || phoneError || passwordError || profileImageError);
  const permissionsLabel = useMemo(() => {
    if (user.role === "customer") return "Own records only";
    if (user.role === "agent") return "Operational modules";
    return "Full platform access";
  }, [user.role]);

  useEffect(() => {
    if (!profileImage) {
      setProfilePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(profileImage);
    setProfilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profileImage]);

  async function submitProfile() {
    if (hasValidationErrors) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await onSave({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
        password: values.password || undefined,
        profile_image: profileImage,
      });
      setValues((currentValues) => ({ ...currentValues, password: "" }));
      setProfileImage(null);
      setProfileImageError("");
      setSuccessMessage("Profile updated successfully.");
    } catch (caughtError) {
      setErrorMessage(caughtError instanceof Error ? caughtError.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel page-panel">
      <div className="profile-header">
        <div className={`profile-avatar ${visibleProfileImage ? "has-profile-image" : ""}`}>
          {visibleProfileImage ? (
            <img src={visibleProfileImage} alt={`${user.name} profile`} />
          ) : (
            user.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <p className="eyebrow">Signed-in profile</p>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
        <StatusBadge status="Active" />
      </div>

      <div className="settings-grid">
        <div>
          <span>Role</span>
          <strong>{roleLabel}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{user.role === "customer" ? "Customer Portal" : "Operations"}</strong>
        </div>
        <div>
          <span>Customer link</span>
          <strong>{user.customer_id ?? "Not required"}</strong>
        </div>
        <div>
          <span>Permissions</span>
          <strong>{permissionsLabel}</strong>
        </div>
      </div>

      <div className="modal-form profile-form">
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}
        {profileImageError ? <p className="field-error">{profileImageError}</p> : null}

        <label className={`upload-avatar profile-image-picker ${visibleProfileImage ? "has-image" : ""}`}>
          {visibleProfileImage ? (
            <img src={visibleProfileImage} alt="Selected profile preview" />
          ) : (
            <>
              <UserRound size={38} />
              <strong>Profile image</strong>
              <small>JPG, PNG or WebP · max 5 MB</small>
            </>
          )}
          <span className="upload-avatar-action">{visibleProfileImage ? "Change photo" : "Choose photo"}</span>
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

        <label>
          Full Name
          <input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        </label>

        <label>
          Email
          <input
            className={emailError ? "input-invalid" : ""}
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value.toLowerCase().replace(/\s+/g, "") })}
          />
          {emailError ? <span className="field-error">{emailError}</span> : null}
        </label>

        {user.role === "customer" ? (
          <>
            <label>
              Phone
              <input
                className={phoneError ? "input-invalid" : ""}
                inputMode="numeric"
                maxLength={10}
                value={values.phone}
                onChange={(event) => setValues({ ...values, phone: event.target.value.replace(/[^\d]/g, "").slice(0, 10) })}
              />
              {phoneError ? <span className="field-error">{phoneError}</span> : null}
            </label>

            <label>
              Address
              <input value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} />
            </label>
          </>
        ) : null}

        <label>
          New Password
          <input
            className={passwordError ? "input-invalid" : ""}
            type="password"
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            placeholder="Leave blank to keep current password"
          />
          {passwordError ? <span className="field-error">{passwordError}</span> : null}
        </label>

        <div className="button-row">
          <button className="primary-button" disabled={isSaving || hasValidationErrors} onClick={submitProfile}>
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
          <button className="danger-button" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </section>
  );
}
