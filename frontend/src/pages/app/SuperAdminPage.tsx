import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';
import { formatDateTz } from '@/lib/timezone';
import {
  LayoutDashboard, Users, CreditCard, Settings, Activity,
  ChevronLeft, ChevronRight, Loader2, Eye, KeyRound, LogIn,
  Pause, Play, Trash2, Plus, X, DollarSign, TrendingDown, BarChart3, AlertTriangle, Pencil,
} from 'lucide-react';

type TabKey = 'dashboard' | 'users' | 'payments' | 'settings' | 'logs';

export function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const { language } = useAuthStore();
  const lang = language as Language;

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: t('dashboard', lang), icon: LayoutDashboard },
    { key: 'users', label: t('usersAndTenants', lang), icon: Users },
    { key: 'payments', label: t('payments', lang), icon: CreditCard },
    { key: 'settings', label: t('settingsAndPromos', lang), icon: Settings },
    { key: 'logs', label: t('systemLogs', lang), icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('superAdminPanel', lang)}</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <KpiDashboard />}
      {activeTab === 'users' && <UsersTenantsTab />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'settings' && <SettingsPromosTab />}
      {activeTab === 'logs' && <SystemLogsTab />}
    </div>
  );
}

/* ───────────────────── Tab 1: KPI Dashboard ───────────────────── */
function KpiDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useAuthStore();
  const lang = language as Language;

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/kpi'),
    ])
      .then(([s, k]) => {
        setStats(s.data.data);
        setKpi(k.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const cards = [
    { label: t('totalUsers', lang), value: kpi?.totalUsers || stats?.userCount || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('totalAccounts', lang), value: kpi?.totalAccounts || stats?.accountCount || 0, icon: LayoutDashboard, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'MRR', value: `$${(kpi?.mrr || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Churn Rate', value: `${kpi?.churnRate || 0}%`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { label: t('activeSubs', lang), value: kpi?.activeSubs || 0, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('totalRevenueAdmin', lang), value: `$${(stats?.totalPaidRevenue || 0).toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <c.icon className={`h-6 w-6 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Extra details */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{stats?.jobCount || 0}</p>
            <p className="text-sm text-muted-foreground">{t('totalJobs', lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{stats?.invoiceCount || 0}</p>
            <p className="text-sm text-muted-foreground">{t('totalInvoices', lang)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-red-500">{kpi?.recentCancelled || 0}</p>
            <p className="text-sm text-muted-foreground">{t('cancelled', lang)} (30d)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────── Tab 2: Users / Tenants ───────────────────── */
function UsersTenantsTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accountDetail, setAccountDetail] = useState<any>(null);
  const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const pageSize = 10;

  const fetchAccounts = (p: number) => {
    setLoading(true);
    api.get('/admin/accounts', { params: { page: p, pageSize } })
      .then(({ data }) => {
        setAccounts(data.data.accounts);
        setTotal(data.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(page); }, [page]);

  const viewDetails = async (accountId: string) => {
    if (expandedId === accountId) { setExpandedId(null); return; }
    try {
      const { data } = await api.get(`/admin/accounts/${accountId}`);
      setAccountDetail(data.data);
      setExpandedId(accountId);
    } catch (err) { console.error(err); }
  };

  const handleSuspend = async (accountId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/accounts/${accountId}/suspend`, { reason: 'Suspended by admin' });
      setFeedback('Account suspended');
      fetchAccounts(page);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); setTimeout(() => setFeedback(null), 3000); }
  };

  const handleReactivate = async (accountId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/accounts/${accountId}/reactivate`);
      setFeedback('Account reactivated');
      fetchAccounts(page);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); setTimeout(() => setFeedback(null), 3000); }
  };

  const handleChangePlan = async (accountId: string, plan: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/accounts/${accountId}/change-plan`, { plan });
      setFeedback(`Plan changed to ${plan}`);
      fetchAccounts(page);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); setTimeout(() => setFeedback(null), 3000); }
  };

  const handleChangeProvince = async (accountId: string, province: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/accounts/${accountId}/province`, { province });
      setFeedback(`Province changed to ${province}`);
      fetchAccounts(page);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); setTimeout(() => setFeedback(null), 3000); }
  };

  const handleResetPassword = async () => {
    if (!resetPwUserId || newPassword.length < 8) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${resetPwUserId}/reset-password`, { newPassword });
      setFeedback('Password reset successfully');
      setResetPwUserId(null);
      setNewPassword('');
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); setTimeout(() => setFeedback(null), 3000); }
  };

  const handleLoginAs = async (userId: string) => {
    try {
      const { data } = await api.post(`/admin/users/${userId}/login-as`);
      const { accessToken, user } = data.data;
      // Store in a new window/tab so admin session is preserved
      window.open(`${window.location.origin}/app?impersonate=${accessToken}`, '_blank');
      setFeedback(`Login-as token generated for ${user.email}`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) { console.error(err); }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm">{feedback}</div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Province</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jobs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((acc) => (
              <>
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{acc.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="capitalize">{acc.plan}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{acc.province}</td>
                  <td className="px-4 py-3 text-sm">{acc._count?.users || 0}</td>
                  <td className="px-4 py-3 text-sm">{acc._count?.jobs || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTz(acc.createdAt, 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => viewDetails(acc.id)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleSuspend(acc.id)} disabled={actionLoading}>
                        <Pause className="h-3 w-3 text-red-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReactivate(acc.id)} disabled={actionLoading}>
                        <Play className="h-3 w-3 text-green-500" />
                      </Button>
                      <select
                        className="text-xs border rounded px-1 py-0.5"
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) handleChangePlan(acc.id, e.target.value); e.target.value = ''; }}
                      >
                        <option value="" disabled>Plan...</option>
                        <option value="solo">Solo</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                      </select>
                      <select
                        className="text-xs border rounded px-1 py-0.5"
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) handleChangeProvince(acc.id, e.target.value); e.target.value = ''; }}
                        title="Change province"
                      >
                        <option value="" disabled>Prov...</option>
                        <option value="QC">QC</option>
                        <option value="ON">ON</option>
                      </select>
                    </div>
                  </td>
                </tr>
                {expandedId === acc.id && accountDetail && (
                  <tr key={`${acc.id}-detail`}>
                    <td colSpan={7} className="px-4 py-4 bg-gray-50">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Users in {accountDetail.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {accountDetail.users?.map((u: any) => (
                            <div key={u.id} className="flex items-center justify-between bg-white p-3 rounded border">
                              <div>
                                <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => { setResetPwUserId(u.id); setNewPassword(''); }}>
                                  <KeyRound className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleLoginAs(u.id)}>
                                  <LogIn className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {resetPwUserId && (
                          <div className="flex items-center gap-2 bg-white p-3 rounded border">
                            <Input
                              type="password"
                              placeholder="New password (min 8 chars)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-64"
                            />
                            <Button size="sm" onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 8}>
                              {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                              Reset Password
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setResetPwUserId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        <div className="text-xs text-gray-400">
                          Customers: {accountDetail._count?.customers || 0} · Jobs: {accountDetail._count?.jobs || 0} · Invoices: {accountDetail._count?.invoices || 0}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm font-medium">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Tab 3: Payments / Revenue Audit ───────────────────── */
function PaymentsTab() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPayments = (p: number) => {
    setLoading(true);
    api.get('/admin/subscription-payments', { params: { page: p, pageSize: 20 } })
      .then(({ data: resp }) => setData(resp.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(page); }, [page]);

  if (loading) return <LoadingState />;
  if (!data) return <p className="text-gray-500">No data available.</p>;

  const totalMRR = data.subscriptions.reduce((s: number, sub: any) => s + sub.monthlyAmount, 0);
  const totalStripeFees = data.subscriptions.reduce((s: number, sub: any) => s + sub.stripeFee, 0);
  const totalNetRevenue = data.subscriptions.reduce((s: number, sub: any) => s + sub.netRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Total MRR</p>
            <p className="text-2xl font-bold text-emerald-600">${totalMRR.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Stripe Fees (est.)</p>
            <p className="text-2xl font-bold text-red-500">${totalStripeFees.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Net Revenue</p>
            <p className="text-2xl font-bold text-blue-600">${totalNetRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe Fee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.subscriptions.map((sub: any) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{sub.account?.name || '—'}</td>
                <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{sub.plan}</Badge></td>
                <td className="px-4 py-3">
                  <Badge variant={sub.status === 'active' ? 'success' : sub.status === 'trialing' ? 'info' : 'destructive'} className="capitalize">{sub.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm font-medium">${sub.monthlyAmount}</td>
                <td className="px-4 py-3 text-sm text-red-500">${sub.stripeFee}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">${sub.netRevenue}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDateTz(sub.startDate, 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <PaginationControls page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPageChange={setPage} />
      )}
    </div>
  );
}

/* ───────────────────── Tab 4: Settings & Promos ───────────────────── */
function SettingsPromosTab() {
  const [codes, setCodes] = useState<any[]>([]);
  const [_settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' });
  const [soloPrice, setSoloPrice] = useState('19');
  const [proPrice, setProPrice] = useState('29');
  const [businessPrice, setBusinessPrice] = useState('49');
  const [trialDays, setTrialDays] = useState('30');
  const [priceSaving, setPriceSaving] = useState(false);
  const [trialSaving, setTrialSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Change requests
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [crLoading, setCrLoading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/discount-codes'),
      api.get('/admin/settings'),
    ])
      .then(([c, s]) => {
        setCodes(c.data.data || []);
        const allSettings = s.data.data || [];
        setSettings(allSettings);
        const pricing = allSettings.find((st: any) => st.key === 'pricing');
        if (pricing?.value) {
          setSoloPrice(String(pricing.value.solo || 19));
          setProPrice(String(pricing.value.pro || 29));
          setBusinessPrice(String(pricing.value.business || 49));
        }
        const trial = allSettings.find((st: any) => st.key === 'trial_days');
        if (trial?.value !== undefined && trial?.value !== null) {
          const v = typeof trial.value === 'number' ? trial.value : (trial.value?.days ?? 30);
          setTrialDays(String(v));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchChangeRequests = () => {
    setCrLoading(true);
    api.get('/admin/change-requests')
      .then(({ data }) => setChangeRequests(data.data || []))
      .catch(console.error)
      .finally(() => setCrLoading(false));
  };

  useEffect(() => { fetchData(); fetchChangeRequests(); }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/admin/discount-codes/${editId}`, {
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          maxUses: form.maxUses || null,
          expiresAt: form.expiresAt || null,
        });
      } else {
        await api.post('/admin/discount-codes', {
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          maxUses: form.maxUses || undefined,
          expiresAt: form.expiresAt || undefined,
        });
      }
      setShowForm(false);
      setEditId(null);
      setForm({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' });
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEditCode = (c: any) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(Number(c.discountValue)),
      maxUses: c.maxUses ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/admin/discount-codes/${id}/toggle`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteCode = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/discount-codes/${deleteId}`);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setDeleteId(null); }
  };

  const handleSavePricing = async () => {
    setPriceSaving(true);
    try {
      await api.put('/admin/settings/pricing', {
        value: {
          solo: parseFloat(soloPrice),
          pro: parseFloat(proPrice),
          business: parseFloat(businessPrice),
        },
      });
      setFeedback('Pricing updated');
      setTimeout(() => setFeedback(null), 3000);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setPriceSaving(false); }
  };

  const handleSaveTrial = async () => {
    const days = parseInt(trialDays, 10);
    if (!Number.isFinite(days) || days < 0 || days > 365) {
      setFeedback('Trial days must be between 0 and 365.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setTrialSaving(true);
    try {
      await api.put('/admin/settings/trial_days', { value: days });
      setFeedback(`Free trial set to ${days} days. New signups will get this trial length.`);
      setTimeout(() => setFeedback(null), 4000);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setTrialSaving(false); }
  };

  const handleReviewRequest = async (id: string, decision: 'approved' | 'rejected') => {
    setReviewing(id);
    try {
      await api.post(`/admin/change-requests/${id}/review`, { decision });
      setFeedback(`Request ${decision}`);
      setTimeout(() => setFeedback(null), 3000);
      fetchChangeRequests();
    } catch (err) { console.error(err); }
    finally { setReviewing(null); }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm">{feedback}</div>
      )}

      {/* Pricing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Global Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Solo Plan ($/month)</Label>
              <Input type="number" step="0.01" value={soloPrice} onChange={(e) => setSoloPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pro Plan ($/month)</Label>
              <Input type="number" step="0.01" value={proPrice} onChange={(e) => setProPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Business Plan ($/month)</Label>
              <Input type="number" step="0.01" value={businessPrice} onChange={(e) => setBusinessPrice(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSavePricing} disabled={priceSaving}>
            {priceSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Pricing
          </Button>
        </CardContent>
      </Card>

      {/* Free Trial Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Free Trial Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 max-w-md">
            <div className="flex-1 space-y-2">
              <Label>Free trial length (days)</Label>
              <Input
                type="number"
                min="0"
                max="365"
                step="1"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Number of days new sign-ups get free access on the Solo plan before billing starts.
                Use 30 for one month, 14 for two weeks, 0 to disable the trial.
              </p>
            </div>
            <Button onClick={handleSaveTrial} disabled={trialSaving}>
              {trialSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Trial
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Account Change Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {crLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : changeRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No change requests submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {changeRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === 'pending' ? 'info' : r.status === 'approved' ? 'success' : 'destructive'} className="capitalize">
                        {r.status}
                      </Badge>
                      <span className="text-sm font-medium">{r.account?.name || 'Unknown account'}</span>
                      <span className="text-xs text-gray-500">
                        {r.requestType.replace(/_/g, ' ')}: {r.currentValue || '—'} → <strong>{r.requestedValue}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Requested by {r.requestedByUser?.firstName} {r.requestedByUser?.lastName} ({r.requestedByUser?.email}) on {formatDateTz(r.createdAt, 'MMM d, yyyy')}
                      {r.reason && <> · Reason: <em>{r.reason}</em></>}
                    </p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-300"
                        disabled={reviewing === r.id}
                        onClick={() => handleReviewRequest(r.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300"
                        disabled={reviewing === r.id}
                        onClick={() => handleReviewRequest(r.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Codes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Discount Codes</CardTitle>
            <Button size="sm" onClick={() => { setShowForm(!showForm); if (showForm) { setEditId(null); setForm({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' }); } }}>
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'Create'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreateCode} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SPRING20" required />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Value *</Label>
                  <Input type="number" step="0.01" min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder="e.g. 20" required />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses</Label>
                  <Input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editId ? 'Update Code' : 'Create Code'}
              </Button>
            </form>
          )}

          {codes.length === 0 ? (
            <p className="text-gray-500 text-sm">No discount codes yet.</p>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="font-mono font-bold text-sm">{c.code}</code>
                    <Badge variant={c.isActive ? 'success' : 'destructive'}>
                      {c.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {c.discountType === 'percentage' ? `${Number(c.discountValue)}%` : `$${Number(c.discountValue)}`} off
                    </span>
                    <span className="text-xs text-gray-400">
                      Used: {c.currentUses}{c.maxUses ? `/${c.maxUses}` : ''}
                    </span>
                    {c.expiresAt && (
                      <span className="text-xs text-gray-400">
                        Expires: {formatDateTz(c.expiresAt, 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEditCode(c)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(c.id)}>
                      {c.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Discount Code"
        message="Are you sure you want to delete this discount code?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteCode}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ───────────────────── Tab 5: System Logs ───────────────────── */
function SystemLogsTab() {
  const [logType, setLogType] = useState<'audit' | 'scheduler'>('audit');
  const [auditLogs, setAuditLogs] = useState<any>(null);
  const [schedulerLogs, setSchedulerLogs] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = (p: number) => {
    setLoading(true);
    const endpoint = logType === 'audit' ? '/admin/audit-log' : '/admin/scheduler-logs';
    api.get(endpoint, { params: { page: p } })
      .then(({ data }) => {
        if (logType === 'audit') setAuditLogs(data.data);
        else setSchedulerLogs(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [logType]);
  useEffect(() => { fetchLogs(page); }, [page, logType]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={logType === 'audit' ? 'default' : 'outline'}
          onClick={() => setLogType('audit')}
        >
          <AlertTriangle className="h-4 w-4 mr-1" /> Audit Log
        </Button>
        <Button
          size="sm"
          variant={logType === 'scheduler' ? 'default' : 'outline'}
          onClick={() => setLogType('scheduler')}
        >
          <Activity className="h-4 w-4 mr-1" /> Scheduler Logs
        </Button>
      </div>

      {loading ? <LoadingState /> : logType === 'audit' ? (
        <AuditLogView data={auditLogs} page={page} onPageChange={setPage} />
      ) : (
        <SchedulerLogView data={schedulerLogs} page={page} onPageChange={setPage} />
      )}
    </div>
  );
}

function AuditLogView({ data, page, onPageChange }: { data: any; page: number; onPageChange: (p: number) => void }) {
  if (!data || !data.actions?.length) return <p className="text-gray-500 text-sm">No audit log entries.</p>;

  return (
    <>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.actions.map((a: any) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{formatDateTz(a.timestamp, 'MMM d, HH:mm')}</td>
                <td className="px-4 py-3 text-sm">{a.adminUser?.firstName} {a.adminUser?.lastName}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-xs">{a.action}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.targetEntity}{a.targetId ? ` (${a.targetId.substring(0, 8)}...)` : ''}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-48 truncate">{a.metadata ? JSON.stringify(a.metadata) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <PaginationControls page={page} totalPages={data.totalPages} total={data.total} pageSize={50} onPageChange={onPageChange} />
      )}
    </>
  );
}

function SchedulerLogView({ data, page, onPageChange }: { data: any; page: number; onPageChange: (p: number) => void }) {
  if (!data || !data.logs?.length) return <p className="text-gray-500 text-sm">No scheduler log entries.</p>;

  return (
    <>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Executed At</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurring Job ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.logs.map((l: any) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{formatDateTz(l.executedAt, 'MMM d, HH:mm:ss')}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-600">{l.recurringJobId.substring(0, 8)}...</td>
                <td className="px-4 py-3">
                  <Badge variant={l.status === 'success' ? 'success' : l.status === 'skipped' ? 'warning' : 'destructive'}>
                    {l.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-red-500 max-w-64 truncate">{l.errorMessage || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <PaginationControls page={page} totalPages={data.totalPages} total={data.total} pageSize={50} onPageChange={onPageChange} />
      )}
    </>
  );
}

/* ───────────────────── Shared Components ───────────────────── */
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}

function PaginationControls({ page, totalPages, total, pageSize, onPageChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm font-medium">Page {page} of {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
