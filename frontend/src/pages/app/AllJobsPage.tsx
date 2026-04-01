import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Job, Customer, Language } from '@/types';
import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle, Play, Pencil, Trash2, X, Loader2 } from 'lucide-react';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    customerId: '',
    title: '',
    description: '',
    scheduledDate: '',
    price: '',
    status: 'pending' as string,
    notes: '',
  });

  const fetchJobs = () => {
    api.get('/jobs')
      .then(({ data }) => setJobs(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
    api.get('/customers').then(({ data }) => setCustomers(data.data)).catch(console.error);
  }, []);

  const markComplete = async (id: string) => {
    try {
      await api.patch(`/jobs/${id}/complete`);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'completed' as const } : j)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      customerId: job.customerId || '',
      title: job.title || '',
      description: job.description || '',
      scheduledDate: job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : '',
      price: String(job.price || 0),
      status: job.status,
      notes: job.notes || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    setSaving(true);
    try {
      await api.put(`/jobs/${editingJob.id}`, {
        ...editForm,
        price: parseFloat(editForm.price),
        scheduledDate: new Date(editForm.scheduledDate).toISOString(),
      });
      setEditingJob(null);
      fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/jobs/${deleteId}`);
      setJobs((prev) => prev.filter((j) => j.id !== deleteId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
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

      {/* Edit Job Modal */}
      {editingJob && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('edit', lang)} Job</h2>
              <Button size="sm" variant="ghost" onClick={() => setEditingJob(null)}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('customer', lang)}</Label>
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
                  <Label>{t('scheduledDate', lang)}</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.scheduledDate}
                    onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('amount', lang)} ($)</Label>
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
                  <Label>{t('status', lang)}</Label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="pending">{t('pending', lang)}</option>
                    <option value="in_progress">{t('inProgress', lang)}</option>
                    <option value="completed">{t('completed', lang)}</option>
                    <option value="cancelled">{t('cancelled', lang)}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('jobDescription', lang)}</Label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Optional"
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
                      <div className="flex gap-1">
                        {job.status !== 'completed' && job.status !== 'cancelled' && (
                          <Button size="sm" variant="outline" onClick={() => markComplete(job.id)}>
                            Complete
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(job)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(job.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title={t('confirmDeleteTitle', lang)}
        message={t('confirmDelete', lang)}
        confirmLabel={t('delete', lang)}
        cancelLabel={t('cancel', lang)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
