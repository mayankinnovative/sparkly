export type Plan = 'solo' | 'pro' | 'business';
export type UserRole = 'super_admin' | 'account_owner' | 'staff' | 'accountant';
export type Province = 'QC' | 'ON';
export type Language = 'en' | 'fr';
export type JobStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  accountId: string;
  isActive: boolean;
}

export interface Account {
  id: string;
  businessName: string;
  plan: Plan;
  province: Province;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface Job {
  id: string;
  customerId: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  scheduledDate: string;
  completedAt?: string | null;
  price: number;
  status: JobStatus;
  notes?: string | null;
  customer?: { id: string; name: string };
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

export interface RecurringJob {
  id: string;
  customerId: string;
  title: string;
  description?: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  price: number;
  nextRun: string;
  status: 'draft' | 'active' | 'paused';
  customer?: { id: string; name: string };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subtotal: number;
  gst: number;
  qst: number;
  hst: number;
  totalTax: number;
  totalAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  taxType: 'GST_QST' | 'HST';
  language: Language;
  customer?: Customer;
  paymentLink?: PaymentLink | null;
}

export interface PaymentLink {
  id: string;
  url: string;
  amount: number;
  status: 'active' | 'paid' | 'expired';
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string | null;
}

export interface PayrollEntry {
  id: string;
  userId: string;
  grossPay: number;
  federalTax: number;
  provincialTax: number;
  cpp: number;
  ei: number;
  qpp: number;
  qpip: number;
  totalDeductions: number;
  netPay: number;
  province: string;
  user?: { id: string; fullName: string };
}

export interface DashboardOverview {
  totalRevenue: number;
  totalExpenses: number;
  totalLaborCost: number;
  profit: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  jobCount: number;
  completedJobs: number;
  invoiceCount: number;
  expenseCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
