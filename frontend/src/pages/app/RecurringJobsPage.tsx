import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { RecurringJob, Language } from '@/types';
import { format } from 'date-fns';
import { CalendarClock, Lock } from 'lucide-react';

export function RecurringJobsPage() {
  const { language, account } = useAuthStore();
  const lang = language as Language;
  const [jobs, setJobs] = useState<RecurringJob[]>([]);
  const [loading, setLoading] = useState(true);

  const hasAccess = hasPlanAccess(account?.plan, 'pro');

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return; }
    api.get('/recurring-jobs')
      .then(({ data }) => setJobs(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-600">{t('upgradeRequired', lang)}</h2>
        <p className="text-gray-500">Recurring Jobs require the Pro plan or higher.</p>
        <Button>{t('upgradePlan', lang)}</Button>
      </div>
    );
  }

  const freqColor = { daily: 'info', weekly: 'warning', monthly: 'secondary' } as const;
  const statusColor = { active: 'success', paused: 'warning', cancelled: 'destructive' } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('recurringJobs', lang)}</h1>

      {loading ? (
        <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <CalendarClock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            {t('noData', lang)}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customer', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('jobDescription', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('amount', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((rj) => (
                <tr key={rj.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{rj.customer?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rj.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant={freqColor[rj.frequency] || 'secondary'} className="capitalize">{rj.frequency}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">${Number(rj.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(rj.nextRun), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColor[rj.status] || 'secondary'} className="capitalize">{rj.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
