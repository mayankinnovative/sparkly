import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import { formatDateTz } from '@/lib/timezone';
import type { DashboardOverview, Language } from '@/types';
import {
  DollarSign, TrendingDown, TrendingUp, Briefcase,
  BarChart3, Users, CalendarClock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DashboardPage() {
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: number; revenue: number }[]>([]);
  const [topClients, setTopClients] = useState<{ id: string; name: string; revenue: number }[]>([]);
  const [recurringSummary, setRecurringSummary] = useState<{
    monthlyRecurringRevenue: number;
    activeCount: number;
    upcomingJobs: { id: string; title: string; customerName: string; frequency: string; price: number; nextRun: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = parseInt(formatDateTz(now, 'yyyy'), 10);
    const from = `${year}-01-01T00:00:00.000Z`;
    const to = now.toISOString();

    Promise.all([
      api.get('/dashboard/overview', { params: { from, to } }),
      api.get('/dashboard/monthly-revenue', { params: { year } }),
      api.get('/dashboard/top-clients', { params: { from, to, limit: 5 } }),
      api.get('/dashboard/recurring-summary').catch(() => ({ data: { data: null } })),
    ])
      .then(([ov, mr, tc, rs]) => {
        setOverview(ov.data.data);
        setMonthlyRevenue(mr.data.data);
        setTopClients(tc.data.data);
        setRecurringSummary(rs.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('loading', lang)}</p>
      </div>
    );
  }

  const stats = overview
    ? [
        { label: t('totalRevenue', lang), value: `$${overview.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: t('totalExpenses', lang), value: `$${overview.totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
        { label: t('laborCost', lang), value: `$${overview.totalLaborCost.toLocaleString()}`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: t('profit', lang), value: `$${overview.profit.toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
      ]
    : [];

  const chartData = monthlyRevenue.map((m) => ({
    name: MONTHS[m.month - 1],
    revenue: m.revenue,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard', lang)}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recurring Revenue Card */}
      {recurringSummary && (recurringSummary.activeCount > 0 || recurringSummary.monthlyRecurringRevenue > 0) && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">{t('recurringRevenue', lang)}</h3>
                </div>
                <p className="text-3xl font-bold text-blue-700">${recurringSummary.monthlyRecurringRevenue.toLocaleString()}<span className="text-sm font-normal text-blue-500">{t('perMonth', lang)}</span></p>
                <p className="text-sm text-blue-500 mt-1">{recurringSummary.activeCount} active recurring job{recurringSummary.activeCount !== 1 ? 's' : ''}</p>
              </div>
              {recurringSummary.upcomingJobs.length > 0 && (
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-500 uppercase mb-2">{t('nextUpcoming', lang)}</p>
                  <div className="space-y-1.5">
                    {recurringSummary.upcomingJobs.map((job) => (
                      <div key={job.id} className="text-sm">
                        <span className="font-medium text-gray-800">{job.customerName}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-500">${job.price}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-400 capitalize">{job.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('monthlyRevenue', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, t('revenue', lang)]} />
                  <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('topClients', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.length === 0 ? (
                <p className="text-sm text-gray-500">{t('noData', lang)}</p>
              ) : (
                topClients.map((client, idx) => (
                  <div key={client.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">#{idx + 1}</span>
                      <span className="text-sm font-medium">{client.name}</span>
                    </div>
                    <Badge variant="success">${client.revenue.toLocaleString()}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards */}
      {overview && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Briefcase className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold">{overview.completedJobs}/{overview.jobCount}</p>
              <p className="text-sm text-muted-foreground">{t('jobsCompleted', lang)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold">${overview.totalPaid.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t('invoicesPaid', lang)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingDown className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <p className="text-3xl font-bold">${overview.totalOutstanding.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t('outstanding', lang)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
