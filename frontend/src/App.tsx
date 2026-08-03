import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarCheck,
  Clock,
  CreditCard,
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
import { policyTypes } from "./data/mockData";
import {
  cancelPolicy as cancelPolicyApi,
  assignClaim,
  clearStoredToken,
  createCustomer,
  createEmployee,
  createPolicy,
  createPlan,
  decideClaim as decideClaimApi,
  downloadDocumentFile,
  downloadBusinessReportPdf,
  getDashboardReport,
  getCustomer,
  getMe,
  getMonthlyReport,
  getPublicPlatformSummary,
  getStoredToken,
  listApplications,
  listClaims,
  listCustomers,
  listDocuments,
  listEmployees,
  listExpiringPolicies,
  listPolicies,
  listPlans,
  listPremiums,
  listSettings,
  login,
  markPremiumPaid as markPremiumPaidApi,
  recordPremium,
  registerUser,
  reviewPolicyApplication,
  renewPolicy as renewPolicyApi,
  storeToken,
  submitClaim,
  submitPolicyApplication,
  settleClaim,
  updateEmployee,
  updateMe,
  updatePlan,
  updateSetting,
  updateCustomer,
  uploadDocument,
  verifyClaim,
  verifyDocument,
} from "./services/api";
import type {
  AppUser,
  Claim,
  Customer,
  DashboardReport,
  DocumentRecord,
  Employee,
  InsurancePlan,
  MonthlyReportItem,
  PaginatedResponse,
  Policy,
  PolicyApplication,
  Premium,
  PublicPlatformSummary,
  SystemSetting,
} from "./types";

