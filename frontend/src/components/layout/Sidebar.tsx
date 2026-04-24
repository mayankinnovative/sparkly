import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t, type TranslationKey } from '@/lib/i18n';
import {
  LayoutDashboard, ClipboardList, CalendarClock, Receipt,
  DollarSign, Users, FileText, Link2, Calculator, BarChart3,
  CreditCard, Settings, LogOut, Lock, Sparkles, ShieldCheck,
} from 'lucide-react';
import type { Plan, Language } from '@/types';

interface NavItem {
  label: TranslationKey;
  path: string;
  icon: React.ElementType;
  requiredPlan?: Plan;
}

const navItems: NavItem[] = [
  { label: 'dashboard', path: '/app', icon: LayoutDashboard },
  { label: 'customers', path: '/app/customers', icon: Users },
  { label: 'logJob', path: '/app/log-job', icon: ClipboardList },
  { label: 'allJobs', path: '/app/jobs', icon: CalendarClock },
  { label: 'recurringJobs', path: '/app/recurring-jobs', icon: CalendarClock, requiredPlan: 'pro' },
  { label: 'expenses', path: '/app/log-expense', icon: Receipt },
  { label: 'invoices', path: '/app/invoices', icon: FileText },
  { label: 'paymentLinks', path: '/app/payment-links', icon: Link2 },
  { label: 'payroll', path: '/app/payroll', icon: DollarSign, requiredPlan: 'pro' },
  { label: 'taxFiling', path: '/app/tax-filing', icon: Calculator },
  { label: 'revenueReport', path: '/app/revenue-report', icon: BarChart3 },
  { label: 'pricing', path: '/app/pricing', icon: CreditCard },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user, account, language, logout } = useAuthStore();
  const lang = language as Language;
  const isSuperAdmin = user?.role === 'super_admin';
  const currentPlan = account?.plan;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-sparkly-blue" />
          <span className="text-xl font-bold gradient-text">Sparkly</span>
        </div>
        {account && (
          <p className="mt-2 text-xs text-gray-500 truncate">{account.businessName}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const locked = item.requiredPlan && !isSuperAdmin && !hasPlanAccess(currentPlan, item.requiredPlan);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={locked ? '#' : item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  locked
                    ? 'text-gray-400 cursor-not-allowed'
                    : isActive
                    ? 'bg-sparkly-blue/10 text-sparkly-blue'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
              onClick={(e) => locked && e.preventDefault()}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{t(item.label, lang)}</span>
              {locked && <Lock className="h-3.5 w-3.5 ml-auto text-gray-400" />}
            </NavLink>
          );
        })}

        {/* Super Admin nav item */}
        {isSuperAdmin && (
          <NavLink
            to="/app/super-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-red-500 hover:bg-red-50'
              }`
            }
          >
            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Super Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-1">
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-sparkly-blue/10 text-sparkly-blue' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Settings className="h-5 w-5" />
          {t('settings', lang)}
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 w-full"
        >
          <LogOut className="h-5 w-5" />
          {t('logout', lang)}
        </button>
      </div>
    </aside>
  );
}
