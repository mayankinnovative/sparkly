import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { RecurringJob, Customer, Language } from '@/types';
import { format } from 'date-fns';
import { CalendarClock, Lock, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react';

const emptyForm = {
  customerId: '',
  title: '',
  description: '',
  frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
  price: '',
  nextRun: new Date().toISOString().slice(0, 16),
};

export function RecurringJobsPage() {
  const { language, account } = useAuthStore();
  const lang = language as Language;
  const [jobs, setJobs] = useState<RecurringJob[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingJob, setEditingJob] = useState<RecurringJob | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const hasAccess = hasPlanAccess(account?.plan, 'pro');

  const fetchJobs = () => {
    api.get('/recurring-jobs')
      .then(({ data }) => setJobs(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return; }
    fetchJobs();
    api.get('/customers').then(({ data }) => setCustomers(data.data)).catch(console.error);
  }, [hasAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/recurring-jobs', {
        ...form,
        price: parseFloat(form.price),
        nextRun: new Date(form.nextRun).toISOString(),
      });
      setShowForm(false);
      setForm(emptyForm);
      fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rj: RecurringJob) => {
    setEditingJob(rj);
    setEditForm({
      customerId: rj.customerId || '',
      title: rj.title || '',
      description: rj.description || '',
      frequency: rj.frequency || 'weekly',
      price: String(rj.price || 0),
      nextRun: rj.nextRun ? new Date(rj.nextRun).toISOString().slice(0, 16) : '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    setSaving(true);
    try {
      await api.put(`/recurring-jobs/${editingJob.id}`, {
        ...editForm,
        price: parseFloat(editForm.price),
        nextRun: new Date(editForm.nextRun).toISOString(),
      });
      setEditingJob(null);
      fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete', lang))) return;
    try {
      await api.delete(`/recurring-jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePauseResume = async (rj: RecurringJob) => {
    try {
      if (rj.status === 'active') {
        await api.patch(`/recurring-jobs/${rj.id}/cancel`);
      } else {
        await api.put(`/recurring-jobs/${rj.id}`, { status: 'active' });
      }
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

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
  const statusColor = { active: 'success', paused: 'warning', cancelled: 'destructive', draft: 'secondary' } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('recurringJobs', lang)}</h1>
        <Button onClick={() => { setShowForm(!showForm); setEditingJob(null); }}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? t('cancel', lang) : t('create', lang)}
        </Button>
      </div>

      {showForm && !editingJob && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('create', lang)} Recurring Job</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('customer', lang)} *</Label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Weekly office cleaning"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('amount', lang)} ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="150.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>First Run Date *</Label>
                  <Input
                    type="datetime-local"
                    value={form.nextRun}
                    onChange={(e) => setForm({ ...form, nextRun: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('jobDescription', lang)}</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional details..."
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('create', lang)}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Recurring Job Modal */}
      {editingJob && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('edit', lang)} Recurring Job</h2>
              <Button size="sm" variant="ghost" onClick={() => setEditingJob(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('customer', lang)} *</Label>
                  <select
                    value={editForm.customerId}
                    onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <select
                    value={editForm.frequency}
                    onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('amount', lang)} ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Run Date *</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.nextRun}
                    onChange={(e) => setEditForm({ ...editForm, nextRun: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('jobDescription', lang)}</Label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Optional details..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('save', lang)}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingJob(null)}>{t('cancel', lang)}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((rj) => (
                <tr key={rj.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{rj.customer?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rj.description || rj.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={freqColor[rj.frequency] || 'secondary'} className="capitalize">{rj.frequency}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">${Number(rj.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(rj.nextRun), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColor[rj.status] || 'secondary'} className="capitalize">{rj.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={rj.status === 'active' ? 'destructive' : 'outline'}
                        onClick={() => handlePauseResume(rj)}
                      >
                        {rj.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(rj)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(rj.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
