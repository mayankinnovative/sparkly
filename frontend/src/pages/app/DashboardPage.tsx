import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { DashboardOverview, Language } from '@/types';
import {
  DollarSign, TrendingDown, TrendingUp, Briefcase,
  BarChart3, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DashboardPage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: number; revenue: number }[]>([]);
  const [topClients, setTopClients] = useState<{ id: string; name: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const from = `${year}-01-01T00:00:00.000Z`;
    const to = now.toISOString();

    Promise.all([
      api.get('/dashboard/overview', { params: { from, to } }),
      api.get('/dashboard/monthly-revenue', { params: { year } }),
      api.get('/dashboard/top-clients', { params: { from, to, limit: 5 } }),
    ])
      .then(([ov, mr, tc]) => {
        setOverview(ov.data.data);
        setMonthlyRevenue(mr.data.data);
        setTopClients(tc.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
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
              <p className="text-sm text-muted-foreground">Jobs Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold">${overview.totalPaid.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Invoices Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingDown className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <p className="text-3xl font-bold">${overview.totalOutstanding.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
