import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/store/auth';
import { t, type TranslationKey } from '@/lib/i18n';
import api from '@/lib/api';
import { nowLocalInput, formatDateTz } from '@/lib/timezone';
import type { Expense, Language } from '@/types';
import { CheckCircle2, AlertCircle, Loader2, Plus, X, Pencil, Trash2, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  'supplies', 'equipment', 'fuel', 'wages', 'insurance',
  'marketing', 'storage', 'training', 'software', 'other',
];

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  supplies: 'catSupplies',
  equipment: 'catEquipment',
  fuel: 'catFuel',
  wages: 'catWages',
  insurance: 'catInsurance',
  marketing: 'catMarketing',
  storage: 'catStorage',
  training: 'catTraining',
  software: 'catSoftware',
  other: 'catOther',
};

const CATEGORY_COLORS: Record<string, string> = {
  supplies: 'bg-blue-100 text-blue-700',
  equipment: 'bg-purple-100 text-purple-700',
  fuel: 'bg-orange-100 text-orange-700',
  wages: 'bg-green-100 text-green-700',
  insurance: 'bg-red-100 text-red-700',
  marketing: 'bg-pink-100 text-pink-700',
  storage: 'bg-yellow-100 text-yellow-700',
  training: 'bg-indigo-100 text-indigo-700',
  software: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
};

const emptyForm = { category: 'supplies', description: '', amount: '', date: nowLocalInput() };

export function LogExpensePage() {
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const formRef = useRef<HTMLDivElement>(null);

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

  const fetchExpenses = () => {
    api.get('/expenses')
      .then(({ data }) => setExpenses(data.data))
      .catch(console.error)
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { setLoadingList(true); fetchExpenses(); }, [selectedAccountId]);

  const resetForm = () => {
    setForm({ ...emptyForm, date: nowLocalInput() });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
      };
      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
        showFeedback('success', t('expenseUpdated', lang));
      } else {
        await api.post('/expenses', payload);
        showFeedback('success', t('expenseLoggedSuccess', lang));
      }
      resetForm();
      fetchExpenses();
    } catch (err) {
      console.error(err);
      showFeedback('error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description || '',
      amount: String(expense.amount),
      date: formatDateTz(expense.date, "yyyy-MM-dd'T'HH:mm"),
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/expenses/${deleteId}`);
      showFeedback('success', t('expenseDeleted', lang));
      fetchExpenses();
    } catch (err) {
      console.error(err);
      showFeedback('error', getErrorMessage(err));
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = expenses.filter(
    (exp) => !filter || exp.description?.toLowerCase().includes(filter.toLowerCase()) || exp.category.toLowerCase().includes(filter.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('expenses', lang)}</h1>
        <div className="flex gap-3">
          <Input
            placeholder={t('search', lang)}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? t('cancel', lang) : t('addExpense', lang)}
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <Card ref={formRef}>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">{editingId ? t('editExpense', lang) : t('logExpense', lang)}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('category', lang)}</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t(CATEGORY_KEYS[c], lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('jobDescription', lang)}</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('amount', lang)} ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('date', lang)}</Label>
                  <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? t('save', lang) : t('save', lang)}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>{t('cancel', lang)}</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      {loadingList ? (
        <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            {t('noData', lang)}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date', lang)}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('category', lang)}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('jobDescription', lang)}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('amount', lang)}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTz(exp.date, 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>
                        {t(CATEGORY_KEYS[exp.category], lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{exp.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">${Number(exp.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(exp)}>
                          <Pencil className="h-3 w-3 mr-1" /> {t('edit', lang)}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteId(exp.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> {t('delete', lang)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {t('showing', lang)} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} {t('of', lang)} {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> {t('previous', lang)}
                </Button>
                <span className="text-sm font-medium">{t('page', lang)} {page} {t('of', lang)} {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  {t('next', lang)} <ChevronRight className="h-4 w-4" />
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
