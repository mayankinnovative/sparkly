import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Language } from '@/types';
import { CheckCircle2, Loader2 } from 'lucide-react';

const CATEGORIES = [
  'supplies', 'equipment', 'fuel', 'wages', 'insurance',
  'marketing', 'storage', 'training', 'software', 'other',
];

export function LogExpensePage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [form, setForm] = useState({
    category: 'supplies',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await api.post('/expenses', {
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
      });
      setSuccess(true);
      setForm({ category: 'supplies', description: '', amount: '', date: new Date().toISOString().slice(0, 16) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('logExpense', lang)}</h1>
      <Card>
        <CardContent className="p-6">
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-200">
              <CheckCircle2 className="h-5 w-5" /> Expense logged successfully!
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/^\w/, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('jobDescription', lang)}</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('amount', lang)} ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save', lang)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