async function loadAllPages<T>(
  loadPage: (skip: number, limit: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const limit = 100;
  const firstPage = await loadPage(0, limit);
  const items = [...firstPage.items];
  while (items.length < firstPage.total) {
    const nextPage = await loadPage(items.length, limit);
    if (nextPage.items.length === 0) break;
    items.push(...nextPage.items);
  }
  return items;
}

async function loadPagePreview<T>(
  loadPage: (skip: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit: number,
): Promise<T[]> {
  const firstPage = await loadPage(0, limit);
  return firstPage.items;
}

const pageTitles: Record<PageKey, string> = {
  dashboard: "Dashboard",
  employees: "Employee Management",
  customers: "Customer Management",
  policies: "Health Policies",
  plans: "Insurance Plans",
  premiums: "Premium Tracking",
  claims: "Claim Management",
  documents: "Document Center",
  reports: "Reports Dashboard",
  settings: "System Settings",
  profile: "My Profile",
};

type FormKey = "employee" | "employeeEdit" | "customer" | "customerEdit" | "policy" | "premium" | "claim" | "document" | null;
type AuthScreen = "home" | "login" | "register";
type PolicyApplicationPayload = Parameters<typeof submitPolicyApplication>[1];
const WORKSPACE_PREVIEW_LIMIT = 12;

function isReloadNavigation() {
  const navigationEntries = window.performance.getEntriesByType("navigation");
  if (navigationEntries.length > 0) {
    return (navigationEntries[0] as PerformanceNavigationTiming).type === "reload";
  }
  return typeof window.performance.navigation !== "undefined" && window.performance.navigation.type === 1;
}

function getAuthScreenFromHash(): AuthScreen | null {
  const screen = window.location.hash.replace("#/", "");
  if (screen === "home" || screen === "login" || screen === "register") {
    return screen;
  }
  return null;
}

function getPageFromHash(): PageKey | null {
  const page = window.location.hash.replace("#/app/", "");
  if (page in pageTitles) {
    return page as PageKey;
  }
  return null;
}

function getAllowedPage(page: PageKey, user: AppUser): PageKey {
  if (user.role !== "admin" && ["reports", "settings", "plans"].includes(page)) {
    return "dashboard";
  }
  if (user.role !== "admin" && page === "employees") {
    return "dashboard";
  }
  if (user.role === "customer" && ["customers", "employees"].includes(page)) {
    return "profile";
  }
  return page;
}

function isFrontendSupportedRole(user: AppUser) {
  return user.role === "admin" || user.role === "agent" || user.role === "customer";
}

export function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>(() => getAuthScreenFromHash() ?? "home");
  const [activePage, setActivePage] = useState<PageKey>(() => getPageFromHash() ?? "dashboard");
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [expiringPolicies, setExpiringPolicies] = useState<Policy[]>([]);
  const [premiums, setPremiums] = useState<Premium[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [applications, setApplications] = useState<PolicyApplication[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [publicSummary, setPublicSummary] = useState<PublicPlatformSummary | null>(null);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeForm, setActiveForm] = useState<FormKey>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState("");
  const [loginPrefillEmail, setLoginPrefillEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHydratingWorkspace, setIsHydratingWorkspace] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getStoredToken()));
  const hasSyncedHistory = useRef(false);
  const hasLoadedPublicData = useRef(false);
  const workspaceLoadIdRef = useRef(0);
  const shouldResetToDashboardOnReload = useRef(isReloadNavigation());

  const isCustomer = currentUser?.role === "customer";
  const isAdmin = currentUser?.role === "admin";
  const isStaff = currentUser?.role === "admin" || currentUser?.role === "agent";
  const canManage = isStaff;

  useEffect(() => {
    if (currentUser || hasLoadedPublicData.current) {
      return;
    }

    hasLoadedPublicData.current = true;

    async function loadPublicData() {
      try {
        const [summary, activePlans] = await Promise.all([
          getPublicPlatformSummary(),
          listPlans(),
        ]);
        setPublicSummary(summary);
        if (!currentUser) {
          setPlans(activePlans);
        }
      } catch {
        setPublicSummary(null);
      }
    }

    void loadPublicData();
  }, [currentUser]);

  async function loadWorkspace(activeToken: string, user: AppUser) {
    const loadId = ++workspaceLoadIdRef.current;
    setError("");
    setIsHydratingWorkspace(true);

    const resetWorkspaceData = () => {
      setEmployees([]);
      setCustomers([]);
      setCustomerProfile(null);
      setPolicies([]);
      setExpiringPolicies([]);
      setPremiums([]);
      setClaims([]);
      setDocuments([]);
      setApplications([]);
      setSettings([]);
      setPlans([]);
      setReport(null);
      setMonthlyReport([]);
    };

    const applyIfCurrent = (apply: () => void) => {
      if (workspaceLoadIdRef.current !== loadId) {
        return false;
      }
      apply();
      return true;
    };

    if (!user) {
      return;
    }

    if (!user.role) {
      setIsLoading(false);
      setIsHydratingWorkspace(false);
      return;
    }

    if (user.role === "admin") {
      setIsLoading(true);
      resetWorkspaceData();
      try {
        const [summary, monthly, expiringResponse, planItems] = await Promise.all([
          getDashboardReport(activeToken),
          getMonthlyReport(activeToken),
          listExpiringPolicies(activeToken),
          listPlans(activeToken, true),
        ]);

        if (!applyIfCurrent(() => {
          setReport(summary);
          setMonthlyReport(monthly);
          setExpiringPolicies(expiringResponse.items);
          setPlans(planItems);
          setCustomers([]);
          setEmployees([]);
          setSettings([]);
          setPolicies([]);
          setPremiums([]);
          setClaims([]);
          setDocuments([]);
          setApplications([]);
        })) {
          return;
        }
      } catch (caughtError) {
        if (workspaceLoadIdRef.current === loadId) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load workspace");
        }
        setIsLoading(false);
        setIsHydratingWorkspace(false);
        return;
      }

      setIsLoading(false);
      void (async () => {
        try {
          const [policyItems, premiumItems, claimItems, documentItems, applicationItems, customerItems, employeeItems, settingsResponse] = await Promise.all([
            loadAllPages((skip, limit) => listPolicies(activeToken, false, skip, limit)),
            loadAllPages((skip, limit) => listPremiums(activeToken, false, skip, limit)),
            loadAllPages((skip, limit) => listClaims(activeToken, false, skip, limit)),
            loadAllPages((skip, limit) => listDocuments(activeToken, false, skip, limit)),
            loadAllPages((skip, limit) => listApplications(activeToken, false, skip, limit)),
            loadAllPages((skip, limit) => listCustomers(activeToken, search, skip, limit)),
            loadAllPages((skip, limit) => listEmployees(activeToken, "", skip, limit)),
            listSettings(activeToken),
          ]);

          startTransition(() => {
            applyIfCurrent(() => {
              setPolicies(policyItems);
              setPremiums(premiumItems);
              setClaims(claimItems);
              setDocuments(documentItems);
              setApplications(applicationItems);
              setCustomers(customerItems);
              setEmployees(employeeItems);
              setSettings(settingsResponse);
            });
          });
        } catch {
          // Keep the preview data if the background refresh fails.
        } finally {
          if (workspaceLoadIdRef.current === loadId) {
            setIsHydratingWorkspace(false);
          }
        }
      })();
      return;
    }

    setIsLoading(true);
    resetWorkspaceData();
    try {
      const [customerProfileSnapshot, policyPreview, premiumPreview, claimPreview, documentPreview, applicationPreview, planItems] = await Promise.all([
        user.customer_id ? getCustomer(activeToken, user.customer_id) : Promise.resolve(null),
        loadPagePreview((skip, limit) => listPolicies(activeToken, true, skip, limit), WORKSPACE_PREVIEW_LIMIT),
        loadPagePreview((skip, limit) => listPremiums(activeToken, true, skip, limit), WORKSPACE_PREVIEW_LIMIT),
        loadPagePreview((skip, limit) => listClaims(activeToken, true, skip, limit), WORKSPACE_PREVIEW_LIMIT),
        loadPagePreview((skip, limit) => listDocuments(activeToken, true, skip, limit), WORKSPACE_PREVIEW_LIMIT),
        loadPagePreview((skip, limit) => listApplications(activeToken, true, skip, limit), WORKSPACE_PREVIEW_LIMIT),
        listPlans(activeToken, false),
      ]);

      if (!applyIfCurrent(() => {
        setCustomerProfile(customerProfileSnapshot);
        setPolicies(policyPreview);
        setPremiums(premiumPreview);
        setClaims(claimPreview);
        setDocuments(documentPreview);
        setApplications(applicationPreview);
        setPlans(planItems);
        setCustomers([]);
        setEmployees([]);
        setSettings([]);
        setExpiringPolicies([]);
        setReport(null);
        setMonthlyReport([]);
      })) {
        return;
      }
    } catch (caughtError) {
      if (workspaceLoadIdRef.current === loadId) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load workspace");
      }
      setIsLoading(false);
      setIsHydratingWorkspace(false);
      return;
    }

    setIsLoading(false);
    void (async () => {
      try {
        const [policyItems, premiumItems, claimItems, documentItems, applicationItems, planItems] = await Promise.all([
          loadAllPages((skip, limit) => listPolicies(activeToken, true, skip, limit)),
          loadAllPages((skip, limit) => listPremiums(activeToken, true, skip, limit)),
          loadAllPages((skip, limit) => listClaims(activeToken, true, skip, limit)),
          loadAllPages((skip, limit) => listDocuments(activeToken, true, skip, limit)),
          loadAllPages((skip, limit) => listApplications(activeToken, true, skip, limit)),
          listPlans(activeToken, false),
        ]);

        startTransition(() => {
          applyIfCurrent(() => {
            setPolicies(policyItems);
            setPremiums(premiumItems);
            setClaims(claimItems);
            setDocuments(documentItems);
            setApplications(applicationItems);
            setPlans(planItems);
          });
        });
      } catch {
        // Keep the preview data if the background refresh fails.
      } finally {
        if (workspaceLoadIdRef.current === loadId) {
          setIsHydratingWorkspace(false);
        }
      }
    })();
  }

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }
      try {
        const user = await getMe(token);
        if (!isFrontendSupportedRole(user)) {
          throw new Error("This frontend supports only Admin, Agent, and Customer accounts.");
        }
        setCurrentUser(user);
        if (shouldResetToDashboardOnReload.current) {
          setActivePage("dashboard");
        }
        void loadWorkspace(token, user);
      } catch {
        clearStoredToken();
        setToken(null);
        setCurrentUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    void restoreSession();
  }, []);

  useEffect(() => {
    function syncFromBrowserPath() {
      const page = getPageFromHash();
      const screen = getAuthScreenFromHash();

      if (currentUser && page) {
        setActivePage(getAllowedPage(page, currentUser));
        return;
      }

      if (!currentUser && screen) {
        setAuthScreen(screen);
      }
    }

    window.addEventListener("hashchange", syncFromBrowserPath);
    return () => window.removeEventListener("hashchange", syncFromBrowserPath);
  }, [currentUser]);

  useEffect(() => {
    const nextHash = currentUser ? `#/app/${activePage}` : `#/${authScreen}`;
    if (window.location.hash === nextHash) {
      hasSyncedHistory.current = true;
      return;
    }

    if (!hasSyncedHistory.current) {
      window.history.replaceState(null, "", nextHash);
      hasSyncedHistory.current = true;
      return;
    }

    window.history.pushState(null, "", nextHash);
  }, [activePage, authScreen, currentUser]);

  useEffect(() => {
    if (!token || !currentUser || isCustomer || !search.trim()) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const [customerItems, employeeItems] = await Promise.all([
          loadAllPages((skip, limit) => listCustomers(token, search, skip, limit)),
          currentUser.role === "admin"
            ? loadAllPages((skip, limit) => listEmployees(token, search, skip, limit))
            : Promise.resolve([]),
        ]);
        setCustomers(customerItems);
        if (currentUser.role === "admin") {
          setEmployees(employeeItems);
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Search failed");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search, token, currentUser, isCustomer]);

  const stats = useMemo(() => {
    const collectedPremium = premiums
      .filter((premium) => premium.payment_status === "paid")
      .reduce((total, premium) => total + Number(premium.amount), 0);

    return {
      customers: report?.customers.total_customers ?? customers.length,
      activePolicies: report?.policies.active_policies ?? policies.filter((policy) => policy.status === "active").length,
      pendingClaims: report?.claims.pending_claims ?? claims.filter((claim) => claim.status === "pending").length,
      collectedPremium,
    };
  }, [claims, customers, policies, premiums, report]);

  async function handleLogin(email: string, password: string) {
    setError("");
    const loginResponse = await login(email, password);
    storeToken(loginResponse.access_token);
    setToken(loginResponse.access_token);
    const user = loginResponse.user;
    if (!isFrontendSupportedRole(user)) {
      clearStoredToken();
      setToken(null);
      throw new Error("This project supports only Admin, Agent, and Customer login.");
    }
    setCurrentUser(user);
    setLoginPrefillEmail("");
    setAuthScreen("home");
    void loadWorkspace(loginResponse.access_token, user);
  }

  async function handleRegister(payload: Parameters<typeof registerUser>[0]) {
    setError("");
    try {
      await registerUser(payload);
      setLoginPrefillEmail(payload.email);
      setAuthScreen("login");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to create account";
      if (message.toLowerCase().includes("already registered")) {
        setError("An account with this email already exists. Please log in instead.");
        setAuthScreen("login");
        return;
      }
      setError(message);
    }
  }

  function handleLogout() {
    clearStoredToken();
    setToken(null);
    setCurrentUser(null);
    setActivePage("dashboard");
    setAuthScreen("home");
    setEmployees([]);
    setCustomers([]);
    setCustomerProfile(null);
    setPolicies([]);
    setPremiums([]);
    setClaims([]);
    setDocuments([]);
    setApplications([]);
    setSettings([]);
    setPlans([]);
    setReport(null);
    setLoginPrefillEmail("");
  }

  function navigateSafely(page: PageKey) {
    if (!currentUser) {
      return;
    }
    setActivePage(getAllowedPage(page, currentUser));
  }

  async function reloadCurrentWorkspace() {
    if (token && currentUser) {
      await loadWorkspace(token, currentUser);
    }
  }

  if (!currentUser) {
    if (authScreen === "home") {
      return <HomePage summary={publicSummary} onLogin={() => setAuthScreen("login")} onRegister={() => setAuthScreen("register")} />;
    }

    if (authScreen === "login") {
      return (
        <LoginPage
          error={error}
          onBackHome={() => setAuthScreen("home")}
          onGoRegister={() => setAuthScreen("register")}
          onLogin={handleLogin}
          initialEmail={loginPrefillEmail}
        />
      );
    }

    return (
      <RegisterPage
        error={error}
        onBackHome={() => setAuthScreen("home")}
        onGoLogin={() => setAuthScreen("login")}
        onRegister={handleRegister}
      />
    );
  }

  const authenticatedUser = currentUser;

  if (isBootstrapping) {
    return <BootstrapScreen />;
  }

  function renderPage() {
    if (activePage === "dashboard") {
      if (authenticatedUser.role === "customer") {
        return (
          <CustomerDashboard
            user={authenticatedUser}
            customer={customerProfile}
            policies={policies}
            premiums={premiums}
            claims={claims}
            documents={documents}
            applications={applications}
            plans={plans}
            isLoading={isLoading}
            onNavigate={navigateSafely}
            onSubmitClaim={() => setActiveForm("claim")}
            onUploadDocument={() => setActiveForm("document")}
            onPayPremium={async (id) => {
              if (!token) return;
              await markPremiumPaidApi(token, id);
              await reloadCurrentWorkspace();
            }}
            onApplicationSubmitted={async (application, applicationDocuments) => {
              if (!token) return;
              const createdApplication = await submitPolicyApplication(token, application);
              const customerId = authenticatedUser.customer_id;
              if (!customerId) {
                throw new Error("Customer profile is required before uploading application documents.");
              }
              await Promise.all(
                applicationDocuments.map(({ file }) =>
                  uploadDocument(token, {
                    customer_id: customerId,
                    application_id: createdApplication.id,
                    document_type: "identity",
                    file,
                  }),
                ),
              );
              await reloadCurrentWorkspace();
            }}
          />
        );
      }

      return (
        <Dashboard
          stats={stats}
          claims={claims}
          policies={policies}
          premiums={premiums}
          expiringPolicies={expiringPolicies}
          isLoading={isLoading}
          onNavigate={navigateSafely}
        />
      );
    }

    if (activePage === "customers") {
      return (
        <CustomersPage
          customers={customers}
          applications={applications}
          plans={plans}
          policies={policies}
          premiums={premiums}
          claims={claims}
          documents={documents}
          search={search}
          onSearch={setSearch}
          onOpenForm={() => setActiveForm("customer")}
          onEdit={(customer) => {
            setSelectedCustomer(customer);
            setActiveForm("customerEdit");
          }}
          isHydratingWorkspace={isHydratingWorkspace}
        />
      );
    }

    if (activePage === "employees") {
      return (
        <EmployeesPage
          employees={employees}
          search={search}
          onSearch={setSearch}
          onOpenForm={() => setActiveForm("employee")}
          onEdit={(employee) => {
            setSelectedEmployee(employee);
            setActiveForm("employeeEdit");
          }}
        />
      );
    }

    if (activePage === "policies") {
      return (
        <PoliciesPage
          policies={policies}
          applications={applications}
          documents={documents}
          customers={customers}
          canManage={Boolean(isStaff)}
          isCustomerView={Boolean(isCustomer)}
          onOpenForm={() => setActiveForm("policy")}
          onBrowsePlans={() => navigateSafely("dashboard")}
          onRenew={async (policy) => {
            if (!token) return;
            await renewPolicyApi(token, policy.id, {
              premium_amount: policy.premium_amount,
              start_date: new Date().toISOString().slice(0, 10),
              end_date: nextYearDate(),
            });
            await reloadCurrentWorkspace();
          }}
          onCancel={async (id) => {
            if (!token) return;
            await cancelPolicyApi(token, id);
            await reloadCurrentWorkspace();
          }}
          onReviewApplication={async (id, status) => {
            if (!token) return;
            await reviewPolicyApplication(token, id, { status });
            await reloadCurrentWorkspace();
          }}
          onVerifyApplicationDocuments={async (applicationDocuments, verificationStatus) => {
            if (!token) return;
            await Promise.all(
              applicationDocuments.map((document) =>
                verifyDocument(token, document.id, { verification_status: verificationStatus }),
              ),
            );
            await reloadCurrentWorkspace();
          }}
          onDownloadApplicationDocument={async (document) => {
            if (!token) return;
            await downloadDocumentFile(token, document.id, document.file_name);
          }}
        />
      );
    }

    if (activePage === "premiums") {
      return (
        <PremiumsPage
          premiums={premiums}
          canManage={Boolean(canManage)}
          canPay={Boolean(isCustomer)}
          onOpenForm={() => setActiveForm("premium")}
          onMarkPaid={async (id) => {
            if (!token) return;
            await markPremiumPaidApi(token, id);
            await reloadCurrentWorkspace();
          }}
        />
      );
    }

    if (activePage === "claims") {
      return (
        <ClaimsPage
          claims={claims}
          agents={employees.filter((employee) => employee.role === "agent")}
          currentUser={authenticatedUser}
          canManage={Boolean(canManage)}
          onOpenForm={() => setActiveForm("claim")}
          onDecision={async (id, status) => {
            if (!token) return;
            await decideClaimApi(token, id, status);
            await reloadCurrentWorkspace();
          }}
          onAssign={async (id, agentId) => {
            if (!token) return;
            await assignClaim(token, id, agentId);
            await reloadCurrentWorkspace();
          }}
          onVerify={async (id, status) => {
            if (!token) return;
            await verifyClaim(token, id, status);
            await reloadCurrentWorkspace();
          }}
          onSettle={async (claim) => {
            if (!token) return;
            await settleClaim(token, claim.id, claim.claim_amount, `SET-${claim.id}-${Date.now()}`);
            await reloadCurrentWorkspace();
          }}
          isHydratingWorkspace={isHydratingWorkspace}
        />
      );
    }

    if (activePage === "documents") {
      return (
        <DocumentsPage
          documents={documents}
          onOpenForm={() => setActiveForm("document")}
          onDownload={async (document) => {
            if (!token) return;
            await downloadDocumentFile(token, document.id, document.file_name);
          }}
          canVerify={Boolean(isStaff)}
          onVerify={async (document, verificationStatus) => {
            if (!token) return;
            await verifyDocument(token, document.id, { verification_status: verificationStatus });
            await reloadCurrentWorkspace();
          }}
        />
      );
    }

    if (activePage === "reports") {
      return (
        <ReportsPage
          stats={stats}
          report={report}
          monthlyReport={monthlyReport}
          onDownloadPdf={async () => {
            if (!token) return;
            await downloadBusinessReportPdf(token);
          }}
        />
      );
    }

    if (activePage === "plans") {
      return (
        <PlansPage
          plans={plans}
          onCreate={async (payload) => {
            if (!token) return;
            await createPlan(token, payload);
            setPlans(await listPlans(token, true));
          }}
          onSave={async (id, payload) => {
            if (!token) return;
            await updatePlan(token, id, payload);
            setPlans(await listPlans(token, true));
          }}
        />
      );
    }

    if (activePage === "profile") {
      return (
        <ProfilePage
          user={authenticatedUser}
          customer={customerProfile}
          onLogout={handleLogout}
          onSave={async (payload) => {
            if (!token) return;
            const refreshedUser = await updateMe(token, payload);
            setCurrentUser(refreshedUser);
            void loadWorkspace(token, refreshedUser);
          }}
        />
      );
    }

    return (
      <SettingsPage
        settings={settings}
        onSave={async (key, payload) => {
          if (!token) return;
          await updateSetting(token, key, payload);
          const nextSettings = await listSettings(token);
          setSettings(nextSettings);
        }}
      />
    );
  }

  return (
    <AppLayout
      activePage={activePage}
      pageTitle={pageTitles[activePage]}
      currentUser={authenticatedUser}
      onNavigate={navigateSafely}
      onLogout={handleLogout}
    >
      {error ? <div className="app-alert">{error}</div> : null}
      {renderPage()}
      {activeForm ? (
        <RecordModal
          form={activeForm}
          token={token}
          currentUser={authenticatedUser}
          selectedCustomer={selectedCustomer}
          selectedEmployee={selectedEmployee}
          customers={customers}
          policies={policies}
          plans={plans}
          claims={claims}
          onClose={() => setActiveForm(null)}
          onSaved={async () => {
            setActiveForm(null);
            setSelectedCustomer(null);
            setSelectedEmployee(null);
            await reloadCurrentWorkspace();
          }}
          onError={setError}
        />
      ) : null}
    </AppLayout>
  );
}

function BootstrapScreen() {
  return (
    <main className="auth-screen bootstrap-screen">
      <section className="prime-auth-card boot-card">
        <p className="auth-kicker">Health Insurance Platform</p>
        <h2>Loading your account</h2>
        <p className="form-note">Checking your saved session and opening the correct workspace.</p>
      </section>
    </main>
  );
}

function nextYearDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: string | number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function splitIsoDate(value: string | undefined) {
  if (!value) {
    return ["", "", ""] as const;
  }
  const [year = "", month = "", day = ""] = value.split("-");
  return [year, month, day] as const;
}

function getDaysInMonth(year: number, month: number) {
  if (!year || !month) {
    return 31;
  }
  return new Date(year, month, 0).getDate();
}

function clampDay(day: string, maxDay: number) {
  const parsedDay = Number(day);
  if (!parsedDay) {
    return "";
  }
  return String(Math.min(parsedDay, maxDay)).padStart(2, "0");
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatPlanPremium(plan: InsurancePlan) {
  return `${formatMoney(plan.premium_amount)}/year`;
}

function formatPlanCoverage(plan: InsurancePlan) {
  return formatMoney(plan.coverage_amount);
}

function formatStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCustomerName(customers: Customer[], customerId: number) {
  return customers.find((customer) => customer.id === customerId)?.name ?? `Customer #${customerId}`;
}

function daysUntil(dateValue: string) {
  const today = new Date();
  const targetDate = new Date(dateValue);
  const difference = targetDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
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
  expiringPolicies: Policy[];
  isLoading: boolean;
  onNavigate: (page: PageKey) => void;
};

function Dashboard({ stats, claims, policies, premiums, expiringPolicies, isLoading, onNavigate }: DashboardProps) {
  return (
    <div className="dashboard-grid">
      {isLoading ? <div className="app-alert wide-panel">Loading live backend data...</div> : null}
      <section className="stats-grid">
        <StatCard icon={Users} label="Customers" value={String(stats.customers)} trend="Live records" />
        <StatCard icon={ShieldCheck} label="Active Policies" value={String(stats.activePolicies)} trend="Health insurance" />
        <StatCard icon={Clock} label="Pending Claims" value={String(stats.pendingClaims)} trend="Needs review" />
        <StatCard icon={IndianRupee} label="Premium Collection" value={formatMoney(stats.collectedPremium)} trend="Paid premiums" />
      </section>

      <section className="panel wide-panel hero-panel">
        <div>
          <p className="eyebrow">Version One</p>
          <h2>Health Insurance Operations</h2>
          <p>Manage customers, policies, premiums, claims, uploaded documents, and alerts from the backend database.</p>
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
          <div className="chart-bar approved" style={{ height: `${claims.filter((claim) => claim.status === "approved").length * 42 + 42}px` }} />
          <div className="chart-bar pending" style={{ height: `${claims.filter((claim) => claim.status === "pending").length * 42 + 42}px` }} />
          <div className="chart-bar rejected" style={{ height: `${claims.filter((claim) => claim.status === "rejected").length * 42 + 42}px` }} />
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
          <p>{expiringPolicies.length} policies expire in 30 days</p>
          <p>{premiums.filter((premium) => premium.payment_status === "overdue").length} overdue premium alerts</p>
          <p>{claims.filter((claim) => claim.status === "pending").length} claims waiting for decision</p>
          <p>{policies.filter((policy) => policy.status === "expired").length} expired policies need review</p>
        </div>
      </section>
    </div>
  );
}

type CustomerDashboardProps = {
  user: AppUser;
  customer: Customer | null;
  policies: Policy[];
  premiums: Premium[];
  claims: Claim[];
  documents: DocumentRecord[];
  applications: PolicyApplication[];
  plans: InsurancePlan[];
  isLoading: boolean;
  onNavigate: (page: PageKey) => void;
  onSubmitClaim: () => void;
  onUploadDocument: () => void;
  onPayPremium: (id: number) => Promise<void>;
  onApplicationSubmitted: (
    application: PolicyApplicationPayload,
    documents: Array<{ label: string; file: File }>,
  ) => Promise<void>;
};

function CustomerDashboard({
  user,
  customer,
  policies,
  premiums,
  claims,
  documents,
  applications,
  plans,
  isLoading,
  onNavigate,
  onSubmitClaim,
  onUploadDocument,
  onPayPremium,
  onApplicationSubmitted,
}: CustomerDashboardProps) {
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [applicationPlan, setApplicationPlan] = useState<InsurancePlan | null>(null);
  const activeApplication = applications[0] ?? null;
  const activePolicies = policies.filter((policy) => policy.status === "active");
  const unpaidPremiums = premiums.filter((premium) => premium.payment_status !== "paid");
  const nextPremium = [...unpaidPremiums].sort((first, second) => first.due_date.localeCompare(second.due_date))[0];
  const renewalPolicy = [...activePolicies].sort((first, second) => first.end_date.localeCompare(second.end_date))[0];
  const latestPolicy = policies[0];
  const pendingDocuments = documents.filter((document) => document.document_type === "identity").length === 0;
  const policyProgress = [
    activeApplication || activePolicies.length ? "Application Submitted" : "Choose Plan",
    activeApplication || documents.length ? "Documents Collected" : "Upload Required Documents",
    activeApplication ? "Under Verification" : documents.length ? "Under Verification" : "Waiting for Documents",
    activeApplication || !nextPremium ? "Payment Successful" : "Payment Pending",
    activePolicies.length ? "Policy Generated" : activeApplication ? "Policy Generation Pending" : "Policy Pending",
    activePolicies.length ? "Policy Active" : "Activation Pending",
  ];
  const completedTrackingStep = activePolicies.length ? 5 : activeApplication ? 3 : documents.length ? 2 : 0;

  return (
    <div className="dashboard-grid customer-dashboard">
      {isLoading ? <div className="app-alert wide-panel">Loading your policy workspace...</div> : null}

      <section className="stats-grid">
        <StatCard icon={ShieldCheck} label="My Policies" value={String(policies.length + applications.length)} trend={`${activePolicies.length} active · ${applications.length} pending`} />
        <StatCard icon={CreditCard} label="Due Premiums" value={String(unpaidPremiums.length)} trend={nextPremium ? `Next due ${nextPremium.due_date}` : "No dues"} />
        <StatCard icon={FileText} label="Claims" value={String(claims.length)} trend={`${claims.filter((claim) => claim.status === "pending").length} under review`} />
        <StatCard icon={Bell} label="Documents" value={String(documents.length)} trend={pendingDocuments ? "Identity proof needed" : "Uploaded"} />
      </section>

      <section className="panel wide-panel customer-hero-panel">
        <div>
          <p className="eyebrow">Customer workspace</p>
          <h2>Hello {customer?.name ?? user.name}</h2>
          <p>Browse health plans, track policy status, pay premiums, upload documents, and raise claims from one dashboard.</p>
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={() => onNavigate("policies")}>Track Policy</button>
          <button className="secondary-button" onClick={onUploadDocument}>Upload Documents</button>
        </div>
      </section>

      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Browse Insurance Plans</p>
            <h2>Health Insurance Plans</h2>
          </div>
          <span className="badge">Health active · Others coming soon</span>
        </div>
        <div className="customer-plan-grid">
          {plans.filter((plan) => plan.is_active).map((plan) => (
            <article className="customer-plan-card" key={plan.name}>
              <span>{plan.tag}</span>
              <h3>{plan.name}</h3>
              <p>{formatPlanPremium(plan)}</p>
              <strong>{formatPlanCoverage(plan)} coverage</strong>
              <ul>{plan.services.slice(0, 3).map((service) => <li key={service}>{service}</li>)}</ul>
              <button className="secondary-button" onClick={() => setSelectedPlan(plan)}>View / Apply</button>
            </article>
          ))}
        </div>
      </section>

      {selectedPlan ? (
        <PlanDetailsPanel
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onApply={() => {
            setSelectedPlan(null);
            setApplicationPlan(selectedPlan);
          }}
        />
      ) : null}

      {applicationPlan ? (
        <ApplicationWizard
          plan={applicationPlan}
          customer={customer}
          user={user}
          onClose={() => setApplicationPlan(null)}
          onSubmitted={async (application, applicationDocuments) => {
            await onApplicationSubmitted(application, applicationDocuments);
            setApplicationPlan(null);
          }}
        />
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <h2>Policy Tracking</h2>
          <BadgeCheck size={20} />
        </div>
        <div className="tracking-list">
          {policyProgress.map((step, index) => (
            <div className={index <= completedTrackingStep ? "done" : ""} key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
        {activeApplication ? (
          <div className="application-status-card">
            <p className="eyebrow">Application {activeApplication.id}</p>
            <h3>{activeApplication.plan_name}</h3>
            <p>Submitted on {new Date(activeApplication.created_at).toLocaleDateString()} · Company verification is in progress.</p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Renewal Reminder</h2>
          <CalendarCheck size={20} />
        </div>
        {renewalPolicy ? (
          <div className="renewal-card">
            <p className="eyebrow">{renewalPolicy.policy_number}</p>
            <h3>{daysUntil(renewalPolicy.end_date)} days left</h3>
            <p>Expires on {renewalPolicy.end_date}. Renew early to keep coverage active.</p>
            <button className="secondary-button" onClick={() => onNavigate("premiums")}>Renew / Pay Premium</button>
          </div>
        ) : (
          <p className="empty-state">No active policy yet. Apply for a health plan to start coverage.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Payment</h2>
          <IndianRupee size={20} />
        </div>
        {nextPremium ? (
          <div className="payment-card">
            <p>Policy #{nextPremium.policy_id}</p>
            <strong>{formatMoney(nextPremium.amount)}</strong>
            <span>Due {nextPremium.due_date}</span>
            <button className="primary-button full-width" onClick={() => onPayPremium(nextPremium.id)}>Pay Now</button>
          </div>
        ) : (
          <p className="empty-state">All premiums are paid.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Claim Status</h2>
          <AlertTriangle size={20} />
        </div>
        <div className="activity-list">
          {claims.slice(0, 3).map((claim) => (
            <p key={claim.id}>CLM-{claim.id}: {formatStatus(claim.status)} · {formatMoney(claim.claim_amount)}</p>
          ))}
          {claims.length === 0 ? <p>No claims submitted yet.</p> : null}
        </div>
        <button className="secondary-button full-width" onClick={onSubmitClaim}>Raise Claim</button>
      </section>

      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current Policy</p>
            <h2>{latestPolicy?.policy_number ?? "No policy generated yet"}</h2>
          </div>
          {latestPolicy ? <StatusBadge status={formatStatus(latestPolicy.status)} /> : null}
        </div>
        <div className="customer-summary-grid">
          <div><span>Customer</span><strong>{customer?.name ?? user.name}</strong></div>
          <div><span>Email</span><strong>{customer?.email ?? user.email}</strong></div>
          <div><span>Mobile</span><strong>{customer?.phone ?? "Not added"}</strong></div>
          <div><span>Coverage</span><strong>{latestPolicy ? formatMoney(Number(latestPolicy.premium_amount) * 80) : "Apply first"}</strong></div>
          <div><span>Premium</span><strong>{latestPolicy ? formatMoney(latestPolicy.premium_amount) : "-"}</strong></div>
          <div><span>Documents</span><strong>{documents.length} uploaded</strong></div>
        </div>
      </section>
    </div>
  );
}

function PlanDetailsPanel({ plan, onClose, onApply }: { plan: InsurancePlan; onClose: () => void; onApply: () => void }) {
  return (
    <section className="panel wide-panel plan-details-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Plan Details</p>
          <h2>{plan.name}</h2>
        </div>
        <button className="text-button" onClick={onClose}>Close</button>
      </div>

      <div className="plan-details-hero">
        <div>
          <span className="badge">{plan.tag}</span>
          <p>{plan.description}</p>
        </div>
        <div className="plan-price-card">
          <span>Yearly Premium</span>
          <strong>{formatPlanPremium(plan)}</strong>
          <p>{formatPlanCoverage(plan)} health coverage</p>
        </div>
      </div>

      <div className="plan-detail-grid">
        <PlanDetailList title="Services Included" items={plan.services} />
        <PlanDetailList title="Customer Benefits" items={plan.benefits} />
        <PlanDetailList title="Required Documents" items={plan.required_documents} />
        <PlanDetailList title="Important Exclusions" items={plan.exclusions} />
      </div>

      <div className="application-flow-card">
        <h3>Application Flow</h3>
        <div>
          {["Fill application", "Upload documents", "Verification", "Payment", "Policy generated"].map((step, index) => (
            <span key={step}>{index + 1}. {step}</span>
          ))}
        </div>
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={onApply}>Apply for {plan.name}</button>
        <button className="secondary-button" onClick={onClose}>Back to Plans</button>
      </div>
    </section>
  );
}

function PlanDetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="plan-detail-card">
      <h3>{title}</h3>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}

function ApplicationWizard({ plan, customer, user, onClose, onSubmitted }: { plan: InsurancePlan; customer: Customer | null; user: AppUser; onClose: () => void; onSubmitted: (application: PolicyApplicationPayload, documents: Array<{ label: string; file: File }>) => void | Promise<void> }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    name: customer?.name ?? user.name,
    dob: customer?.dob ?? "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    address: customer?.address ?? "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeAge: "",
    height: "",
    weight: "",
    smoking: "No",
    alcohol: "No",
    previousDisease: "",
    currentMedication: "",
    paymentMethod: "UPI",
  });
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const steps = ["Plan", "Personal", "Nominee", "Documents", "Payment", "Submit"];
  const requiredDocuments = plan.required_documents;
  const isPdfFile = (file: File | null | undefined) =>
    Boolean(file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")));
  const getDocumentInputId = (document: string) => `document-upload-${document.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const uploadedPdfCount = requiredDocuments.filter((document) => isPdfFile(uploadedDocuments[document])).length;
  const documentsReady = requiredDocuments.every((document) => isPdfFile(uploadedDocuments[document]));
  const canContinue =
    step === 0 ||
    (step === 1 && values.name && values.dob && values.gender && values.address) ||
    (step === 2 && values.nomineeName && values.nomineeRelation && values.height && values.weight) ||
    (step === 3 && documentsReady) ||
    (step === 4 && values.paymentMethod);

  async function submitApplication() {
    const applicationDocuments = requiredDocuments.map((label) => ({
      label,
      file: uploadedDocuments[label] as File,
    }));
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await onSubmitted({
        plan_id: plan.id,
        plan_name: plan.name,
        policy_type: "Health Insurance",
        premium_amount: formatPlanPremium(plan),
        coverage_amount: formatPlanCoverage(plan),
        applicant_name: values.name,
        date_of_birth: values.dob,
        gender: values.gender,
        marital_status: values.maritalStatus,
        occupation: values.occupation,
        address: values.address,
        nominee_name: values.nomineeName,
        nominee_relation: values.nomineeRelation,
        nominee_age: Number(values.nomineeAge),
        height_cm: values.height,
        weight_kg: values.weight,
        smoking: values.smoking,
        alcohol: values.alcohol,
        previous_disease: values.previousDisease,
        current_medication: values.currentMedication,
        payment_method: values.paymentMethod,
        document_names: requiredDocuments.map((document) => uploadedDocuments[document]?.name ?? document),
      }, applicationDocuments);
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : "Application submission failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card application-wizard-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Apply for Health Insurance</p>
            <h2>{plan.name}</h2>
          </div>
          <button className="text-button" onClick={onClose}>Close</button>
        </div>

        <div className="wizard-steps">
          {steps.map((label, index) => (
            <span className={index === step ? "active" : index < step ? "done" : ""} key={label}>{index + 1}. {label}</span>
          ))}
        </div>

        {step === 0 ? (
          <div className="wizard-panel">
            <h3>Plan Review</h3>
            <div className="customer-summary-grid">
              <div><span>Plan</span><strong>{plan.name}</strong></div>
              <div><span>Coverage</span><strong>{formatPlanCoverage(plan)}</strong></div>
              <div><span>Premium</span><strong>{formatPlanPremium(plan)}</strong></div>
            </div>
            <p>{plan.description}</p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="modal-form">
            <Input label="Full Name" name="name" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
            <DateOfBirthInput label="Date of Birth" name="dob" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
            <Select label="Gender" name="gender" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} options={[{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }, { label: "Other", value: "Other" }]} />
            <Select label="Marital Status" name="maritalStatus" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} options={[{ label: "Single", value: "Single" }, { label: "Married", value: "Married" }]} />
            <Input label="Occupation" name="occupation" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
            <Input label="Address" name="address" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="modal-form">
            <Input label="Nominee Name" name="nomineeName" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
            <Select
              label="Relationship"
              name="nomineeRelation"
              values={values}
              setValues={(nextValues) => setValues(nextValues as typeof values)}
              options={[
                { label: "Self", value: "Self" },
                { label: "Spouse", value: "Spouse" },
                { label: "Father", value: "Father" },
                { label: "Mother", value: "Mother" },
                { label: "Son", value: "Son" },
                { label: "Daughter", value: "Daughter" },
                { label: "Brother", value: "Brother" },
                { label: "Sister", value: "Sister" },
                { label: "Other", value: "Other" },
              ]}
            />
            <Input
              label="Nominee Age"
              name="nomineeAge"
              type="number"
              inputMode="numeric"
              min="0"
              max="120"
              numericMode="integer"
              values={values}
              setValues={(nextValues) => setValues(nextValues as typeof values)}
            />
            <Input
              label="Height (cm)"
              name="height"
              type="number"
              inputMode="decimal"
              min="0"
              max="300"
              step="0.1"
              numericMode="decimal"
              values={values}
              setValues={(nextValues) => setValues(nextValues as typeof values)}
            />
            <Input
              label="Weight (kg)"
              name="weight"
              type="number"
              inputMode="decimal"
              min="0"
              max="500"
              step="0.1"
              numericMode="decimal"
              values={values}
              setValues={(nextValues) => setValues(nextValues as typeof values)}
            />
            <Select label="Smoking?" name="smoking" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} options={[{ label: "No", value: "No" }, { label: "Yes", value: "Yes" }]} />
            <Select label="Alcohol?" name="alcohol" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} options={[{ label: "No", value: "No" }, { label: "Yes", value: "Yes" }]} />
            <Input label="Previous Disease" name="previousDisease" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
            <Input label="Current Medication" name="currentMedication" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wizard-panel">
            <h3>Upload Required PDF Documents</h3>
            <p>Upload one PDF for every required document. You can continue only after all required PDFs are uploaded.</p>
            <div className="document-upload-grid">
              {requiredDocuments.map((document) => (
                <div className="document-upload-item" key={document}>
                  <div className="document-upload-meta">
                    <span>{document}</span>
                    <small>
                      {uploadedDocuments[document]
                        ? isPdfFile(uploadedDocuments[document])
                          ? uploadedDocuments[document]?.name
                          : "Please upload PDF file only"
                        : "PDF required"}
                    </small>
                  </div>
                  <span className={isPdfFile(uploadedDocuments[document]) ? "document-upload-status ready" : "document-upload-status"}>
                    {isPdfFile(uploadedDocuments[document]) ? <BadgeCheck size={16} /> : <Upload size={16} />}
                    {isPdfFile(uploadedDocuments[document]) ? "Uploaded" : "Upload PDF"}
                  </span>
                  <label className="document-upload-button" htmlFor={getDocumentInputId(document)}>
                    {isPdfFile(uploadedDocuments[document]) ? "Replace PDF" : "Choose PDF"}
                  </label>
                  <input
                    id={getDocumentInputId(document)}
                    accept=".pdf,application/pdf"
                    onChange={(event) => setUploadedDocuments({ ...uploadedDocuments, [document]: event.target.files?.[0] ?? null })}
                    type="file"
                  />
                </div>
              ))}
            </div>
            <div className="customer-summary-grid">
              <div><span>Uploaded</span><strong>{uploadedPdfCount} / {requiredDocuments.length} PDFs</strong></div>
              <div><span>Next Step</span><strong>{documentsReady ? "Enabled" : "Waiting for all PDFs"}</strong></div>
            </div>
            {!documentsReady ? <p className="form-note">Continue stays disabled until every required document has a PDF uploaded.</p> : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="wizard-panel">
            <h3>Payment</h3>
            <p>This is a mock payment step for learning. Real payment gateway can be added later.</p>
            <Select label="Payment Method" name="paymentMethod" values={values} setValues={(nextValues) => setValues(nextValues as typeof values)} options={[{ label: "UPI", value: "UPI" }, { label: "Debit Card", value: "Debit Card" }, { label: "Credit Card", value: "Credit Card" }, { label: "Net Banking", value: "Net Banking" }]} />
            <div className="plan-price-card">
              <span>Amount Payable</span>
              <strong>{formatPlanPremium(plan)}</strong>
              <p>Transaction will be marked successful after final submit.</p>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="wizard-panel">
            <h3>Review and Submit</h3>
            <div className="customer-summary-grid">
              <div><span>Applicant</span><strong>{values.name}</strong></div>
              <div><span>Nominee</span><strong>{values.nomineeName}</strong></div>
              <div><span>Payment</span><strong>{values.paymentMethod}</strong></div>
              <div><span>Documents</span><strong>{requiredDocuments.length} PDFs uploaded</strong></div>
              <div><span>Status after submit</span><strong>Under Verification</strong></div>
            </div>
            <p>After submission, the company verifies documents and health details. Once approved, policy number and certificate are generated.</p>
          </div>
        ) : null}

        <div className="wizard-actions">
          {submitError ? <p className="error-message">{submitError}</p> : null}
          <button className="secondary-button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          {step < steps.length - 1 ? (
            <button className="primary-button" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue</button>
          ) : (
            <button className="primary-button" disabled={isSubmitting} onClick={() => void submitApplication()}>
              {isSubmitting ? "Submitting and uploading..." : "Submit Application"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function EmployeesPage({ employees, search, onSearch, onOpenForm, onEdit }: { employees: Employee[]; search: string; onSearch: (value: string) => void; onOpenForm: () => void; onEdit: (employee: Employee) => void }) {
  const employeePagination = useListPagination(employees, search);
  return (
    <section className="panel page-panel">
      <Toolbar title="Employees" actionLabel="Add Employee" onAction={onOpenForm} search={search} onSearch={onSearch} />
      <div className="history-summary-grid">
        <div><span>Total Staff</span><strong>{employees.length}</strong></div>
        <div><span>Administrators</span><strong>{employees.filter((employee) => employee.role === "admin").length}</strong></div>
        <div><span>Insurance Agents</span><strong>{employees.filter((employee) => employee.role === "agent").length}</strong></div>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {employeePagination.items.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td><StatusBadge status={formatStatus(employee.role)} /></td>
                <td><button className="mini-button" onClick={() => onEdit(employee)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls {...employeePagination} label="employees" />
    </section>
  );
}

function CustomersPage({
  customers,
  applications,
  plans,
  policies,
  premiums,
  claims,
  documents,
  search,
  onSearch,
  onOpenForm,
  onEdit,
  isHydratingWorkspace,
}: {
  customers: Customer[];
  applications: PolicyApplication[];
  plans: InsurancePlan[];
  policies: Policy[];
  premiums: Premium[];
  claims: Claim[];
  documents: DocumentRecord[];
  search: string;
  onSearch: (value: string) => void;
  onOpenForm: () => void;
  onEdit: (customer: Customer) => void;
  isHydratingWorkspace: boolean;
}) {
  const customerPagination = useListPagination(customers, search);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const customersWithInsurance = new Set([
    ...applications.map((application) => application.customer_id),
    ...policies.map((policy) => policy.customer_id),
  ]).size;

  return (
    <section className="panel page-panel">
      <Toolbar title="Customers" actionLabel="Add Customer" onAction={onOpenForm} search={search} onSearch={onSearch} />
      {isHydratingWorkspace ? <div className="app-alert wide-panel">Loading more customer records...</div> : null}
      <div className="history-summary-grid">
        <div><span>Registered Customers</span><strong>{customers.length}</strong></div>
        <div><span>Plan Applications</span><strong>{applications.length}</strong></div>
        <div><span>Active Policies</span><strong>{policies.filter((policy) => policy.status === "active").length}</strong></div>
        <div><span>Customers With Insurance</span><strong>{customersWithInsurance}</strong></div>
      </div>
      <div className="table-card">
        <table className="customer-insurance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Selected Plan</th>
              <th>Application</th>
              <th>Policy</th>
              <th>Insurance History</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customerPagination.items.map((customer) => {
              const customerApplications = applications
                .filter((application) => application.customer_id === customer.id)
                .sort((first, second) => second.created_at.localeCompare(first.created_at));
              const customerPolicies = policies.filter((policy) => policy.customer_id === customer.id);
              const policyIds = new Set(customerPolicies.map((policy) => policy.id));
              const customerClaims = claims.filter((claim) => policyIds.has(claim.policy_id));
              const customerPremiums = premiums.filter((premium) => policyIds.has(premium.policy_id));
              const customerDocuments = documents.filter((document) => document.customer_id === customer.id);
              const latestApplication = customerApplications[0] ?? null;
              const latestPolicy = customerPolicies[0] ?? null;
              const linkedPlan = plans.find((plan) => plan.id === (latestApplication?.plan_id ?? latestPolicy?.plan_id));
              const selectedPlanName = latestApplication?.plan_name ?? linkedPlan?.name ?? "No plan selected";
              return (
                <tr key={customer.id}>
                  <td>{customer.id}</td>
                  <td>
                    <div className="customer-table-identity">
                      <strong>{customer.name}</strong>
                      <span>{customer.email}</span>
                      <small>{customer.phone}</small>
                    </div>
                  </td>
                  <td>
                    <div className="customer-plan-cell">
                      <strong>{selectedPlanName}</strong>
                      <span>{latestApplication ? latestApplication.coverage_amount : linkedPlan ? formatPlanCoverage(linkedPlan) : "Registration only"}</span>
                    </div>
                  </td>
                  <td>
                    {latestApplication ? (
                      <div className="customer-status-cell">
                        <StatusBadge status={formatStatus(latestApplication.status)} />
                        <small>{customerApplications.length} application{customerApplications.length === 1 ? "" : "s"}</small>
                      </div>
                    ) : (
                      <span className="muted-status">Not submitted</span>
                    )}
                  </td>
                  <td>
                    {latestPolicy ? (
                      <div className="customer-status-cell">
                        <StatusBadge status={formatStatus(latestPolicy.status)} />
                        <small>{latestPolicy.policy_number}</small>
                      </div>
                    ) : (
                      <span className="muted-status">Not generated</span>
                    )}
                  </td>
                  <td>
                    <div className="customer-history-pills">
                      <span className="history-pill">{customerPolicies.length} policies</span>
                      <span className="history-pill">{customerPremiums.length} payments</span>
                      <span className="history-pill">{customerClaims.length} claims</span>
                      <span className="history-pill">{customerDocuments.length} docs</span>
                    </div>
                  </td>
                  <td>
                    <div className="customer-row-actions">
                      <button className="mini-button" onClick={() => setHistoryCustomer(customer)}>View Details</button>
                      <button className="text-button" onClick={() => onEdit(customer)}>Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationControls {...customerPagination} label="customers" />

      {historyCustomer ? (
        <CustomerInsuranceHistoryModal
          customer={historyCustomer}
          applications={applications.filter((application) => application.customer_id === historyCustomer.id)}
          plans={plans}
          policies={policies.filter((policy) => policy.customer_id === historyCustomer.id)}
          premiums={premiums}
          claims={claims}
          documents={documents.filter((document) => document.customer_id === historyCustomer.id)}
          onClose={() => setHistoryCustomer(null)}
          onEdit={() => {
            setHistoryCustomer(null);
            onEdit(historyCustomer);
          }}
        />
      ) : null}
    </section>
  );
}

function CustomerInsuranceHistoryModal({
  customer,
  applications,
  plans,
  policies,
  premiums,
  claims,
  documents,
  onClose,
  onEdit,
}: {
  customer: Customer;
  applications: PolicyApplication[];
  plans: InsurancePlan[];
  policies: Policy[];
  premiums: Premium[];
  claims: Claim[];
  documents: DocumentRecord[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const policyIds = new Set(policies.map((policy) => policy.id));
  const customerPremiums = premiums.filter((premium) => policyIds.has(premium.policy_id));
  const customerClaims = claims.filter((claim) => policyIds.has(claim.policy_id));

  return (
    <div className="modal-backdrop">
      <section className="modal-card customer-history-modal">
        <div className="customer-history-header">
          <div className="profile-avatar">{customer.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <p className="eyebrow">Customer #{customer.id}</p>
            <h2>{customer.name}</h2>
            <p>{customer.email} · {customer.phone}</p>
          </div>
          <button className="text-button" onClick={onClose}>Close</button>
        </div>

        <div className="customer-history-summary">
          <div><span>Applications</span><strong>{applications.length}</strong></div>
          <div><span>Policies</span><strong>{policies.length}</strong></div>
          <div><span>Premiums</span><strong>{customerPremiums.length}</strong></div>
          <div><span>Claims</span><strong>{customerClaims.length}</strong></div>
          <div><span>Documents</span><strong>{documents.length}</strong></div>
        </div>

        <section className="customer-history-section">
          <div className="section-heading">
            <h3>Plan Applications</h3>
            <span>{applications.length} records</span>
          </div>
          {applications.length ? (
            <div className="customer-history-list">
              {[...applications].sort((first, second) => second.created_at.localeCompare(first.created_at)).map((application) => (
                <article key={application.id}>
                  <div>
                    <strong>{application.plan_name}</strong>
                    <span>{application.coverage_amount} coverage · {application.premium_amount}</span>
                    <small>Submitted {new Date(application.created_at).toLocaleDateString()}</small>
                  </div>
                  <StatusBadge status={formatStatus(application.status)} />
                </article>
              ))}
            </div>
          ) : <p className="empty-state">This customer has not submitted a plan application.</p>}
        </section>

        <section className="customer-history-section">
          <div className="section-heading">
            <h3>Generated Policies</h3>
            <span>{policies.length} records</span>
          </div>
          {policies.length ? (
            <div className="customer-history-list">
              {policies.map((policy) => {
                const plan = plans.find((item) => item.id === policy.plan_id);
                return (
                  <article key={policy.id}>
                    <div>
                      <strong>{plan?.name ?? policy.policy_type}</strong>
                      <span>{policy.policy_number} · Premium {formatMoney(policy.premium_amount)}</span>
                      <small>{policy.start_date} to {policy.end_date}</small>
                    </div>
                    <StatusBadge status={formatStatus(policy.status)} />
                  </article>
                );
              })}
            </div>
          ) : <p className="empty-state">No policy has been generated yet.</p>}
        </section>

        <section className="customer-history-section">
          <h3>Contact and address</h3>
          <div className="customer-contact-card">
            <div><span>Email</span><strong>{customer.email}</strong></div>
            <div><span>Phone</span><strong>{customer.phone}</strong></div>
            <div><span>Date of birth</span><strong>{customer.dob ?? "Not provided"}</strong></div>
            <div><span>Address</span><strong>{customer.address}</strong></div>
          </div>
        </section>

        <div className="plan-editor-actions">
          <button className="secondary-button" onClick={onClose}>Close</button>
          <button className="primary-button" onClick={onEdit}>Edit Customer</button>
        </div>
      </section>
    </div>
  );
}

function PoliciesPage({
  policies,
  applications,
  documents,
  customers,
  canManage,
  isCustomerView,
  onOpenForm,
  onBrowsePlans,
  onRenew,
  onCancel,
  onReviewApplication,
  onVerifyApplicationDocuments,
  onDownloadApplicationDocument,
}: {
  policies: Policy[];
  applications: PolicyApplication[];
  documents: DocumentRecord[];
  customers: Customer[];
  canManage: boolean;
  isCustomerView: boolean;
  onOpenForm: () => void;
  onBrowsePlans: () => void;
  onRenew: (policy: Policy) => Promise<void>;
  onCancel: (id: number) => Promise<void>;
  onReviewApplication: (id: number, status: "approved" | "rejected") => Promise<void>;
  onVerifyApplicationDocuments: (documents: DocumentRecord[], status: "verified" | "rejected") => Promise<void>;
  onDownloadApplicationDocument: (document: DocumentRecord) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [policySearch, setPolicySearch] = useState("");
  const [applicationAction, setApplicationAction] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const filteredPolicies = policies.filter((policy) => {
    const matchesStatus = statusFilter === "all" || policy.status === statusFilter;
    const label = `${policy.policy_number} ${policy.policy_type} ${getCustomerName(customers, policy.customer_id)}`.toLowerCase();
    return matchesStatus && label.includes(policySearch.toLowerCase());
  });
  const policyPagination = useListPagination(filteredPolicies, `${statusFilter}:${policySearch}`);
  const applicationPagination = useListPagination(applications, "applications", 6);

  async function runApplicationAction(actionKey: string, action: () => Promise<void>, successMessage: string) {
    setApplicationAction(actionKey);
    setApplicationMessage("");
    setApplicationError("");
    try {
      await action();
      setApplicationMessage(successMessage);
    } catch (caughtError) {
      setApplicationError(caughtError instanceof Error ? caughtError.message : "Application action failed");
    } finally {
      setApplicationAction(null);
    }
  }

  return (
    <section className="panel page-panel">
      <Toolbar title="Health Policies" actionLabel="Create Policy" onAction={canManage ? onOpenForm : undefined} />
      <div className="filter-row">
        <label>
          Search Policy
          <input value={policySearch} onChange={(event) => setPolicySearch(event.target.value)} placeholder="Policy no, type, customer" />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      {policies.length === 0 && applications.length === 0 ? (
        <div className="empty-state empty-policy-state">
          <ShieldCheck size={34} />
          <h3>You do not have any policy yet</h3>
          <p>Buy your health insurance policy first. After purchase, your policy number, premium, renewal date, and status will show here.</p>
          <button className="primary-button" onClick={onBrowsePlans}>Buy Your Policy</button>
        </div>
      ) : null}
      {policies.length > 0 && filteredPolicies.length === 0 ? <p className="empty-state">No policies match this filter.</p> : null}
      {applicationMessage ? <div className="success-message application-action-message">{applicationMessage}</div> : null}
      {applicationError ? <div className="app-alert application-action-message">{applicationError}</div> : null}
      {applications.length > 0 ? (
        <div className="application-card-grid">
          {applicationPagination.items.map((application) => {
            const applicationDocuments = documents.filter((document) => document.application_id === application.id);
            const pendingDocuments = applicationDocuments.filter((document) => document.verification_status === "pending");
            const rejectedDocuments = applicationDocuments.filter((document) => document.verification_status === "rejected");
            const documentsReady =
              applicationDocuments.length > 0
              && applicationDocuments.every((document) => document.verification_status === "verified");
            const actionBusy = applicationAction?.startsWith(`${application.id}:`) ?? false;
            return (
            <article className="record-card application-policy-card" key={application.id}>
              <div className="record-card-header">
                <div>
                  <p className="eyebrow">Application {application.id}</p>
                  <h3>{application.plan_name}</h3>
                </div>
                <StatusBadge status={formatStatus(application.status)} />
              </div>
              <dl>
                <div><dt>Customer</dt><dd>{getCustomerName(customers, application.customer_id)}</dd></div>
                <div><dt>Coverage</dt><dd>{application.coverage_amount}</dd></div>
                <div><dt>Premium</dt><dd>{application.premium_amount}</dd></div>
                <div><dt>Submitted</dt><dd>{new Date(application.created_at).toLocaleDateString()}</dd></div>
                <div><dt>Uploaded PDFs</dt><dd>{application.document_names?.length ?? 0}</dd></div>
                <div><dt>Next Step</dt><dd>{application.status === "pending" ? "Admin verification" : application.status === "approved" ? "Policy generated" : "Customer rework needed"}</dd></div>
              </dl>
              <section className="application-document-review">
                <div className="application-document-heading">
                  <div>
                    <h4>Document verification</h4>
                    <p>
                      {documentsReady
                        ? "All uploaded documents are verified. This application can be approved."
                        : rejectedDocuments.length
                          ? `${rejectedDocuments.length} document(s) were rejected. The customer must upload replacements.`
                          : `${pendingDocuments.length} document(s) still need verification before approval.`}
                    </p>
                  </div>
                  <StatusBadge status={documentsReady ? "Ready" : rejectedDocuments.length ? "Blocked" : "Review Required"} />
                </div>
                {applicationDocuments.length ? (
                  <div className="application-document-list">
                    {applicationDocuments.map((document) => (
                      <article key={document.id}>
                        <div>
                          <FileText size={18} />
                          <span>
                            <strong>{document.file_name}</strong>
                            <small>Document #{document.id}</small>
                          </span>
                        </div>
                        <StatusBadge status={formatStatus(document.verification_status)} />
                        <div className="button-row">
                          <button className="text-button" onClick={() => void onDownloadApplicationDocument(document)}>View</button>
                          {document.verification_status === "pending" && canManage ? (
                            <>
                              <button
                                className="mini-button"
                                disabled={actionBusy}
                                onClick={() => void runApplicationAction(
                                  `${application.id}:verify:${document.id}`,
                                  () => onVerifyApplicationDocuments([document], "verified"),
                                  `${document.file_name} verified.`,
                                )}
                              >
                                Verify
                              </button>
                              <button
                                className="danger-button compact-button"
                                disabled={actionBusy}
                                onClick={() => void runApplicationAction(
                                  `${application.id}:reject-document:${document.id}`,
                                  () => onVerifyApplicationDocuments([document], "rejected"),
                                  `${document.file_name} rejected.`,
                                )}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No uploaded document records are linked to this application.</p>
                )}
                {pendingDocuments.length > 1 && canManage ? (
                  <button
                    className="secondary-button verify-all-button"
                    disabled={actionBusy}
                    onClick={() => void runApplicationAction(
                      `${application.id}:verify-all`,
                      () => onVerifyApplicationDocuments(pendingDocuments, "verified"),
                      `All ${pendingDocuments.length} pending documents verified.`,
                    )}
                  >
                    <BadgeCheck size={17} />
                    Verify All Pending Documents
                  </button>
                ) : null}
              </section>
              {!isCustomerView && canManage && application.status === "pending" ? (
                <div className="application-decision-panel">
                  <div>
                    <strong>Application decision</strong>
                    <span>{documentsReady ? "Verification complete. You can approve or reject this application." : "Approval unlocks after every document is verified. Rejection remains available."}</span>
                  </div>
                  <div className="button-row">
                    <button
                      className="primary-button"
                      disabled={!documentsReady || actionBusy}
                      title={documentsReady ? "Approve and generate policy" : "Verify all documents before approval"}
                      onClick={() => void runApplicationAction(
                        `${application.id}:approve`,
                        () => onReviewApplication(application.id, "approved"),
                        `${application.plan_name} approved and policy generated.`,
                      )}
                    >
                      {applicationAction === `${application.id}:approve` ? "Approving..." : "Approve & Generate Policy"}
                    </button>
                    <button
                      className="danger-button"
                      disabled={actionBusy}
                      onClick={() => void runApplicationAction(
                        `${application.id}:reject`,
                        () => onReviewApplication(application.id, "rejected"),
                        `${application.plan_name} application rejected.`,
                      )}
                    >
                      {applicationAction === `${application.id}:reject` ? "Rejecting..." : "Reject Application"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="tracking-list compact">
                {["Application Submitted", "Documents Collected", "Under Verification", "Policy Generation Pending", "Activation Pending"].map((step, index) => (
                  <div className={index <= (application.status === "approved" ? 4 : application.status === "rejected" ? 2 : 2) ? "done" : ""} key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </article>
            );
          })}
        </div>
      ) : null}
      <PaginationControls {...applicationPagination} label="applications" />
      <div className="card-grid">
        {policyPagination.items.map((policy) => (
          <article className="record-card" key={policy.id}>
            <div className="record-card-header">
              <div>
                <p className="eyebrow">{policy.policy_number}</p>
                <h3>{canManage ? getCustomerName(customers, policy.customer_id) : policy.policy_type}</h3>
              </div>
              <StatusBadge status={formatStatus(policy.status)} />
            </div>
            <dl>
              <div><dt>Type</dt><dd>{policy.policy_type}</dd></div>
              <div><dt>Premium</dt><dd>{formatMoney(policy.premium_amount)}</dd></div>
              <div><dt>End Date</dt><dd>{policy.end_date}</dd></div>
              <div><dt>Expiry Alert</dt><dd>{policy.status === "active" && daysUntil(policy.end_date) <= 30 ? `${daysUntil(policy.end_date)} days left` : "No alert"}</dd></div>
            </dl>
            {canManage ? (
              <div className="button-row">
                <button className="secondary-button" onClick={() => onRenew(policy)}>Renew</button>
                <button className="danger-button" onClick={() => onCancel(policy.id)}>Cancel</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <PaginationControls {...policyPagination} label="policies" />
    </section>
  );
}

function PremiumsPage({ premiums, canManage, canPay, onOpenForm, onMarkPaid }: { premiums: Premium[]; canManage: boolean; canPay: boolean; onOpenForm: () => void; onMarkPaid: (id: number) => Promise<void> }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredPremiums = premiums.filter((premium) => statusFilter === "all" || premium.payment_status === statusFilter);
  const premiumPagination = useListPagination(filteredPremiums, statusFilter);

  return (
    <section className="panel page-panel">
      <Toolbar title="Premium Tracking" actionLabel="Record Premium" onAction={canManage ? onOpenForm : undefined} />
      <div className="filter-row">
        <label>
          Payment Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All payments</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
      </div>
      {premiums.length === 0 ? <p className="empty-state">No premium payment history yet.</p> : null}
      {premiums.length > 0 && filteredPremiums.length === 0 ? <p className="empty-state">No payments match this filter.</p> : null}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Policy</th>
              <th>Due Date</th>
              <th>Paid Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {premiumPagination.items.map((premium) => (
              <tr key={premium.id}>
                <td>{premium.id}</td>
                <td>{premium.policy_id}</td>
                <td>{premium.due_date}</td>
                <td>{premium.payment_date ?? "-"}</td>
                <td>{formatMoney(premium.amount)}</td>
                <td><StatusBadge status={formatStatus(premium.payment_status)} /></td>
                <td>
                  {canManage ? <button className="mini-button" onClick={() => onMarkPaid(premium.id)}>Mark paid</button> : null}
                  {canPay && premium.payment_status !== "paid" ? <button className="mini-button" onClick={() => onMarkPaid(premium.id)}>Pay now</button> : null}
                  {!canManage && (!canPay || premium.payment_status === "paid") ? <span className="table-note">View only</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls {...premiumPagination} label="payments" />
    </section>
  );
}

function ClaimsPage({
  claims,
  agents,
  currentUser,
  canManage,
  onOpenForm,
  onDecision,
  onAssign,
  onVerify,
  onSettle,
  isHydratingWorkspace,
}: {
  claims: Claim[];
  agents: Employee[];
  currentUser: AppUser;
  canManage: boolean;
  onOpenForm: () => void;
  onDecision: (id: number, status: "approved" | "rejected") => Promise<void>;
  onAssign: (id: number, agentId: number) => Promise<void>;
  onVerify: (id: number, status: "verified" | "rejected") => Promise<void>;
  onSettle: (claim: Claim) => Promise<void>;
  isHydratingWorkspace: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const approvedClaims = claims.filter((claim) => claim.status === "approved");
  const rejectedClaims = claims.filter((claim) => claim.status === "rejected");
  const filteredClaims = claims.filter((claim) => statusFilter === "all" || claim.status === statusFilter);
  const claimPagination = useListPagination(filteredClaims, statusFilter);

  return (
    <div className="claims-workspace">
      <section className="panel page-panel">
        <Toolbar title="Claim Management" actionLabel="Submit Claim" onAction={onOpenForm} />
        {isHydratingWorkspace ? <div className="app-alert wide-panel">Loading more claim history...</div> : null}
        <div className="filter-row">
          <label>
            Claim Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All claims</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>

        <div className="claims-summary-grid">
          <div><span>Total Claims</span><strong>{claims.length}</strong></div>
          <div><span>Under Review</span><strong>{pendingClaims.length}</strong></div>
          <div><span>Approved</span><strong>{approvedClaims.length}</strong></div>
          <div><span>Rejected</span><strong>{rejectedClaims.length}</strong></div>
        </div>

        {claims.length === 0 ? (
          <div className="empty-state empty-claim-state">
            <AlertTriangle size={34} />
            <h3>No claims submitted yet</h3>
            <p>If hospitalization or medical expenses happen, submit a claim with policy number, bill amount, reason, bills, and reports.</p>
            <button className="primary-button" onClick={onOpenForm}>Raise Your First Claim</button>
          </div>
        ) : null}

        <div className="claim-card-grid">
          {claimPagination.items.map((claim) => (
            <article className="claim-card" key={claim.id}>
              <div className="record-card-header">
                <div>
                  <p className="eyebrow">Claim No. CLM-{claim.id}</p>
                  <h3>Policy #{claim.policy_id}</h3>
                </div>
                <StatusBadge status={formatStatus(claim.status)} />
              </div>
              <div className="claim-amount-row">
                <span>Claim Amount</span>
                <strong>{formatMoney(claim.claim_amount)}</strong>
              </div>
              <p className="claim-reason">{claim.reason}</p>
              <div className="claim-progress-row">
                {getClaimSteps(claim.status).map((step) => (
                  <span className={step.done ? "done" : ""} key={step.label}>{step.label}</span>
                ))}
              </div>
              <dl>
                <div><dt>Submitted</dt><dd>{new Date(claim.submission_date).toLocaleDateString()}</dd></div>
                <div><dt>Assigned Agent</dt><dd>{claim.assigned_agent_id ?? "Not assigned"}</dd></div>
                <div><dt>Verification</dt><dd>{formatStatus(claim.verification_status)}</dd></div>
                <div><dt>Settlement</dt><dd>{claim.settlement_amount ? `${formatMoney(claim.settlement_amount)} · ${claim.settlement_reference}` : "Not settled"}</dd></div>
                <div><dt>Next Step</dt><dd>{claim.status === "pending" ? "Verification in progress" : claim.status === "approved" ? "Settlement processing" : "Review rejection reason"}</dd></div>
              </dl>
              {currentUser.role === "admin" && claim.status === "pending" ? (
                <label>
                  Assign Agent
                  <select
                    value={claim.assigned_agent_id ?? ""}
                    onChange={(event) => event.target.value && void onAssign(claim.id, Number(event.target.value))}
                  >
                    <option value="">Choose agent</option>
                    {agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}
                  </select>
                </label>
              ) : null}
              {canManage && claim.status === "pending" && (currentUser.role === "admin" || claim.assigned_agent_id === currentUser.id) && claim.verification_status === "pending" ? (
                <div className="button-row">
                  <button className="secondary-button" onClick={() => onVerify(claim.id, "verified")}>Verify Documents</button>
                  <button className="danger-button" onClick={() => onVerify(claim.id, "rejected")}>Reject Verification</button>
                </div>
              ) : null}
              {canManage && claim.status === "pending" ? (
                <div className="button-row">
                  {claim.verification_status === "verified" ? <button className="secondary-button" onClick={() => onDecision(claim.id, "approved")}>Approve Claim</button> : null}
                  <button className="danger-button" onClick={() => onDecision(claim.id, "rejected")}>Reject Claim</button>
                </div>
              ) : null}
              {currentUser.role === "admin" && claim.status === "approved" && !claim.settled_at ? (
                <button className="primary-button" onClick={() => onSettle(claim)}>Record Settlement</button>
              ) : null}
            </article>
          ))}
        </div>
        <PaginationControls {...claimPagination} label="claims" />
        {claims.length > 0 && filteredClaims.length === 0 ? <p className="empty-state">No claims match this filter.</p> : null}
      </section>

      <section className="panel claim-help-panel">
        <div className="section-heading">
          <h2>Claim Process</h2>
          <FileText size={20} />
        </div>
        <div className="claim-process-list">
          {["Hospitalized / Treatment", "Upload bills and medical reports", "Claim submitted", "Company verification", "Approved or rejected", "Money settled"].map((step, index) => (
            <div key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel claim-help-panel">
        <div className="section-heading">
          <h2>Required Claim Documents</h2>
          <Upload size={20} />
        </div>
        <div className="claim-doc-list">
          <p>Hospital bill</p>
          <p>Discharge summary</p>
          <p>Doctor prescription</p>
          <p>Medical reports</p>
          <p>Policy document</p>
          <p>Identity proof</p>
        </div>
      </section>
    </div>
  );
}

function getClaimSteps(status: Claim["status"]) {
  return [
    { label: "Submitted", done: true },
    { label: "Review", done: true },
    { label: "Decision", done: status !== "pending" },
    { label: status === "approved" ? "Settlement" : status === "rejected" ? "Rejected" : "Pending", done: status !== "pending" },
  ];
}

function DocumentsPage({ documents, onOpenForm, onDownload, canVerify, onVerify }: { documents: DocumentRecord[]; onOpenForm: () => void; onDownload: (document: DocumentRecord) => Promise<void>; canVerify: boolean; onVerify: (document: DocumentRecord, verificationStatus: "verified" | "rejected") => Promise<void> }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const filteredDocuments = documents.filter((document) => typeFilter === "all" || document.document_type === typeFilter);
  const documentPagination = useListPagination(filteredDocuments, typeFilter);

  return (
    <section className="panel page-panel">
      <Toolbar title="Documents" actionLabel="Upload Document" icon={Upload} onAction={onOpenForm} />
      <div className="filter-row">
        <label>
          Document Type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All documents</option>
            <option value="identity">Identity documents</option>
            <option value="policy">Policy documents</option>
            <option value="claim">Claim documents</option>
          </select>
        </label>
      </div>
      {documents.length === 0 ? <p className="empty-state">No uploaded files yet.</p> : null}
      {documents.length > 0 && filteredDocuments.length === 0 ? <p className="empty-state">No documents match this filter.</p> : null}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Policy</th>
              <th>Type</th>
              <th>File</th>
              <th>Verification</th>
              <th>Uploaded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {documentPagination.items.map((document) => (
              <tr key={document.id}>
                <td>{document.id}</td>
                <td>{document.customer_id}</td>
                <td>{document.policy_id ?? "-"}</td>
                <td>{document.document_type}</td>
                <td>{document.file_name}</td>
                <td><StatusBadge status={formatStatus(document.verification_status)} /></td>
                <td>{new Date(document.uploaded_at).toLocaleDateString()}</td>
                <td>
                  <div className="button-row">
                    <button className="mini-button" onClick={() => onDownload(document)}>Download</button>
                    {canVerify && document.verification_status === "pending" ? <button className="mini-button" onClick={() => onVerify(document, "verified")}>Verify</button> : null}
                    {canVerify && document.verification_status === "pending" ? <button className="danger-button" onClick={() => onVerify(document, "rejected")}>Reject</button> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls {...documentPagination} label="documents" />
    </section>
  );
}

type PaginationView<T> = {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  setPage: (page: number) => void;
};

function useListPagination<T>(items: T[], resetKey: string, pageSize = 10): PaginationView<T> {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    totalPages,
    totalItems: items.length,
    pageSize,
    setPage,
  };
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  setPage,
  label,
}: Omit<PaginationView<unknown>, "items"> & { label: string }) {
  if (totalItems <= pageSize) {
    return null;
  }
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  return (
    <nav className="pagination-controls" aria-label={`${label} pagination`}>
      <span>Showing {firstItem}-{lastItem} of {totalItems} {label}</span>
      <div className="button-row">
        <button className="mini-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button className="mini-button" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
}

function ReportsPage({ stats, report, monthlyReport, onDownloadPdf }: { stats: DashboardProps["stats"]; report: DashboardReport | null; monthlyReport: MonthlyReportItem[]; onDownloadPdf: () => Promise<void> }) {
  return (
    <div className="dashboard-grid">
      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Export</p>
            <h2>Business Report</h2>
          </div>
          <button className="primary-button" onClick={onDownloadPdf}>Download PDF</button>
        </div>
      </section>
      <section className="stats-grid">
        <StatCard icon={Users} label="Customers" value={String(stats.customers)} trend="Total customers" />
        <StatCard icon={ShieldCheck} label="Policies" value={String(report?.policies.total_policies ?? 0)} trend="All health policies" />
        <StatCard icon={FileText} label="Claims" value={String(report?.claims.total_claims ?? 0)} trend="Total claims" />
        <StatCard icon={IndianRupee} label="Collected" value={formatMoney(stats.collectedPremium)} trend="Paid premiums" />
      </section>
      <section className="panel">
        <h2>Policy Status</h2>
        <div className="metric-list">
          <p>Active: {report?.policies.active_policies ?? 0}</p>
          <p>Expired: {report?.policies.expired_policies ?? 0}</p>
          <p>Cancelled: {report?.policies.cancelled_policies ?? 0}</p>
        </div>
      </section>
      <section className="panel">
        <h2>Monthly Business Report</h2>
        <div className="monthly-chart">
          {monthlyReport.map((item) => (
            <div key={item.month}>
              <span>{item.month}</span>
              <strong>{formatMoney(item.premium_collected)}</strong>
              <small>{item.new_customers} customers · {item.claims_submitted} claims</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type PlanWritePayload = Omit<InsurancePlan, "id" | "created_at" | "updated_at">;

function PlansPage({
  plans,
  onCreate,
  onSave,
}: {
  plans: InsurancePlan[];
  onCreate: (payload: PlanWritePayload) => Promise<void>;
  onSave: (id: number, payload: Partial<PlanWritePayload>) => Promise<void>;
}) {
  const [editor, setEditor] = useState<InsurancePlan | "new" | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function togglePlan(plan: InsurancePlan) {
    setSavingId(plan.id);
    setMessage("");
    try {
      await onSave(plan.id, { is_active: !plan.is_active });
      setMessage(`${plan.name} is now ${plan.is_active ? "hidden from customers" : "available to customers"}.`);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to update plan availability");
    } finally {
      setSavingId(null);
    }
  }

  const activeCount = plans.filter((plan) => plan.is_active).length;
  const averagePremium = plans.length
    ? plans.reduce((total, plan) => total + Number(plan.premium_amount), 0) / plans.length
    : 0;
  const highestCoverage = plans.reduce((highest, plan) => Math.max(highest, Number(plan.coverage_amount)), 0);

  return (
    <div className="plans-admin-page">
      <section className="panel plans-admin-hero">
        <div>
          <p className="eyebrow">Product catalog</p>
          <h2>Insurance Plans</h2>
          <p>Manage the health plans customers can compare and apply for.</p>
        </div>
        <button className="primary-button" onClick={() => setEditor("new")}>
          <Plus size={18} />
          Add Plan
        </button>
      </section>

      <section className="plans-summary-grid">
        <article><span>Total plans</span><strong>{plans.length}</strong><small>Database records</small></article>
        <article><span>Customer visible</span><strong>{activeCount}</strong><small>{plans.length - activeCount} inactive</small></article>
        <article><span>Average premium</span><strong>{formatMoney(averagePremium)}</strong><small>Per year</small></article>
        <article><span>Highest coverage</span><strong>{formatMoney(highestCoverage)}</strong><small>Available protection</small></article>
      </section>

      {message ? <div className="success-message">{message}</div> : null}

      <section className="plans-management-grid">
        {plans.map((plan) => (
            <article className={`plan-management-card ${plan.is_active ? "" : "inactive"}`} key={plan.id}>
              <div className="plan-management-heading">
                <div>
                  <p className="eyebrow">{plan.tag}</p>
                  <h3>{plan.name}</h3>
                  <span>{plan.policy_type}</span>
                </div>
                <StatusBadge status={plan.is_active ? "Active" : "Inactive"} />
              </div>

              <div className="plan-money-grid">
                <div>
                  <span>Yearly premium</span>
                  <strong>{formatMoney(plan.premium_amount)}</strong>
                </div>
                <div>
                  <span>Coverage</span>
                  <strong>{formatMoney(plan.coverage_amount)}</strong>
                </div>
              </div>

              <p className="plan-management-description">{plan.description}</p>

              <div className="plan-preview-columns">
                <div>
                  <span>Key services</span>
                  <ul>{plan.services.slice(0, 3).map((service) => <li key={service}>{service}</li>)}</ul>
                </div>
                <div>
                  <span>Benefits</span>
                  <ul>{plan.benefits.slice(0, 3).map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
                </div>
              </div>

              <div className="plan-record-meta">
                <span><FileText size={16} /> {plan.required_documents.length} required documents</span>
                <span>{plan.exclusions.length} exclusions</span>
              </div>

              <div className="plan-management-footer">
                <small>Updated {new Date(plan.updated_at).toLocaleDateString()}</small>
                <div className="button-row">
                  <button className="secondary-button" onClick={() => setEditor(plan)}>Edit Plan</button>
                  <button
                    className={plan.is_active ? "danger-button" : "primary-button"}
                    disabled={savingId === plan.id}
                    onClick={() => void togglePlan(plan)}
                  >
                    {savingId === plan.id ? "Updating..." : plan.is_active ? "Set Inactive" : "Activate"}
                  </button>
                </div>
              </div>
            </article>
        ))}
      </section>

      {plans.length === 0 ? (
        <section className="panel empty-state">
          <h3>No insurance plans yet</h3>
          <p>Create the first plan to make it available to customers.</p>
        </section>
      ) : null}

      {editor ? (
        <PlanEditorModal
          plan={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSubmit={async (payload) => {
            if (editor === "new") {
              await onCreate(payload);
              setMessage(`${payload.name} created successfully.`);
            } else {
              await onSave(editor.id, payload);
              setMessage(`${payload.name} updated successfully.`);
            }
            setEditor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PlanEditorModal({
  plan,
  onClose,
  onSubmit,
}: {
  plan: InsurancePlan | null;
  onClose: () => void;
  onSubmit: (payload: PlanWritePayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    name: plan?.name ?? "",
    policy_type: plan?.policy_type ?? "Health Insurance",
    premium_amount: plan?.premium_amount ?? "",
    coverage_amount: plan?.coverage_amount ?? "",
    tag: plan?.tag ?? "",
    description: plan?.description ?? "",
    services: plan?.services.join("\n") ?? "Cashless hospitalization\nPre and post hospitalization support",
    benefits: plan?.benefits.join("\n") ?? "No claim bonus\nSection 80D tax benefit",
    required_documents: plan?.required_documents.join("\n") ?? "Aadhaar Card\nPAN Card\nAddress proof",
    exclusions: plan?.exclusions.join("\n") ?? "Policy waiting periods apply",
    is_active: String(plan?.is_active ?? true),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
  const isValid = Boolean(
    values.name.trim()
      && Number(values.premium_amount) > 0
      && Number(values.coverage_amount) > 0
      && values.tag.trim()
      && values.description.trim()
      && splitLines(values.services).length
      && splitLines(values.benefits).length
      && splitLines(values.required_documents).length,
  );

  async function submitEditor() {
    setIsSaving(true);
    setError("");
    try {
      await onSubmit({
        name: values.name.trim(),
        policy_type: values.policy_type,
        premium_amount: values.premium_amount,
        coverage_amount: values.coverage_amount,
        tag: values.tag.trim(),
        description: values.description.trim(),
        services: splitLines(values.services),
        benefits: splitLines(values.benefits),
        required_documents: splitLines(values.required_documents),
        exclusions: splitLines(values.exclusions),
        is_active: values.is_active === "true",
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save insurance plan");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card plan-editor-modal">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{plan ? `Plan #${plan.id}` : "New product"}</p>
            <h2>{plan ? "Edit Insurance Plan" : "Create Insurance Plan"}</h2>
          </div>
          <button className="text-button" onClick={onClose}>Close</button>
        </div>

        {error ? <div className="app-alert">{error}</div> : null}

        <div className="plan-editor-form">
          <label className="plan-editor-wide">
            <span>Plan name</span>
            <input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} placeholder="Example: Gold Health" />
          </label>
          <label>
            <span>Yearly premium (₹)</span>
            <input type="number" min="1" value={values.premium_amount} onChange={(event) => setValues({ ...values, premium_amount: event.target.value })} />
          </label>
          <label>
            <span>Coverage amount (₹)</span>
            <input type="number" min="1" value={values.coverage_amount} onChange={(event) => setValues({ ...values, coverage_amount: event.target.value })} />
          </label>
          <label>
            <span>Plan badge</span>
            <input value={values.tag} onChange={(event) => setValues({ ...values, tag: event.target.value })} placeholder="Popular" />
          </label>
          <label>
            <span>Customer availability</span>
            <select value={values.is_active} onChange={(event) => setValues({ ...values, is_active: event.target.value })}>
              <option value="true">Active — visible to customers</option>
              <option value="false">Inactive — hidden from customers</option>
            </select>
          </label>
          <label className="plan-editor-wide">
            <span>Description</span>
            <textarea rows={3} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
          </label>
          <label>
            <span>Services included — one per line</span>
            <textarea rows={5} value={values.services} onChange={(event) => setValues({ ...values, services: event.target.value })} />
          </label>
          <label>
            <span>Customer benefits — one per line</span>
            <textarea rows={5} value={values.benefits} onChange={(event) => setValues({ ...values, benefits: event.target.value })} />
          </label>
          <label>
            <span>Required documents — one per line</span>
            <textarea rows={5} value={values.required_documents} onChange={(event) => setValues({ ...values, required_documents: event.target.value })} />
          </label>
          <label>
            <span>Exclusions — one per line</span>
            <textarea rows={5} value={values.exclusions} onChange={(event) => setValues({ ...values, exclusions: event.target.value })} />
          </label>
        </div>

        <div className="plan-editor-actions">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={!isValid || isSaving} onClick={() => void submitEditor()}>
            {isSaving ? "Saving..." : plan ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingsPage({ settings, onSave }: { settings: SystemSetting[]; onSave: (key: string, payload: { value: string; description?: string | null }) => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value]),
      ),
    );
  }, [settings]);

  async function saveSetting(setting: SystemSetting) {
    setSavingKey(setting.key);
    setSavedKey(null);
    setSaveError("");
    try {
      await onSave(setting.key, { value: drafts[setting.key] ?? setting.value });
      setSavedKey(setting.key);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "Unable to save setting");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="settings-page">
      <section className="panel settings-intro-panel">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Platform Settings</h2>
          <p>Manage customer access and platform contact information. Staff accounts remain controlled through Employee Management.</p>
        </div>
        <div className="settings-security-note">
          <ShieldCheck size={22} />
          <div>
            <strong>Admin-only area</strong>
            <span>Changes apply across the platform.</span>
          </div>
        </div>
      </section>

      {saveError ? <div className="app-alert">{saveError}</div> : null}

      <section className="settings-card-grid">
        {settings.map((setting) => (
          <article className="settings-card" key={setting.key}>
            <div className="settings-card-heading">
              <div>
                <p className="eyebrow">{setting.key === "active_policy_type" ? "Insurance scope" : setting.key === "support_email" ? "Customer support" : "Account access"}</p>
                <h3>{setting.key === "active_policy_type" ? "Active Policy Type" : setting.key === "support_email" ? "Support Email" : "Customer Registration"}</h3>
              </div>
              {savedKey === setting.key ? <StatusBadge status="Saved" /> : null}
            </div>
            <p>{setting.description}</p>

            {setting.key === "active_policy_type" ? (
              <div className="settings-readonly-value">
                <ShieldCheck size={20} />
                <div>
                  <strong>Health Insurance</strong>
                  <span>Locked for version one</span>
                </div>
              </div>
            ) : null}

            {setting.key === "allow_public_registration" ? (
              <label className="settings-field">
                <span>Public customer signup</span>
                <select
                  value={drafts[setting.key] ?? setting.value}
                  onChange={(event) => setDrafts({ ...drafts, [setting.key]: event.target.value })}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
                <small>Agent and administrator accounts are always created by an admin.</small>
              </label>
            ) : null}

            {setting.key === "support_email" ? (
              <label className="settings-field">
                <span>Support contact email</span>
                <input
                  type="email"
                  value={drafts[setting.key] ?? setting.value}
                  onChange={(event) => setDrafts({ ...drafts, [setting.key]: event.target.value })}
                  placeholder="support@example.com"
                />
              </label>
            ) : null}

            {setting.key !== "active_policy_type" ? (
              <div className="settings-card-footer">
                <small>Last updated {new Date(setting.updated_at).toLocaleString()}</small>
                <button
                  className="primary-button"
                  disabled={savingKey === setting.key || (drafts[setting.key] ?? setting.value) === setting.value}
                  onClick={() => void saveSetting(setting)}
                >
                  {savingKey === setting.key ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
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

function Toolbar({ title, actionLabel, search, onSearch, onAction, icon: Icon = Plus }: ToolbarProps) {
  return (
    <div className="toolbar">
      <h2>{title}</h2>
      <div className="toolbar-actions">
        {onSearch ? (
          <label className="search-box">
            <Search size={18} />
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search records" />
          </label>
        ) : null}
        {onAction ? (
          <button className="primary-button" onClick={onAction}>
            <Icon size={18} />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RecordModal({ form, token, currentUser, selectedCustomer, selectedEmployee, customers, policies, plans, claims, onClose, onSaved, onError }: { form: FormKey; token: string | null; currentUser: AppUser; selectedCustomer: Customer | null; selectedEmployee: Employee | null; customers: Customer[]; policies: Policy[]; plans: InsurancePlan[]; claims: Claim[]; onClose: () => void; onSaved: () => Promise<void>; onError: (message: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>((): Record<string, string> => {
    if (form === "employeeEdit" && selectedEmployee) {
      return {
          name: selectedEmployee.name,
          email: selectedEmployee.email,
          role: selectedEmployee.role,
          password: "",
      };
    }
    if (form === "customerEdit" && selectedCustomer) {
      return {
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
          address: selectedCustomer.address,
          dob: selectedCustomer.dob ?? "",
      };
    }
    return {};
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isCustomer = currentUser.role === "customer";
  const fieldErrors = {
    email: values.email && !isValidEmail(values.email) ? "Enter a valid email address." : "",
    phone: values.phone && !isValidPhone(values.phone) ? "Phone number must be exactly 10 digits." : "",
    password: (form === "employee" && !values.password) || (values.password && values.password.length < 8) ? "Password must be at least 8 characters." : "",
    premium_amount: values.premium_amount && !isPositiveNumber(values.premium_amount) ? "Premium amount must be greater than 0." : "",
    amount: values.amount && !isPositiveNumber(values.amount) ? "Amount must be greater than 0." : "",
    claim_amount: values.claim_amount && !isPositiveNumber(values.claim_amount) ? "Claim amount must be greater than 0." : "",
  };
  const hasValidationErrors = Object.values(fieldErrors).some(Boolean);

  async function submit() {
    if (!token || !form || hasValidationErrors || isSaving) return;
    setIsSaving(true);
    setSaveError("");
    try {
      if (form === "employee") {
        await createEmployee(token, {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role as AppUser["role"],
        });
      }
      if (form === "employeeEdit" && selectedEmployee) {
        await updateEmployee(token, selectedEmployee.id, {
          name: values.name,
          email: values.email,
          password: values.password || undefined,
          role: values.role as AppUser["role"],
        });
      }
      if (form === "customer") {
        await createCustomer(token, {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          dob: values.dob || null,
        });
      }
      if (form === "customerEdit" && selectedCustomer) {
        await updateCustomer(token, selectedCustomer.id, {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          dob: values.dob || null,
        });
      }
      if (form === "policy") {
        await createPolicy(token, {
          customer_id: Number(values.customer_id),
          plan_id: values.plan_id ? Number(values.plan_id) : null,
          policy_type: "Health Insurance",
          policy_number: values.policy_number,
          premium_amount: values.premium_amount,
          start_date: values.start_date,
          end_date: values.end_date,
        });
      }
      if (form === "premium") {
        await recordPremium(token, {
          policy_id: Number(values.policy_id),
          due_date: values.due_date,
          amount: values.amount,
          payment_date: values.payment_date || null,
        });
      }
      if (form === "claim") {
        await submitClaim(token, {
          policy_id: Number(values.policy_id),
          claim_amount: values.claim_amount,
          reason: values.reason,
        });
      }
      if (form === "document" && file) {
        await uploadDocument(token, {
          customer_id: isCustomer ? Number(currentUser.customer_id) : Number(values.customer_id),
          policy_id: values.policy_id ? Number(values.policy_id) : null,
          claim_id: values.claim_id ? Number(values.claim_id) : null,
          document_type: values.document_type || "identity",
          file,
        });
      }
      await onSaved();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Save failed";
      setSaveError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card">
        <div className="section-heading">
          <h2>{modalTitle(form)}</h2>
          <button className="text-button" onClick={onClose}>Close</button>
        </div>
        <div className="modal-form">
          {form === "employee" || form === "employeeEdit" ? (
            <>
              <Input label="Name" name="name" values={values} setValues={setValues} />
              <Input
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                transformValue={(value) => value.toLowerCase().replace(/\s+/g, "")}
                error={fieldErrors.email}
                values={values}
                setValues={setValues}
              />
              <Select
                label="Role"
                name="role"
                values={values}
                setValues={setValues}
                options={[
                  { label: "Admin", value: "admin" },
                  { label: "Agent", value: "agent" },
                ]}
              />
              <Input
                label={form === "employee" ? "Password" : "New Password"}
                name="password"
                type="password"
                error={fieldErrors.password}
                values={values}
                setValues={setValues}
              />
            </>
          ) : null}
          {form === "customer" || form === "customerEdit" ? (
            <>
              <Input label="Name" name="name" values={values} setValues={setValues} />
              <Input
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                transformValue={(value) => value.toLowerCase().replace(/\s+/g, "")}
                error={fieldErrors.email}
                values={values}
                setValues={setValues}
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                numericMode="integer"
                maxLength={10}
                error={fieldErrors.phone}
                values={values}
                setValues={setValues}
              />
              <Input label="Address" name="address" values={values} setValues={setValues} />
              <DateOfBirthInput label="Date of Birth" name="dob" values={values} setValues={setValues} />
            </>
          ) : null}
          {form === "policy" ? (
            <>
              <Select label="Customer" name="customer_id" values={values} setValues={setValues} options={customers.map((customer) => ({ label: `${customer.id} - ${customer.name}`, value: String(customer.id) }))} />
              <Select label="Insurance Plan" name="plan_id" values={values} setValues={setValues} options={plans.filter((plan) => plan.is_active).map((plan) => ({ label: `${plan.name} · ${formatPlanPremium(plan)}`, value: String(plan.id) }))} />
              <Input label="Policy Number" name="policy_number" values={values} setValues={setValues} />
              <Input
                label="Premium Amount"
                name="premium_amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                numericMode="decimal"
                error={fieldErrors.premium_amount}
                values={values}
                setValues={setValues}
              />
              <Input label="Start Date" name="start_date" type="date" values={values} setValues={setValues} />
              <Input label="End Date" name="end_date" type="date" values={values} setValues={setValues} />
            </>
          ) : null}
          {form === "premium" ? (
            <>
              <Select label="Policy" name="policy_id" values={values} setValues={setValues} options={policies.map((policy) => ({ label: `${policy.id} - ${policy.policy_number}`, value: String(policy.id) }))} />
              <Input label="Due Date" name="due_date" type="date" values={values} setValues={setValues} />
              <Input label="Payment Date" name="payment_date" type="date" values={values} setValues={setValues} />
              <Input
                label="Amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                numericMode="decimal"
                error={fieldErrors.amount}
                values={values}
                setValues={setValues}
              />
            </>
          ) : null}
          {form === "claim" ? (
            <>
              <Select label="Policy" name="policy_id" values={values} setValues={setValues} options={policies.map((policy) => ({ label: `${policy.id} - ${policy.policy_number}`, value: String(policy.id) }))} />
              <Input
                label="Claim Amount"
                name="claim_amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                numericMode="decimal"
                error={fieldErrors.claim_amount}
                values={values}
                setValues={setValues}
              />
              <Input label="Reason" name="reason" values={values} setValues={setValues} />
            </>
          ) : null}
          {form === "document" ? (
            <>
              {!isCustomer ? <Select label="Customer" name="customer_id" values={values} setValues={setValues} options={customers.map((customer) => ({ label: `${customer.id} - ${customer.name}`, value: String(customer.id) }))} /> : null}
              <Select label="Policy" name="policy_id" values={values} setValues={setValues} options={policies.map((policy) => ({ label: `${policy.id} - ${policy.policy_number}`, value: String(policy.id) }))} />
              <Select label="Document Type" name="document_type" values={values} setValues={setValues} options={[{ label: "Identity", value: "identity" }, { label: "Policy", value: "policy" }, { label: "Claim", value: "claim" }]} />
              {values.document_type === "claim" ? (
                <Select label="Claim" name="claim_id" values={values} setValues={setValues} options={claims.map((claim) => ({ label: `CLM-${claim.id} · Policy ${claim.policy_id}`, value: String(claim.id) }))} />
              ) : null}
              <label>
                File
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
            </>
          ) : null}
          {saveError ? <p className="error-message">{saveError}</p> : null}
          <button
            className="primary-button full-width"
            disabled={hasValidationErrors || isSaving}
            onClick={submit}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}

function modalTitle(form: FormKey) {
  if (form === "employee") return "Add Employee";
  if (form === "employeeEdit") return "Edit Employee";
  if (form === "customer") return "Add Customer";
  if (form === "customerEdit") return "Edit Customer";
  if (form === "policy") return "Create Health Policy";
  if (form === "premium") return "Record Premium";
  if (form === "claim") return "Submit Claim";
  return "Upload Document";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^\d{10}$/.test(value);
}

function isPositiveNumber(value: string) {
  return Number(value) > 0;
}

function Input({
  label,
  name,
  type = "text",
  values,
  setValues,
  min,
  max,
  step,
  inputMode,
  numericMode,
  maxLength,
  transformValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  values: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
  min?: string;
  max?: string;
  step?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  numericMode?: "integer" | "decimal";
  maxLength?: number;
  transformValue?: (value: string) => string;
  error?: string;
}) {
  function getNextValue(rawValue: string) {
    let nextValue = rawValue;

    if (numericMode === "integer") {
      nextValue = rawValue.replace(/[^\d]/g, "");
    } else if (numericMode === "decimal") {
      const normalizedValue = rawValue.replace(/[^\d.]/g, "");
      const [whole = "", ...decimalParts] = normalizedValue.split(".");
      nextValue = decimalParts.length ? `${whole}.${decimalParts.join("")}` : whole;
    }

    if (transformValue) {
      nextValue = transformValue(nextValue);
    }

    if (typeof maxLength === "number") {
      nextValue = nextValue.slice(0, maxLength);
    }

    return nextValue;
  }

  return (
    <label>
      {label}
      <input
        className={error ? "input-invalid" : ""}
        type={type}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        maxLength={maxLength}
        value={values[name] ?? ""}
        onChange={(event) => setValues({ ...values, [name]: getNextValue(event.target.value) })}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function DateOfBirthInput({
  label,
  name,
  values,
  setValues,
  error,
}: {
  label: string;
  name: string;
  values: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
  error?: string;
}) {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 120;
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const dayCount = getDaysInMonth(Number(selectedYear), Number(selectedMonth));

  useEffect(() => {
    const [year = "", month = "", day = ""] = splitIsoDate(values[name]);
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedDay(day);
  }, [name, values]);

  function updateDate(nextParts: Partial<{ year: string; month: string; day: string }>) {
    const nextYear = nextParts.year ?? selectedYear;
    const nextMonth = nextParts.month ?? selectedMonth;
    const nextDay = nextParts.day ?? selectedDay;
    const maxDay = getDaysInMonth(Number(nextYear), Number(nextMonth));
    const normalizedDay = clampDay(nextDay, maxDay);
    setSelectedYear(nextYear);
    setSelectedMonth(nextMonth);
    setSelectedDay(normalizedDay);
    const nextValue = nextYear && nextMonth && normalizedDay ? `${nextYear}-${nextMonth}-${normalizedDay}` : "";
    setValues({ ...values, [name]: nextValue });
  }

  return (
    <label className="date-of-birth-field">
      {label}
      <div className="date-of-birth-grid">
        <select className={error ? "input-invalid" : ""} value={selectedYear} onChange={(event) => updateDate({ year: event.target.value })}>
          <option value="">Year</option>
          {Array.from({ length: currentYear - minYear + 1 }, (_, index) => String(currentYear - index)).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select className={error ? "input-invalid" : ""} value={selectedMonth} onChange={(event) => updateDate({ month: event.target.value })}>
          <option value="">Month</option>
          {MONTH_LABELS.map((monthLabel, index) => {
            const option = String(index + 1).padStart(2, "0");
            return <option key={option} value={option}>{monthLabel}</option>;
          })}
        </select>
        <select className={error ? "input-invalid" : ""} value={selectedDay} onChange={(event) => updateDate({ day: event.target.value })}>
          <option value="">Day</option>
          {Array.from({ length: dayCount || 31 }, (_, index) => {
            const option = String(index + 1).padStart(2, "0");
            return <option key={option} value={option}>{option}</option>;
          })}
        </select>
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function Select({
  label,
  name,
  values,
  setValues,
  options,
  error,
}: {
  label: string;
  name: string;
  values: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
  options: Array<{ label: string; value: string }>;
  error?: string;
}) {
  return (
    <label>
      {label}
      <select className={error ? "input-invalid" : ""} value={values[name] ?? ""} onChange={(event) => setValues({ ...values, [name]: event.target.value })}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
