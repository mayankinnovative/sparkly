import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';
import api from '@/lib/api';
import { Building2, User, Globe, Save } from 'lucide-react';

export function SettingsPage() {
  const { language, user, account, province, setProvince, setUser } = useAuthStore();
  const lang = language as Language;

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email] = useState(user?.email ?? '');
  const [businessName, setBusinessName] = useState(account?.businessName ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/users/me', { fullName });
      if (user) setUser({ ...user, fullName });
      setMessage(t('profileUpdated', lang));
    } catch {
      setMessage(t('profileUpdateFailed', lang));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t('settings', lang)}</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile', lang)}
          </CardTitle>
          <CardDescription>
            {t('managePersonalInfo', lang)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>{t('fullName', lang)}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>{t('email', lang)}</Label>
              <Input value={email} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>{t('username', lang)}</Label>
              <Input value={user?.username ?? ''} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>{t('role', lang)}</Label>
              <Input value={user?.role ?? ''} disabled className="bg-gray-50 capitalize" />
            </div>
            {message && <p className="text-sm text-sparkly-green">{message}</p>}
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '...' : t('save', lang)}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('businessInfo', lang)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('businessName', lang)}</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <Label>{t('plan', lang)}</Label>
            <Input value={account?.plan ?? ''} disabled className="bg-gray-50 capitalize" />
          </div>
        </CardContent>
      </Card>

      {/* Province */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('regionSettings', lang)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('provinceTaxInfo', lang)}</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={province === 'QC' ? 'default' : 'outline'}
                onClick={() => setProvince('QC')}
              >
                Québec
              </Button>
              <Button
                variant={province === 'ON' ? 'default' : 'outline'}
                onClick={() => setProvince('ON')}
              >
                Ontario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
