import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import { formatDateTz } from '@/lib/timezone';
import type { DashboardOverview, Language } from '@/types';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const EXPENSE_COLORS = ['#2563EB', '#7C3AED', '#059669', '#EA580C', '#DC2626', '#0891B2', '#CA8A04', '#6366F1', '#EC4899'];

export function RevenueReportPage() {
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: number; revenue: number }[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<{ total: number; byCategory: Record<string, number>; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = parseInt(formatDateTz(now, 'yyyy'), 10);
    const from = `${year}-01-01T00:00:00.000Z`;
    const to = now.toISOString();

    Promise.all([
      api.get('/dashboard/overview', { params: { from, to } }),
      api.get('/dashboard/monthly-revenue', { params: { year } }),
      api.get('/expenses/summary', { params: { from, to } }),
    ])
      .then(([ov, mr, es]) => {
        setOverview(ov.data.data);
        setMonthlyRevenue(mr.data.data);
        setExpenseSummary(es.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  if (loading) return <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = monthlyRevenue.map((m) => ({ name: MONTHS[m.month - 1], revenue: m.revenue }));

  const pieData = expenseSummary
    ? Object.entries(expenseSummary.byCategory).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('revenueReport', lang)}</h1>

      {overview && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalRevenue', lang)}</p>
                  <p className="text-xl font-bold">${overview.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalExpenses', lang)}</p>
                  <p className="text-xl font-bold">${overview.totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('laborCost', lang)}</p>
                  <p className="text-xl font-bold">${overview.totalLaborCost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('profit', lang)}</p>
                  <p className="text-xl font-bold">${overview.profit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('monthlyRevenue', lang)}</CardTitle></CardHeader>
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

        <Card>
          <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: $${value}`}>
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-12">{t('noData', lang)}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
