import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import { formatDateTz } from '@/lib/timezone';
import type { PayrollEntry, Language } from '@/types';
import { DollarSign, Lock, Calculator } from 'lucide-react';

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
  entryCount: number;
}

export function PayrollPage() {
  const { language, account, province } = useAuthStore();
  const lang = language as Language;
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [remittance, setRemittance] = useState<RemittanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const hasAccess = hasPlanAccess(account?.plan, 'business');

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return; }
    const now = new Date();
    const from = `${formatDateTz(now, 'yyyy')}-01-01T00:00:00.000Z`;
    const to = now.toISOString();
    Promise.all([
      api.get('/payroll'),
      api.get('/payroll/remittance', { params: { from, to } }),
    ])
      .then(([e, r]) => {
        setEntries(e.data.data);
        setRemittance(r.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-600">{t('upgradeRequired', lang)}</h2>
        <p className="text-gray-500">Payroll requires the Business plan.</p>
        <Button>{t('upgradePlan', lang)}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('payroll', lang)}</h1>

      {/* Remittance summary */}
      {remittance && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-sm text-muted-foreground">{t('federalTax', lang)}</p>
              <p className="text-2xl font-bold text-blue-600">${remittance.totalFederalTax.toLocaleString()}</p>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay stubs */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">{t('loading', lang)}</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            {t('noData', lang)}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('grossPay', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('federalTax', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('provincialTax', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('cppQpp', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('ei', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('netPay', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Province</th>
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
                  <td className="px-4 py-3"><Badge variant="info">{e.province}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
