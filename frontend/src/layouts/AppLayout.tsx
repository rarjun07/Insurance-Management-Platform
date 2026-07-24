import { useState, type ReactNode } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppUser, UserRole } from "../types";

export type PageKey =
  | "dashboard"
  | "customers"
  | "policies"
  | "premiums"
  | "claims"
  | "documents"
  | "reports"
  | "settings"
  | "profile";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Home, roles: ["Admin", "Insurance Agent", "Customer"] },
  { key: "customers", label: "Customers", icon: Users, roles: ["Admin", "Insurance Agent"] },
  { key: "policies", label: "Policies", icon: ShieldCheck, roles: ["Admin", "Insurance Agent", "Customer"] },
  { key: "premiums", label: "Premiums", icon: WalletCards, roles: ["Admin", "Insurance Agent", "Customer"] },
  { key: "claims", label: "Claims", icon: ClipboardList, roles: ["Admin", "Insurance Agent", "Customer"] },
  { key: "documents", label: "Documents", icon: FileText, roles: ["Admin", "Insurance Agent", "Customer"] },
  { key: "reports", label: "Reports", icon: BarChart3, roles: ["Admin"] },
  { key: "settings", label: "Settings", icon: Settings, roles: ["Admin"] },
] satisfies Array<{ key: PageKey; label: string; icon: LucideIcon; roles: UserRole[] }>;

type AppLayoutProps = {
  activePage: PageKey;
  pageTitle: string;
  currentUser: AppUser;
  children: ReactNode;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
};

export function AppLayout({
  activePage,
  pageTitle,
  currentUser,
  children,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">H</div>
            <div>
              <p className="brand-title">HealthInsure</p>
              <p className="brand-subtitle">Management</p>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span>Current workspace</span>
              <strong>Health policies</strong>
            </div>
          </div>

          <p className="sidebar-section-label">Overview</p>

          <nav className="nav-list" aria-label="Main navigation">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`nav-item ${item.key === activePage ? "active" : ""}`}
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user-card">
            <div className="workspace-icon ready">
              <ShieldCheck size={18} />
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role}</span>
            </div>
          </div>
          <button className="sidebar-profile-button" onClick={() => onNavigate("profile")}>
            My Account
          </button>
          <button className="sidebar-logout-button" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Health Insurance Platform</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-actions">
            <span className="badge">{currentUser.role}</span>
            <div className="profile-menu-wrap">
              <button
                className="user-pill clickable"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              >
                {currentUser.name.slice(0, 2).toUpperCase()}
              </button>
              {isProfileMenuOpen ? (
                <div className="profile-menu">
                  <div className="profile-menu-header">
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.email}</span>
                  </div>
                  <button onClick={() => onNavigate("profile")}>My Account</button>
                  <button onClick={() => onNavigate("profile")}>Update Profile</button>
                  <button onClick={() => onNavigate("settings")}>Settings</button>
                  <button className="danger-text" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
