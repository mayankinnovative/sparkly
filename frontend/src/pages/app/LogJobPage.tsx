import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { t, TranslationKey } from '@/lib/i18n';
import api from '@/lib/api';
import { nowLocalInput } from '@/lib/timezone';
import type { Customer, Language } from '@/types';
import { CheckCircle2, Loader2 } from 'lucide-react';

/** Each extra has a stable DB value (English) + a translation key for display. */
const JOB_EXTRAS: { value: string; key: TranslationKey }[] = [
  { value: 'Pets area',                key: 'extPetsArea' },
  { value: 'Inside Fridge',            key: 'extInsideFridge' },
  { value: 'Inside Oven / Dishwasher', key: 'extInsideOven' },
  { value: 'Inside Washer & Dryer',    key: 'extInsideWasher' },
  { value: 'Interior Windows',         key: 'extInteriorWindows' },
  { value: 'Exterior Windows',         key: 'extExteriorWindows' },
  { value: 'Slide Doors / Glass',      key: 'extSlideDoors' },
  { value: 'Carpet Shampoo',           key: 'extCarpetShampoo' },
  { value: 'Stairs / Steps',           key: 'extStairs' },
  { value: 'Sweep Balcony',            key: 'extSweepBalcony' },
  { value: 'Extra Bathroom',           key: 'extExtraBathroom' },
];

export function LogJobPage() {
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customerId: '',
    title: '',
    description: '',
    scheduledDate: nowLocalInput(),
    price: '',
    notes: '',
  });
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/customers').then(({ data }) => setCustomers(data.data)).catch(console.error);
  }, [selectedAccountId]);

  const toggleExtra = (extra: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await api.post('/jobs', {
        ...form,
        price: parseFloat(form.price),
        scheduledDate: new Date(form.scheduledDate).toISOString(),
        extras: selectedExtras,
      });
      setSuccess(true);
      setForm({ customerId: '', title: '', description: '', scheduledDate: nowLocalInput(), price: '', notes: '' });
      setSelectedExtras([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('logJob', lang)}</h1>
      <Card>
        <CardContent className="p-6">
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-200">
              <CheckCircle2 className="h-5 w-5" /> {t('jobLoggedSuccess', lang)}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('customer', lang)}</Label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">{t('selectCustomer', lang)}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('title', lang)} *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Deep clean - 3 bedroom house"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('jobDescription', lang)}</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder={t('optionalDetails', lang)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('scheduledDate', lang)}</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('amount', lang)} ($)</Label>
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
            </div>
            {/* ─── Extras ─────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label>{t('jobExtras', lang)}</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-gray-50">
                {JOB_EXTRAS.map(({ value, key }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(value)}
                      onChange={() => toggleExtra(value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {t(key, lang)}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('notes', lang)}</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder={t('optionalNotes', lang)}
              />
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
