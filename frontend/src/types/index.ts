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

export type CustomerType = 'QC' | 'ON';

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  customerType: CustomerType;
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
  extras?: string[];
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

export interface TaxBreakdown {
  gst?: number;
  qst?: number;
  hst?: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  taxType?: 'GST_QST' | 'HST';
  taxBreakdown?: TaxBreakdown | null;
  dueDate: string;
  status: InvoiceStatus;
  issuedDate?: string;
  language: Language;
  notes?: string | null;
  lineItems?: { description: string; qty: number; rate: number; amount: number }[];
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
  payType?: string;
  hours: number;
  hourlyRate: number;
  bonus: number;
  flatPay: number;
  taxableBenefits: number;
  vacationRate: number;
  holidayPay: number;
  grossPay: number;
  federalTax: number;
  provincialTax: number;
  cpp: number;
  ei: number;
  qpp: number;
  qpip: number;
  totalDeductions: number;
  netPay: number;
  workersCompAmount: number;
  employerCosts: number;
  isInformationalOnly: boolean;
  province: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  user?: { id: string; fullName: string; role?: string };
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
