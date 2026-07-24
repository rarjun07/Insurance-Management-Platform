import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { AppLayout, type PageKey } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ComingSoonCard } from "./components/ComingSoonCard";
import { StatusBadge } from "./components/StatusBadge";
import { StatCard } from "./components/StatCard";
import {
  initialClaims,
  initialCustomers,
  initialDocuments,
  initialPolicies,
  initialPremiums,
  policyTypes,
  demoUsers,
} from "./data/mockData";
import type { AppUser, Claim, Customer, DocumentRecord, Policy, Premium } from "./types";

const pageTitles: Record<PageKey, string> = {
  dashboard: "Dashboard",
  customers: "Customer Management",
  policies: "Health Policies",
  premiums: "Premium Tracking",
  claims: "Claim Management",
  documents: "Document Center",
  reports: "Reports Dashboard",
  settings: "System Settings",
  profile: "My Profile",
};

export function App() {
  const [authScreen, setAuthScreen] = useState<"home" | "login" | "register">("home");
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [users, setUsers] = useState<AppUser[]>(demoUsers);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [premiums, setPremiums] = useState<Premium[]>(initialPremiums);
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [documents] = useState<DocumentRecord[]>(initialDocuments);
  const [search, setSearch] = useState("");


  const visibleCustomers = useMemo(() => {
    if (!currentUser || currentUser.role !== "Customer") {
      return customers;
    }
    return customers.filter((customer) => customer.id === currentUser.customerId);
  }, [customers, currentUser]);

  const visiblePolicies = useMemo(() => {
    if (!currentUser || currentUser.role !== "Customer") {
      return policies;
    }
    const allowedCustomer = customers.find((customer) => customer.id === currentUser.customerId);
    return policies.filter((policy) => policy.customerName === allowedCustomer?.name);
  }, [customers, currentUser, policies]);

  const visiblePremiums = useMemo(() => {
    const allowedPolicyIds = new Set(visiblePolicies.map((policy) => policy.id));
    return premiums.filter((premium) => allowedPolicyIds.has(premium.policyId));
  }, [premiums, visiblePolicies]);

  const visibleClaims = useMemo(() => {
    const allowedPolicyIds = new Set(visiblePolicies.map((policy) => policy.id));
    return claims.filter((claim) => allowedPolicyIds.has(claim.policyId));
  }, [claims, visiblePolicies]);

  const visibleDocuments = useMemo(() => {
    if (!currentUser || currentUser.role !== "Customer") {
      return documents;
    }
    const allowedCustomer = customers.find((customer) => customer.id === currentUser.customerId);
    return documents.filter((document) => document.customerName === allowedCustomer?.name);
  }, [customers, currentUser, documents]);

  const filteredCustomers = useMemo(
    () =>
      visibleCustomers.filter((customer) =>
        [customer.name, customer.email, customer.phone].some((field) =>
          field.toLowerCase().includes(search.toLowerCase()),
        ),
      ),
    [visibleCustomers, search],
  );

  const stats = {
    customers: visibleCustomers.length,
    activePolicies: visiblePolicies.filter((policy) => policy.status === "Active").length,
    pendingClaims: visibleClaims.filter((claim) => claim.status === "Pending").length,
    collectedPremium: visiblePremiums
      .filter((premium) => premium.status === "Paid")
      .reduce((total, premium) => total + premium.amount, 0),
  };

  function addCustomer() {
    const nextId = customers.length + 1;
    setCustomers([
      {
        id: `CUS-${String(nextId).padStart(3, "0")}`,
        name: `New Customer ${nextId}`,
        email: `customer${nextId}@example.com`,
        phone: "9876543210",
        city: "Jaipur",
        status: "Active",
      },
      ...customers,
    ]);
  }

  function renewPolicy(policyId: string) {
    setPolicies((currentPolicies) =>
      currentPolicies.map((policy) =>
        policy.id === policyId ? { ...policy, status: "Active", endDate: "2027-07-24" } : policy,
      ),
    );
  }

  function cancelPolicy(policyId: string) {
    setPolicies((currentPolicies) =>
      currentPolicies.map((policy) =>
        policy.id === policyId ? { ...policy, status: "Cancelled" } : policy,
      ),
    );
  }

  function markPremiumPaid(premiumId: string) {
    setPremiums((currentPremiums) =>
      currentPremiums.map((premium) =>
        premium.id === premiumId
          ? { ...premium, status: "Paid", paymentDate: new Date().toISOString().slice(0, 10) }
          : premium,
      ),
    );
  }

  function decideClaim(claimId: string, status: "Approved" | "Rejected") {
    setClaims((currentClaims) =>
      currentClaims.map((claim) => (claim.id === claimId ? { ...claim, status } : claim)),
    );
  }

  function handleRegister(user: AppUser) {
    setUsers((currentUsers) => [user, ...currentUsers]);
  }

  function handleLogout() {
    setCurrentUser(null);
    setActivePage("dashboard");
    setAuthScreen("home");
  }

  if (!currentUser) {
    if (authScreen === "home") {
      return (
        <HomePage
          onLogin={() => setAuthScreen("login")}
          onRegister={() => setAuthScreen("register")}
        />
      );
    }

    if (authScreen === "login") {
      return (
        <LoginPage
          users={users}
          onBackHome={() => setAuthScreen("home")}
          onGoRegister={() => setAuthScreen("register")}
          onLogin={setCurrentUser}
        />
      );
    }

    return (
      <RegisterPage
        userCount={users.length}
        onBackHome={() => setAuthScreen("home")}
        onGoLogin={() => setAuthScreen("login")}
        onRegister={handleRegister}
        onLogin={setCurrentUser}
      />
    );
  }

  function navigateSafely(page: PageKey) {
    if (currentUser.role !== "Admin" && ["reports", "settings"].includes(page)) {
      setActivePage("dashboard");
      return;
    }
    if (currentUser.role === "Customer" && page === "customers") {
      setActivePage("profile");
      return;
    }
    setActivePage(page);
  }

  function renderPage() {
    if (activePage === "dashboard") {
      return (
        <Dashboard
          stats={stats}
          claims={claims}
          policies={visiblePolicies}
          premiums={visiblePremiums}
          onNavigate={navigateSafely}
        />
      );
    }

    if (activePage === "customers") {
      return (
        <CustomersPage
          customers={filteredCustomers}
          search={search}
          onSearch={setSearch}
          onAddCustomer={addCustomer}
        />
      );
    }

    if (activePage === "policies") {
      return <PoliciesPage policies={visiblePolicies} onRenew={renewPolicy} onCancel={cancelPolicy} canManage={currentUser.role !== "Customer"} />;
    }

    if (activePage === "premiums") {
      return <PremiumsPage premiums={visiblePremiums} onMarkPaid={markPremiumPaid} canManage={currentUser.role !== "Customer"} />;
    }

    if (activePage === "claims") {
      return <ClaimsPage claims={visibleClaims} onDecision={decideClaim} canManage={currentUser.role !== "Customer"} />;
    }

    if (activePage === "documents") {
      return <DocumentsPage documents={visibleDocuments} />;
    }

    if (activePage === "reports") {
      return <ReportsPage stats={stats} claims={claims} policies={policies} premiums={premiums} />;
    }

    if (activePage === "profile") {
      return <ProfilePage user={currentUser} onLogout={handleLogout} />;
    }

    return <SettingsPage />;
  }

  return (
    <AppLayout
      activePage={activePage}
      pageTitle={pageTitles[activePage]}
      currentUser={currentUser}
      onNavigate={navigateSafely}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}

type DashboardProps = {
  stats: {
    customers: number;
    activePolicies: number;
    pendingClaims: number;
    collectedPremium: number;
  };
  claims: Claim[];
  policies: Policy[];
  premiums: Premium[];
  onNavigate: (page: PageKey) => void;
};

function Dashboard({ stats, claims, policies, premiums, onNavigate }: DashboardProps) {
  return (
    <div className="dashboard-grid">
      <section className="stats-grid">
        <StatCard icon={Users} label="Customers" value={String(stats.customers)} trend="+3 this week" />
        <StatCard
          icon={ShieldCheck}
          label="Active Policies"
          value={String(stats.activePolicies)}
          trend="Health insurance"
        />
        <StatCard
          icon={Clock}
          label="Pending Claims"
          value={String(stats.pendingClaims)}
          trend="Needs review"
        />
        <StatCard
          icon={IndianRupee}
          label="Premium Collection"
          value={`₹${stats.collectedPremium.toLocaleString("en-IN")}`}
          trend="Paid premiums"
        />
      </section>

      <section className="panel wide-panel hero-panel">
        <div>
          <p className="eyebrow">Version One</p>
          <h2>Health Insurance Operations</h2>
          <p>
            Manage customers, policies, premiums, claims, and uploaded documents from one
            responsive workspace.
          </p>
        </div>
        <button className="primary-button" onClick={() => onNavigate("customers")}>
          <Plus size={18} />
          Add Customer
        </button>
      </section>

      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Insurance catalog</p>
            <h2>Product Availability</h2>
          </div>
          <span className="badge">Health Insurance Focus</span>
        </div>
        <div className="policy-type-grid">
          {policyTypes.map((policy) => (
            <ComingSoonCard key={policy.title} {...policy} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Claim Status</h2>
          <AlertTriangle size={20} />
        </div>
        <div className="chart-placeholder">
          <div className="chart-bar approved" style={{ height: `${claims.filter((claim) => claim.status === "Approved").length * 42 + 42}px` }} />
          <div className="chart-bar pending" style={{ height: `${claims.filter((claim) => claim.status === "Pending").length * 42 + 42}px` }} />
          <div className="chart-bar rejected" style={{ height: `${claims.filter((claim) => claim.status === "Rejected").length * 42 + 42}px` }} />
        </div>
        <div className="legend">
          <span>Approved</span>
          <span>Pending</span>
          <span>Rejected</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Today’s Work Queue</h2>
        </div>
        <div className="activity-list">
          <p>{policies.filter((policy) => policy.status === "Expiring").length} policies need renewal review</p>
          <p>{premiums.filter((premium) => premium.status === "Overdue").length} overdue premium alerts</p>
          <p>{claims.filter((claim) => claim.status === "Pending").length} claims waiting for decision</p>
          <p>Document verification queue is updated</p>
        </div>
      </section>
    </div>
  );
}

function CustomersPage({
  customers,
  search,
  onSearch,
  onAddCustomer,
}: {
  customers: Customer[];
  search: string;
  onSearch: (value: string) => void;
  onAddCustomer: () => void;
}) {
  return (
    <section className="panel page-panel">
      <Toolbar
        title="Customers"
        actionLabel="Add Customer"
        onAction={onAddCustomer}
        search={search}
        onSearch={onSearch}
      />
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.id}</td>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>{customer.city}</td>
                <td>
                  <StatusBadge status={customer.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PoliciesPage({
  policies,
  onRenew,
  onCancel,
  canManage,
}: {
  policies: Policy[];
  onRenew: (id: string) => void;
  onCancel: (id: string) => void;
  canManage: boolean;
}) {
  return (
    <section className="panel page-panel">
      <Toolbar title="Health Policies" actionLabel="Create Policy" />
      <div className="card-grid">
        {policies.map((policy) => (
          <article className="record-card" key={policy.id}>
            <div className="record-card-header">
              <div>
                <p className="eyebrow">{policy.id}</p>
                <h3>{policy.customerName}</h3>
              </div>
              <StatusBadge status={policy.status} />
            </div>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{policy.type}</dd>
              </div>
              <div>
                <dt>Premium</dt>
                <dd>₹{policy.premium.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>End Date</dt>
                <dd>{policy.endDate}</dd>
              </div>
            </dl>
            {canManage ? (
              <div className="button-row">
                <button className="secondary-button" onClick={() => onRenew(policy.id)}>
                  Renew
                </button>
                <button className="danger-button" onClick={() => onCancel(policy.id)}>
                  Cancel
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function PremiumsPage({
  premiums,
  onMarkPaid,
  canManage,
}: {
  premiums: Premium[];
  onMarkPaid: (id: string) => void;
  canManage: boolean;
}) {
  return (
    <section className="panel page-panel">
      <Toolbar title="Premium Tracking" actionLabel="Record Premium" />
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Policy</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {premiums.map((premium) => (
              <tr key={premium.id}>
                <td>{premium.id}</td>
                <td>{premium.policyId}</td>
                <td>{premium.dueDate}</td>
                <td>₹{premium.amount.toLocaleString("en-IN")}</td>
                <td>
                  <StatusBadge status={premium.status} />
                </td>
                <td>
                  {canManage ? (
                    <button className="mini-button" onClick={() => onMarkPaid(premium.id)}>
                      Mark paid
                    </button>
                  ) : (
                    <span className="table-note">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClaimsPage({
  claims,
  onDecision,
  canManage,
}: {
  claims: Claim[];
  onDecision: (id: string, status: "Approved" | "Rejected") => void;
  canManage: boolean;
}) {
  return (
    <section className="panel page-panel">
      <Toolbar title="Claims" actionLabel="Submit Claim" />
      <div className="card-grid">
        {claims.map((claim) => (
          <article className="record-card" key={claim.id}>
            <div className="record-card-header">
              <div>
                <p className="eyebrow">{claim.id}</p>
                <h3>{claim.policyId}</h3>
              </div>
              <StatusBadge status={claim.status} />
            </div>
            <p>{claim.reason}</p>
            <strong>₹{claim.amount.toLocaleString("en-IN")}</strong>
            {canManage ? (
              <div className="button-row">
                <button className="secondary-button" onClick={() => onDecision(claim.id, "Approved")}>
                  Approve
                </button>
                <button className="danger-button" onClick={() => onDecision(claim.id, "Rejected")}>
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DocumentsPage({ documents }: { documents: DocumentRecord[] }) {
  return (
    <section className="panel page-panel">
      <Toolbar title="Documents" actionLabel="Upload Document" icon={Upload} />
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Type</th>
              <th>File</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.id}</td>
                <td>{document.customerName}</td>
                <td>{document.type}</td>
                <td>{document.fileName}</td>
                <td>{document.uploadedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportsPage({
  stats,
  claims,
  policies,
  premiums,
}: {
  stats: DashboardProps["stats"];
  claims: Claim[];
  policies: Policy[];
  premiums: Premium[];
}) {
  return (
    <div className="dashboard-grid">
      <section className="stats-grid">
        <StatCard icon={Users} label="Customers" value={String(stats.customers)} trend="Total customers" />
        <StatCard icon={ShieldCheck} label="Policies" value={String(policies.length)} trend="All health policies" />
        <StatCard icon={FileText} label="Claims" value={String(claims.length)} trend="Total claims" />
        <StatCard
          icon={IndianRupee}
          label="Collected"
          value={`₹${stats.collectedPremium.toLocaleString("en-IN")}`}
          trend="Paid premiums"
        />
      </section>
      <section className="panel">
        <h2>Policy Status</h2>
        <div className="metric-list">
          <p>Active: {policies.filter((policy) => policy.status === "Active").length}</p>
          <p>Expiring: {policies.filter((policy) => policy.status === "Expiring").length}</p>
          <p>Cancelled: {policies.filter((policy) => policy.status === "Cancelled").length}</p>
        </div>
      </section>
      <section className="panel">
        <h2>Premium Status</h2>
        <div className="metric-list">
          <p>Paid: {premiums.filter((premium) => premium.status === "Paid").length}</p>
          <p>Pending: {premiums.filter((premium) => premium.status === "Pending").length}</p>
          <p>Overdue: {premiums.filter((premium) => premium.status === "Overdue").length}</p>
        </div>
      </section>
    </div>
  );
}

function SettingsPage() {
  return (
    <section className="panel page-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>System Settings</h2>
        </div>
        <StatusBadge status="Active" />
      </div>
      <div className="settings-grid">
        <div>
          <span>Active insurance type</span>
          <strong>Health Insurance</strong>
        </div>
        <div>
          <span>Backend API</span>
          <strong>http://127.0.0.1:8000</strong>
        </div>
        <div>
          <span>Database</span>
          <strong>PostgreSQL</strong>
        </div>
      </div>
    </section>
  );
}

type ToolbarProps = {
  title: string;
  actionLabel: string;
  search?: string;
  onSearch?: (value: string) => void;
  onAction?: () => void;
  icon?: typeof Plus;
};

function Toolbar({
  title,
  actionLabel,
  search,
  onSearch,
  onAction,
  icon: Icon = Plus,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <h2>{title}</h2>
      <div className="toolbar-actions">
        {onSearch ? (
          <label className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search records"
            />
          </label>
        ) : null}
        <button className="primary-button" onClick={onAction}>
          <Icon size={18} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
