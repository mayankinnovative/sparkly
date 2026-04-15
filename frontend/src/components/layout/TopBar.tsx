import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin, Building2 } from 'lucide-react';
import api from '@/lib/api';
import type { Account } from '@/types';

export function TopBar() {
  const { user, account, province, language, selectedAccountId, setProvince, setLanguage, setSelectedAccountId } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/admin/accounts').then(({ data }) => {
        const raw = (data.data?.accounts || data.data || []) as any[];
        const list: Account[] = raw.map((a) => ({ ...a, businessName: a.businessName || a.name }));
        setAccounts(list);
        if (!selectedAccountId && list.length > 0) {
          setSelectedAccountId(list[0].id);
          setProvince(list[0].province);
        }
      }).catch(console.error);
    }
  }, [isSuperAdmin]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  const toggleProvince = () => {
    const newProvince = province === 'QC' ? 'ON' : 'QC';
    setProvince(newProvince);
    // For super admin, also switch to a matching account
    if (isSuperAdmin && accounts.length > 0) {
      const match = accounts.find((a) => a.province === newProvince);
      if (match) setSelectedAccountId(match.id);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const displayName = isSuperAdmin
    ? (selectedAccount?.businessName || 'All Accounts')
    : (account?.businessName || 'Sparkly');
  const displayPlan = isSuperAdmin ? selectedAccount?.plan : account?.plan;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {isSuperAdmin && accounts.length > 0 ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sparkly-blue" />
            <select
              value={selectedAccountId || ''}
              onChange={(e) => {
                const id = e.target.value || null;
                setSelectedAccountId(id);
                const acct = accounts.find((a) => a.id === id);
                if (acct) setProvince(acct.province);
              }}
              className="text-lg font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer pr-2"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.businessName}</option>
              ))}
            </select>
          </div>
        ) : (
          <h2 className="text-lg font-semibold text-gray-800">{displayName}</h2>
        )}
        {displayPlan && (
          <Badge variant="info" className="capitalize">{displayPlan}</Badge>
        )}
        {isSuperAdmin && (
          <Badge variant="destructive" className="text-xs">Super Admin</Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Province toggle */}
        <button
          onClick={toggleProvince}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-gray-50 text-sm transition-colors"
        >
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{province}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-gray-50 text-sm transition-colors"
        >
          <Globe className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{language === 'en' ? 'EN' : 'FR'}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="h-8 w-8 rounded-full bg-sparkly-blue/10 flex items-center justify-center">
            <span className="text-sparkly-blue text-sm font-bold">
              {user?.fullName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.fullName}
          </span>
        </div>
      </div>
    </header>
  );
}
