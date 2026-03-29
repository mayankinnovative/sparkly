import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Customer, Language } from '@/types';
import { Plus, Users, X, Loader2 } from 'lucide-react';

export function CustomersPage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '' });

  const fetchCustomers = () => {
    api.get('/customers')
      .then(({ data }) => setCustomers(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/customers', form);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '' });
      fetchCustomers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(
    (c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.email?.toLowerCase().includes(filter.toLowerCase()),
  );

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
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? t('cancel', lang) : t('create', lang)}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
                  <Label>Postal Code</Label>
                  <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('save', lang)}
              </Button>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <Badge variant={c.isActive ? 'success' : 'destructive'}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {c.email && <p className="text-sm text-gray-500">{c.email}</p>}
                {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
                {c.address && (
                  <p className="text-sm text-gray-400 mt-1">
                    {c.address}{c.city ? `, ${c.city}` : ''}{c.postalCode ? ` ${c.postalCode}` : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
