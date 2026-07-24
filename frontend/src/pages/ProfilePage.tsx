import type { AppUser } from "../types";
import { StatusBadge } from "../components/StatusBadge";

type ProfilePageProps = {
  user: AppUser;
  onLogout: () => void;
};

export function ProfilePage({ user, onLogout }: ProfilePageProps) {
  return (
    <section className="panel page-panel">
      <div className="profile-header">
        <div className="profile-avatar">{user.name.slice(0, 2).toUpperCase()}</div>
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
          <strong>{user.role}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{user.department}</strong>
        </div>
        <div>
          <span>Customer link</span>
          <strong>{user.customerId ?? "Not required"}</strong>
        </div>
        <div>
          <span>Permissions</span>
          <strong>{user.role === "Customer" ? "Own records only" : "Operational access"}</strong>
        </div>
      </div>

      <button className="danger-button profile-logout" onClick={onLogout}>
        Logout
      </button>
    </section>
  );
}
