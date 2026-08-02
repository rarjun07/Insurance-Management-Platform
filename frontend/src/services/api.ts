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
  UserRole,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "healthinsure_token";

type RequestOptions = RequestInit & {
  token?: string | null;
  isFormData?: boolean;
};

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!options.isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = response.status === 401
      ? "Your login session has expired. Please log out and log in again."
      : payload?.error?.message ?? payload?.detail ?? "API request failed";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.set("username", email);
  formData.set("password", password);

  return apiRequest<{ access_token: string; token_type: string }>("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ message: string; reset_token: string | null }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiRequest<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  customer_id?: number | null;
  phone?: string | null;
  address?: string | null;
  profile_image?: File | null;
}) {
  if (payload.profile_image) {
    const formData = new FormData();
    formData.set("name", payload.name);
    formData.set("email", payload.email);
    formData.set("password", payload.password);
    formData.set("profile_image", payload.profile_image);
    if (payload.phone) formData.set("phone", payload.phone);
    if (payload.address) formData.set("address", payload.address);

    return apiRequest<AppUser>("/api/v1/auth/register-with-image", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  }

  return apiRequest<AppUser>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      customer_id: payload.customer_id,
      phone: payload.phone,
      address: payload.address,
    }),
  });
}

export function getMe(token: string) {
  return apiRequest<AppUser>("/api/v1/auth/me", { token });
}

export function updateMe(token: string, payload: {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  profile_image?: File | null;
}) {
  const formData = new FormData();
  if (payload.name !== undefined) formData.set("name", payload.name);
  if (payload.email !== undefined) formData.set("email", payload.email);
  if (payload.password !== undefined) formData.set("password", payload.password);
  if (payload.phone !== undefined) formData.set("phone", payload.phone);
  if (payload.address !== undefined) formData.set("address", payload.address);
  if (payload.profile_image) formData.set("profile_image", payload.profile_image);

  return apiRequest<AppUser>("/api/v1/auth/me", {
    method: "PATCH",
    token,
    body: formData,
    isFormData: true,
  });
}

