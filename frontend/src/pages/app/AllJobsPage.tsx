import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Job, Language } from '@/types';
import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle, Play } from 'lucide-react';

const statusConfig: Record<string, { variant: 'info' | 'warning' | 'success' | 'destructive'; icon: React.ElementType }> = {
  pending: { variant: 'info', icon: Clock },
  scheduled: { variant: 'info', icon: Clock },
  in_progress: { variant: 'warning', icon: Play },
  completed: { variant: 'success', icon: CheckCircle2 },
  cancelled: { variant: 'destructive', icon: XCircle },
};

export function AllJobsPage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/jobs')
      .then(({ data }) => setJobs(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markComplete = async (id: string) => {
    try {
      await api.patch(`/jobs/${id}/complete`);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'completed' as const } : j)));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = jobs.filter(
    (j) =>
      !filter ||
      (j.title || '').toLowerCase().includes(filter.toLowerCase()) ||
      (j.description || '').toLowerCase().includes(filter.toLowerCase()) ||
      j.customer?.name.toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">{t('loading', lang)}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('allJobs', lang)}</h1>
        <input
          type="text"
          placeholder={t('search', lang)}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">{t('noData', lang)}</CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customer', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('jobDescription', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('scheduledDate', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('amount', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((job) => {
                const cfg = statusConfig[job.status] || statusConfig.scheduled;
                const Icon = cfg.icon;
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{job.customer?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{job.description || job.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(job.scheduledDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">${Number(job.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {t(job.status === 'in_progress' ? 'inProgress' : job.status === 'pending' ? 'pending' : job.status as any, lang)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {job.status !== 'completed' && job.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" onClick={() => markComplete(job.id)}>
                          Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
