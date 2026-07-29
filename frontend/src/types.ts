export type UserRole = "admin" | "agent" | "customer";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  customer_id: number | null;
  profile_image_url: string | null;
};

export type Customer = {
  id: number;
  name: string;
  created_at: string;
  dob: string | null;
  phone: string;
  address: string;
  email: string;
};

export type PolicyStatus = "active" | "expired" | "cancelled";

export type Policy = {
  id: number;
  customer_id: number;
  plan_id: number | null;
  policy_type: "Health Insurance";
  policy_number: string;
  premium_amount: string;
  start_date: string;
  end_date: string;
  status: PolicyStatus;
};

export type PaymentStatus = "paid" | "pending" | "overdue";

export type Premium = {
  id: number;
  policy_id: number;
  due_date: string;
  payment_date: string | null;
  amount: string;
  payment_status: PaymentStatus;
};

export type ClaimStatus = "pending" | "approved" | "rejected";

export type Claim = {
  id: number;
  policy_id: number;
  claim_amount: string;
  reason: string;
  status: ClaimStatus;
  verification_status: "pending" | "verified" | "rejected";
  assigned_agent_id: number | null;
  review_notes: string | null;
  settlement_amount: string | null;
  settled_at: string | null;
  settlement_reference: string | null;
  submission_date: string;
};

export type DocumentRecord = {
  id: number;
  customer_id: number;
  policy_id: number | null;
  application_id: number | null;
  claim_id: number | null;
  document_type: "identity" | "policy" | "claim";
  file_name: string;
  file_path: string;
  uploaded_at: string;
  verification_status: "pending" | "verified" | "rejected";
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: number | null;
};

export type PolicyApplication = {
  id: number;
  customer_id: number;
  plan_id: number;
  plan_name: string;
  policy_type: string;
  premium_amount: string;
  coverage_amount: string;
  applicant_name: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  occupation: string;
  address: string;
  nominee_name: string;
  nominee_relation: string;
  nominee_age: number;
  height_cm: string;
  weight_kg: string;
  smoking: string;
  alcohol: string;
  previous_disease: string;
  current_medication: string;
  payment_method: string;
  document_names: string[];
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  generated_policy_id: number | null;
  created_at: string;
};

export type SystemSetting = {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: number | null;
};

export type InsurancePlan = {
  id: number;
  name: string;
  policy_type: string;
  premium_amount: string;
  coverage_amount: string;
  tag: string;
  description: string;
  services: string[];
  benefits: string[];
  required_documents: string[];
  exclusions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicPlatformSummary = {
  active_policies: number;
  pending_claims: number;
  total_collected_amount: string;
  support_email: string;
};

export type Employee = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  customer_id: number | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  skip: number;
  limit: number;
};

export type DashboardReport = {
  customers: { total_customers: number };
  policies: {
    total_policies: number;
    active_policies: number;
    expired_policies: number;
    cancelled_policies: number;
  };
  claims: {
    total_claims: number;
    pending_claims: number;
    approved_claims: number;
    rejected_claims: number;
  };
  premiums: {
    total_premium_records: number;
    paid_premiums: number;
    pending_premiums: number;
    overdue_premiums: number;
    total_collected_amount: string;
  };
};

export type MonthlyReportItem = {
  month: string;
  new_customers: number;
  new_policies: number;
  claims_submitted: number;
  premium_collected: string;
};
