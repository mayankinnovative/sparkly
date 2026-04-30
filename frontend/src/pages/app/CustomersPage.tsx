import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Customer, CustomerType, Language } from '@/types';
import { Plus, Users, X, Loader2, Pencil, Trash2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const emptyForm = { name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', customerType: 'QC' as CustomerType };

export function CustomersPage() {
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const getErrorMessage = (err: unknown): string => {
    const axiosErr = err as { response?: { data?: { message?: string; error?: { details?: { field: string; message: string }[] } } } };
    if (axiosErr?.response?.data?.error?.details?.length) {
      return axiosErr.response.data.error.details.map((d) => `${d.field}: ${d.message}`).join(', ');
    }
    return axiosErr?.response?.data?.message || 'Something went wrong';
  };

  const fetchCustomers = () => {
    api.get('/customers')
      .then(({ data }) => setCustomers(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); fetchCustomers(); }, [selectedAccountId]);

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/customers/${editingId}`, form);
        showFeedback('success', 'Customer updated successfully');
      } else {
        await api.post('/customers', form);
        showFeedback('success', 'Customer created successfully');
      }
      resetForm();
      fetchCustomers();
    } catch (err) {
      console.error(err);
      showFeedback('error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      city: c.city || '',
      province: c.province || '',
      postalCode: c.postalCode || '',
      customerType: c.customerType || 'QC',
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/customers/${deleteId}`);
      showFeedback('success', 'Customer deleted successfully');
      fetchCustomers();
    } catch (err) {
      console.error(err);
      showFeedback('error', getErrorMessage(err));
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = customers.filter(
    (c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.email?.toLowerCase().includes(filter.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('customers', lang)}</h1>
        <div className="flex gap-3">
          <Input
            placeholder={t('search', lang)}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? t('cancel', lang) : t('create', lang)}
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {feedback.message}
        </div>
      )}

      {showForm && (
        <Card ref={formRef}>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">{editingId ? t('edit', lang) : t('create', lang)} {t('customer', lang)}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <select
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="QC">QC — Quebec</option>
                    <option value="ON">ON — Ontario</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setForm({ ...form, phone: v }); }} inputMode="numeric" pattern="\d*" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? t('save', lang) : t('create', lang)}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>{t('cancel', lang)}</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            {t('noData', lang)}
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.customerType === 'ON' ? 'info' : 'secondary'}>
                      {c.customerType === 'ON' ? 'Ontario' : 'Quebec'}
                    </Badge>
                    <Badge variant={c.isActive ? 'success' : 'destructive'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {c.email && <p className="text-sm text-gray-500">{c.email}</p>}
                {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
                {c.address && (
                  <p className="text-sm text-gray-400 mt-1">
                    {c.address}{c.city ? `, ${c.city}` : ''}{c.postalCode ? ` ${c.postalCode}` : ''}
                  </p>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(c)}>
                    <Pencil className="h-3 w-3 mr-1" /> {t('edit', lang)}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> {t('delete', lang)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </p>
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
        </>
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