export function listCustomers(token: string, search = "", skip = 0, limit = 100) {
  const query = `?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  return apiRequest<PaginatedResponse<Customer>>(`/api/v1/customers/${query}`, { token });
}

export function getCustomer(token: string, id: number) {
  return apiRequest<Customer>(`/api/v1/customers/${id}`, { token });
}

export function createCustomer(token: string, payload: Omit<Customer, "id" | "created_at">) {
  return apiRequest<Customer>("/api/v1/customers/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateCustomer(token: string, id: number, payload: Partial<Omit<Customer, "id" | "created_at">>) {
  return apiRequest<Customer>(`/api/v1/customers/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function downloadDocumentFile(token: string, id: number, fileName: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Document download failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function listPolicies(token: string, isCustomer: boolean, skip = 0, limit = 100) {
  return apiRequest<PaginatedResponse<Policy>>(`${isCustomer ? "/api/v1/policies/mine" : "/api/v1/policies/"}?skip=${skip}&limit=${limit}`, {
    token,
  });
}

export function listPlans(token?: string | null, includeInactive = false) {
  return apiRequest<InsurancePlan[]>(includeInactive ? "/api/v1/plans/admin" : "/api/v1/plans/", { token });
}

export function createPlan(token: string, payload: Omit<InsurancePlan, "id" | "created_at" | "updated_at">) {
  return apiRequest<InsurancePlan>("/api/v1/plans/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updatePlan(token: string, id: number, payload: Partial<Omit<InsurancePlan, "id" | "created_at" | "updated_at">>) {
  return apiRequest<InsurancePlan>(`/api/v1/plans/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function getPublicPlatformSummary() {
  return apiRequest<PublicPlatformSummary>("/api/v1/reports/public-summary");
}

export function listExpiringPolicies(token: string) {
  return apiRequest<PaginatedResponse<Policy>>("/api/v1/policies/expiring?days=30", { token });
}

export function createPolicy(token: string, payload: Omit<Policy, "id" | "status" | "plan_id"> & { plan_id?: number | null }) {
  return apiRequest<Policy>("/api/v1/policies/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function renewPolicy(token: string, id: number, payload: { premium_amount?: string; start_date: string; end_date: string }) {
  return apiRequest<Policy>(`/api/v1/policies/${id}/renew`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function cancelPolicy(token: string, id: number) {
  return apiRequest<Policy>(`/api/v1/policies/${id}/cancel`, {
    method: "PATCH",
    token,
  });
}

export function listPremiums(token: string, isCustomer: boolean, skip = 0, limit = 100) {
  return apiRequest<PaginatedResponse<Premium>>(`${isCustomer ? "/api/v1/premiums/mine" : "/api/v1/premiums/"}?skip=${skip}&limit=${limit}`, {
    token,
  });
}

export function recordPremium(token: string, payload: { policy_id: number; due_date: string; amount: string; payment_date?: string | null }) {
  return apiRequest<Premium>("/api/v1/premiums/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function markPremiumPaid(token: string, id: number) {
  return apiRequest<Premium>(`/api/v1/premiums/${id}/mark-paid`, {
    method: "PATCH",
    token,
  });
}

export function listClaims(token: string, isCustomer: boolean, skip = 0, limit = 100) {
  return apiRequest<PaginatedResponse<Claim>>(`${isCustomer ? "/api/v1/claims/mine" : "/api/v1/claims/"}?skip=${skip}&limit=${limit}`, {
    token,
  });
}

export function submitClaim(token: string, payload: { policy_id: number; claim_amount: string; reason: string }) {
  return apiRequest<Claim>("/api/v1/claims/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function decideClaim(token: string, id: number, status: "approved" | "rejected", reviewNotes?: string) {
  return apiRequest<Claim>(`/api/v1/claims/${id}/decision`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status, review_notes: reviewNotes }),
  });
}

export function assignClaim(token: string, id: number, agentId: number) {
  return apiRequest<Claim>(`/api/v1/claims/${id}/assign`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ agent_id: agentId }),
  });
}

export function verifyClaim(token: string, id: number, status: "verified" | "rejected", reviewNotes?: string) {
  return apiRequest<Claim>(`/api/v1/claims/${id}/verify`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status, review_notes: reviewNotes }),
  });
}

export function settleClaim(token: string, id: number, amount: string, reference: string) {
  return apiRequest<Claim>(`/api/v1/claims/${id}/settle`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ amount, reference }),
  });
}

export function listDocuments(token: string, isCustomer: boolean, skip = 0, limit = 100) {
  return apiRequest<PaginatedResponse<DocumentRecord>>(`${isCustomer ? "/api/v1/documents/mine" : "/api/v1/documents/"}?skip=${skip}&limit=${limit}`, {
    token,
  });
}

export function uploadDocument(token: string, payload: { customer_id: number; policy_id?: number | null; application_id?: number | null; claim_id?: number | null; document_type: string; file: File }) {
  const formData = new FormData();
  formData.set("customer_id", String(payload.customer_id));
  formData.set("document_type", payload.document_type);
  if (payload.policy_id) {
    formData.set("policy_id", String(payload.policy_id));
  }
  if (payload.application_id) {
    formData.set("application_id", String(payload.application_id));
  }
  if (payload.claim_id) {
    formData.set("claim_id", String(payload.claim_id));
  }
  formData.set("file", payload.file);

  return apiRequest<DocumentRecord>("/api/v1/documents/upload", {
    method: "POST",
    token,
    body: formData,
    isFormData: true,
  });
}

export function getDashboardReport(token: string) {
  return apiRequest<DashboardReport>("/api/v1/reports/summary", { token });
}

export function getMonthlyReport(token: string) {
  return apiRequest<MonthlyReportItem[]>("/api/v1/reports/monthly", { token });
}

export async function downloadBusinessReportPdf(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/reports/export/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("PDF report download failed");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "insurance-business-report.pdf";
  link.click();
  window.URL.revokeObjectURL(url);
}

export function listEmployees(token: string, search = "", skip = 0, limit = 100) {
  const query = `?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  return apiRequest<PaginatedResponse<Employee>>(`/api/v1/users/${query}`, { token });
}

export function createEmployee(token: string, payload: { name: string; email: string; password: string; role: UserRole }) {
  return apiRequest<Employee>("/api/v1/users/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(token: string, id: number, payload: { name?: string; email?: string; password?: string; role?: UserRole }) {
  return apiRequest<Employee>(`/api/v1/users/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function listApplications(token: string, isCustomer: boolean, skip = 0, limit = 100) {
  return apiRequest<PaginatedResponse<PolicyApplication>>(`${isCustomer ? "/api/v1/applications/mine" : "/api/v1/applications/"}?skip=${skip}&limit=${limit}`, {
    token,
  });
}

export function submitPolicyApplication(token: string, payload: Omit<PolicyApplication, "id" | "customer_id" | "status" | "review_notes" | "reviewed_at" | "reviewed_by" | "generated_policy_id" | "created_at">) {
  return apiRequest<PolicyApplication>("/api/v1/applications/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function reviewPolicyApplication(token: string, id: number, payload: { status: "approved" | "rejected"; review_notes?: string | null }) {
  return apiRequest<PolicyApplication>(`/api/v1/applications/${id}/review`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function verifyDocument(token: string, id: number, payload: { verification_status: "verified" | "rejected"; verification_notes?: string | null }) {
  return apiRequest<DocumentRecord>(`/api/v1/documents/${id}/verify`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function listSettings(token: string) {
  return apiRequest<SystemSetting[]>("/api/v1/settings/", { token });
}

export function updateSetting(token: string, key: string, payload: { value: string; description?: string | null }) {
  return apiRequest<SystemSetting>(`/api/v1/settings/${key}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}
