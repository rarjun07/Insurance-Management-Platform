import type { AppUser, Claim, Customer, DocumentRecord, Policy, Premium } from "../types";

export const policyTypes = [
  { title: "Health Insurance", status: "Available", active: true },
  { title: "Vehicle Insurance", status: "Coming Soon" },
  { title: "Life Insurance", status: "Coming Soon" },
  { title: "Travel Insurance", status: "Coming Soon" },
  { title: "Property Insurance", status: "Coming Soon" },
];

export const initialCustomers: Customer[] = [
  {
    id: "CUS-001",
    name: "Rohit Sharma",
    email: "rohit@example.com",
    phone: "9876543210",
    city: "Jaipur",
    status: "Active",
  },
  {
    id: "CUS-002",
    name: "Priya Mehta",
    email: "priya@example.com",
    phone: "9123456780",
    city: "Delhi",
    status: "Active",
  },
  {
    id: "CUS-003",
    name: "Aman Verma",
    email: "aman@example.com",
    phone: "9988776655",
    city: "Mumbai",
    status: "Inactive",
  },
];

export const initialPolicies: Policy[] = [
  {
    id: "POL-001",
    customerName: "Rohit Sharma",
    type: "Health Insurance",
    premium: 12000,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "Active",
  },
  {
    id: "POL-002",
    customerName: "Priya Mehta",
    type: "Health Insurance",
    premium: 18000,
    startDate: "2026-03-10",
    endDate: "2026-08-10",
    status: "Expiring",
  },
  {
    id: "POL-003",
    customerName: "Aman Verma",
    type: "Health Insurance",
    premium: 9500,
    startDate: "2025-11-01",
    endDate: "2026-11-01",
    status: "Active",
  },
];

export const initialPremiums: Premium[] = [
  {
    id: "PAY-001",
    policyId: "POL-001",
    dueDate: "2026-08-01",
    paymentDate: "2026-07-20",
    amount: 12000,
    status: "Paid",
  },
  {
    id: "PAY-002",
    policyId: "POL-002",
    dueDate: "2026-07-15",
    amount: 18000,
    status: "Overdue",
  },
  {
    id: "PAY-003",
    policyId: "POL-003",
    dueDate: "2026-08-20",
    amount: 9500,
    status: "Pending",
  },
];

export const initialClaims: Claim[] = [
  {
    id: "CLM-001",
    policyId: "POL-001",
    amount: 25000,
    reason: "Hospitalization expense claim",
    status: "Pending",
  },
  {
    id: "CLM-002",
    policyId: "POL-002",
    amount: 11000,
    reason: "Diagnostic tests reimbursement",
    status: "Approved",
  },
  {
    id: "CLM-003",
    policyId: "POL-003",
    amount: 8000,
    reason: "Outpatient treatment claim",
    status: "Rejected",
  },
];

export const initialDocuments: DocumentRecord[] = [
  {
    id: "DOC-001",
    customerName: "Rohit Sharma",
    type: "identity",
    fileName: "aadhaar-card.pdf",
    uploadedAt: "2026-07-21",
  },
  {
    id: "DOC-002",
    customerName: "Priya Mehta",
    type: "policy",
    fileName: "health-policy.pdf",
    uploadedAt: "2026-07-22",
  },
  {
    id: "DOC-003",
    customerName: "Aman Verma",
    type: "claim",
    fileName: "hospital-bill.pdf",
    uploadedAt: "2026-07-23",
  },
];

export const demoUsers: AppUser[] = [
  {
    id: "USR-001",
    name: "Arjun Singh",
    email: "admin@healthinsure.com",
    role: "Admin",
    department: "Operations",
  },
  {
    id: "USR-002",
    name: "Kavita Agent",
    email: "agent@healthinsure.com",
    role: "Insurance Agent",
    department: "Policy Desk",
  },
  {
    id: "USR-003",
    name: "Rohit Sharma",
    email: "customer@healthinsure.com",
    role: "Customer",
    customerId: "CUS-001",
    department: "Customer Portal",
  },
];
