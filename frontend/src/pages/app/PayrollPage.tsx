import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import { formatDateTz } from '@/lib/timezone';
import type { PayrollEntry, Language, User } from '@/types';
import { DollarSign, Lock, Calculator, Plus, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface RemittanceSummary {
  totalGross: number;
  totalFederalTax: number;
  totalProvincialTax: number;
  totalCpp: number;
  totalEi: number;
  totalQpp: number;
  totalQpip: number;
  totalDeductions: number;
  totalNet: number;
  totalWorkersComp: number;
  totalEmployerCosts: number;
  entryCount: number;
  disclaimer?: string;
}

interface FormState {
  userId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  hours: string;
  hourlyRate: string;
  bonus: string;
  flatPay: string;
  taxableBenefits: string;
  holidayPay: string;
  vacationRate: string;
  payType: 'hourly' | 'flat' | 'salary';
  province: 'QC' | 'ON';
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0] || '';
}

function isoStart(d: string): string {
  return new Date(`${d}T00:00:00.000Z`).toISOString();
}

function emptyForm(province: 'QC' | 'ON'): FormState {
  const today = todayIso();
  return {
    userId: '',
    payPeriodStart: today,
    payPeriodEnd: today,
    hours: '0',
    hourlyRate: '0',
    bonus: '0',
    flatPay: '0',
    taxableBenefits: '0',
    holidayPay: '0',
    vacationRate: '0.04',
    payType: 'hourly',
    province,
  };
}

