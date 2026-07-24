export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: "Active" | "Inactive";
};

export type Policy = {
  id: string;
  customerName: string;
  type: "Health Insurance";
  premium: number;
  startDate: string;
  endDate: string;
  status: "Active" | "Expiring" | "Cancelled";
};

export type Premium = {
  id: string;
  policyId: string;
  dueDate: string;
  paymentDate?: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
};

export type Claim = {
  id: string;
  policyId: string;
  amount: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

export type DocumentRecord = {
  id: string;
  customerName: string;
  type: "identity" | "policy" | "claim";
  fileName: string;
  uploadedAt: string;
};

export type UserRole = "Admin" | "Insurance Agent" | "Customer";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customerId?: string;
  department: string;
};
