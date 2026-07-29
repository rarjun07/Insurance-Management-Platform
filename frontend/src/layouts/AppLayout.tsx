import { useState, type ReactNode } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  Home,
  ListChecks,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLockup } from "../components/BrandLockup";
import { getMediaUrl } from "../services/api";
import type { AppUser, UserRole } from "../types";

export type PageKey =
  | "dashboard"
  | "employees"
  | "customers"
  | "policies"
  | "plans"
  | "premiums"
  | "claims"
  | "documents"
  | "reports"
  | "settings"
  | "profile";

const navItems: Array<{ key: PageKey; label: string; icon: LucideIcon; roles: UserRole[] }> = [
  { key: "dashboard", label: "Dashboard", icon: Home, roles: ["admin", "agent", "customer"] },
  { key: "employees", label: "Employees", icon: Users, roles: ["admin"] },
  { key: "customers", label: "Customers", icon: Users, roles: ["admin", "agent"] },
  { key: "policies", label: "Policies", icon: ShieldCheck, roles: ["admin", "agent", "customer"] },
  { key: "plans", label: "Plans", icon: ListChecks, roles: ["admin"] },
  { key: "premiums", label: "Premiums", icon: WalletCards, roles: ["admin", "agent", "customer"] },
  { key: "claims", label: "Claims", icon: ClipboardList, roles: ["admin", "agent", "customer"] },
  { key: "documents", label: "Documents", icon: FileText, roles: ["admin", "agent", "customer"] },
  { key: "reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  { key: "settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  agent: "Agent",
  customer: "Customer",
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const profileImageUrl = getMediaUrl(currentUser.profile_image_url);
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser.role));
  const searchResults = visibleNavItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  function openSearchResult(page: PageKey) {
    onNavigate(page);
    setSearchQuery("");
    setIsSearchFocused(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">H</div>
            <BrandLockup inverse compact />
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
            <div className={`workspace-icon ready ${profileImageUrl ? "has-profile-image" : ""}`}>
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={`${currentUser.name} profile`} />
              ) : (
                <ShieldCheck size={18} />
              )}
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <span>{roleLabels[currentUser.role]}</span>
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
          <div className="topbar-title">
            <p className="eyebrow">Health Insurance Platform</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-search">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Search workspace pages"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  openSearchResult(searchResults[0].key);
                }
                if (event.key === "Escape") {
                  setSearchQuery("");
                  setIsSearchFocused(false);
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search dashboard, policies, claims..."
            />
            {isSearchFocused && searchQuery.trim() ? (
              <div className="topbar-search-results">
                {searchResults.length ? searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} onMouseDown={() => openSearchResult(item.key)}>
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </button>
                  );
                }) : <p>No accessible page found</p>}
              </div>
            ) : null}
          </div>
          <div className="topbar-actions">
            <span className="badge">{roleLabels[currentUser.role]}</span>
            <div className="profile-menu-wrap">
              <button
                className={`user-pill clickable ${profileImageUrl ? "has-profile-image" : ""}`}
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={`${currentUser.name} profile`} />
                ) : (
                  currentUser.name.slice(0, 2).toUpperCase()
                )}
              </button>
              {isProfileMenuOpen ? (
                <div className="profile-menu">
                  <div className="profile-menu-header">
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.email}</span>
                  </div>
                  <button onClick={() => onNavigate("profile")}>My Account</button>
                  <button onClick={() => onNavigate("profile")}>Update Profile</button>
                  {currentUser.role === "admin" ? <button onClick={() => onNavigate("settings")}>Settings</button> : null}
                  <button className="danger-text" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="page-scroll-area">
          {children}
        </div>
      </main>
    </div>
  );
}