export function PayrollPage() {
  const { language, account, province, user, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const isSuperAdmin = user?.role === 'super_admin';
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [remittance, setRemittance] = useState<RemittanceSummary | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm((province as 'QC' | 'ON') || 'QC'));

  // FR-PAY-11: Payroll requires Pro plan or above.
  const hasAccess = isSuperAdmin || hasPlanAccess(account?.plan, 'pro');

  const reload = () => {
    if (!hasAccess) { setLoading(false); return; }
    if (isSuperAdmin && !selectedAccountId) { setLoading(false); return; }
    setLoading(true);
    const now = new Date();
    const from = `${formatDateTz(now, 'yyyy')}-01-01T00:00:00.000Z`;
    const to = now.toISOString();
    Promise.all([
      api.get('/payroll'),
      api.get('/payroll/remittance', { params: { from, to } }),
      api.get('/users').catch(() => ({ data: { data: [] } })),
    ])
      .then(([e, r, u]) => {
        setEntries(e.data.data);
        setRemittance(r.data.data);
        setStaff((u.data.data as User[]).filter((x) => x.role === 'staff' || x.role === 'account_owner'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(reload, [hasAccess, selectedAccountId]);

  const openForm = () => {
    setForm(emptyForm((province as 'QC' | 'ON') || 'QC'));
    setFormError(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.userId) {
      setFormError('Please select an employee.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/payroll', {
        userId: form.userId,
        payPeriodStart: isoStart(form.payPeriodStart),
        payPeriodEnd: isoStart(form.payPeriodEnd),
        hours: Number(form.hours) || 0,
        hourlyRate: Number(form.hourlyRate) || 0,
        bonus: Number(form.bonus) || 0,
        flatPay: Number(form.flatPay) || 0,
        taxableBenefits: Number(form.taxableBenefits) || 0,
        holidayPay: Number(form.holidayPay) || 0,
        vacationRate: Number(form.vacationRate) || 0,
        payType: form.payType,
        province: form.province,
      });
      setShowForm(false);
      reload();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create payroll entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-600">{t('upgradeRequired', lang)}</h2>
        <p className="text-gray-500">{t('payrollRequiresBusiness', lang)}</p>
        <Button>{t('upgradePlan', lang)}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('payroll', lang)}</h1>
        {!isSuperAdmin && user?.role === 'account_owner' && (
          <Button onClick={openForm} className="gap-2">
            <Plus className="h-4 w-4" /> Run Payroll Estimate
          </Button>
        )}
      </div>

      {/* Informational disclaimer (FR-PAY-10) */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          {remittance?.disclaimer ||
            'Payroll estimates here are informational only — they are not official pay stubs or tax slips.'}
        </span>
      </div>

      {/* Remittance summary */}
      {remittance && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('grossPay', lang)}</p>
              <p className="text-2xl font-bold text-gray-900">${remittance.totalGross.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('totalDeductions', lang)}</p>
              <p className="text-2xl font-bold text-red-600">${remittance.totalDeductions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('netPay', lang)}</p>
              <p className="text-2xl font-bold text-emerald-600">${remittance.totalNet.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('workersComp', lang)}</p>
              <p className="text-2xl font-bold text-purple-600">${remittance.totalWorkersComp.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Employer Costs</p>
              <p className="text-2xl font-bold text-orange-600">${remittance.totalEmployerCosts.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remittance detail */}
      {remittance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t('remittanceSummary', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-500">{t('federalTax', lang)}</span><span className="font-medium">${remittance.totalFederalTax}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">{t('provincialTax', lang)}</span><span className="font-medium">${remittance.totalProvincialTax}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">{province === 'QC' ? 'QPP' : 'CPP'}</span><span className="font-medium">${province === 'QC' ? remittance.totalQpp : remittance.totalCpp}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">{t('ei', lang)}</span><span className="font-medium">${remittance.totalEi}</span></div>
                {province === 'QC' && (
                  <div className="flex justify-between"><span className="text-sm text-gray-500">{t('qpip', lang)}</span><span className="font-medium">${remittance.totalQpip}</span></div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-500">{t('workersComp', lang)}</span><span className="font-medium">${remittance.totalWorkersComp}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Employer Costs</span><span className="font-medium">${remittance.totalEmployerCosts}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Entries</span><span className="font-medium">{remittance.entryCount}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay stubs */}
      {isSuperAdmin && !selectedAccountId ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            Select an account from the Super Admin panel to view payroll data.
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="text-center text-gray-500 py-8">{t('loading', lang)}</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            {t('noData', lang)}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('employee', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('grossPay', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('federalTax', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('provincialTax', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('cppQpp', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('ei', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('netPay', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('workersComp', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('province', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{e.user?.fullName}</td>
                  <td className="px-4 py-3 text-sm">${e.grossPay}</td>
                  <td className="px-4 py-3 text-sm text-red-500">${e.federalTax}</td>
                  <td className="px-4 py-3 text-sm text-red-500">${e.provincialTax}</td>
                  <td className="px-4 py-3 text-sm">${e.province === 'QC' ? e.qpp : e.cpp}</td>
                  <td className="px-4 py-3 text-sm">${e.ei}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">${e.netPay}</td>
                  <td className="px-4 py-3 text-sm text-purple-600">${e.workersCompAmount}</td>
                  <td className="px-4 py-3"><Badge variant="info">{e.province}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <form onSubmit={submit}>
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-lg font-bold">Run Payroll Estimate</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 max-h-[70vh] overflow-y-auto">
                <div className="sm:col-span-2">
                  <Label>Employee</Label>
                  <select
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  >
                    <option value="">— Select an employee —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>
                    ))}
                  </select>
                  {staff.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      No employees yet. Add a staff member from the Users API
                      (POST&nbsp;/users) before creating a payroll entry — or run an estimate
                      against the account owner once their record is loaded.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Pay Type</Label>
                  <select
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form.payType}
                    onChange={(e) => setForm({ ...form, payType: e.target.value as FormState['payType'] })}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="flat">Flat</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
                <div>
                  <Label>Province</Label>
                  <select
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value as 'QC' | 'ON' })}
                  >
                    <option value="QC">Quebec (QC)</option>
                    <option value="ON">Ontario (ON)</option>
                  </select>
                </div>
                <div>
                  <Label>Pay Period Start</Label>
                  <Input type="date" value={form.payPeriodStart} onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })} />
                </div>
                <div>
                  <Label>Pay Period End</Label>
                  <Input type="date" value={form.payPeriodEnd} onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })} />
                </div>
                <div>
                  <Label>Hours</Label>
                  <Input type="number" step="0.01" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                </div>
                <div>
                  <Label>Hourly Rate ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                </div>
                <div>
                  <Label>Bonus ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
                </div>
                <div>
                  <Label>Flat Pay ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.flatPay} onChange={(e) => setForm({ ...form, flatPay: e.target.value })} />
                </div>
                <div>
                  <Label>Holiday Pay ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.holidayPay} onChange={(e) => setForm({ ...form, holidayPay: e.target.value })} />
                </div>
                <div>
                  <Label>Taxable Benefits ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.taxableBenefits} onChange={(e) => setForm({ ...form, taxableBenefits: e.target.value })} />
                </div>
                <div>
                  <Label>Vacation Rate (e.g. 0.04)</Label>
                  <Input type="number" step="0.0001" min="0" max="1" value={form.vacationRate} onChange={(e) => setForm({ ...form, vacationRate: e.target.value })} />
                </div>
                {formError && (
                  <div className="sm:col-span-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t px-6 py-4">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>
                  {t('cancel', lang)}
                </Button>
                <Button type="submit" disabled={submitting || !form.userId}>
                  {submitting ? t('loading', lang) : t('create', lang)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
