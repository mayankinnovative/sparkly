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
      const { data } = await api.patch('/users/me', { fullName });
      if (user) setUser({ ...user, fullName });
      setMessage(lang === 'en' ? 'Profile updated successfully' : 'Profil mis à jour');
    } catch {
      setMessage(lang === 'en' ? 'Failed to update profile' : 'Échec de la mise à jour');
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
            {lang === 'en' ? 'Profile' : 'Profil'}
          </CardTitle>
          <CardDescription>
            {lang === 'en' ? 'Manage your personal information' : 'Gérez vos informations personnelles'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>{lang === 'en' ? 'Full Name' : 'Nom complet'}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={user?.role ?? ''} disabled className="bg-gray-50 capitalize" />
            </div>
            {message && <p className="text-sm text-sparkly-green">{message}</p>}
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '...' : lang === 'en' ? 'Save' : 'Sauvegarder'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {lang === 'en' ? 'Business Information' : "Informations de l'entreprise"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{lang === 'en' ? 'Business Name' : "Nom de l'entreprise"}</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <Label>{lang === 'en' ? 'Plan' : 'Forfait'}</Label>
            <Input value={account?.plan ?? ''} disabled className="bg-gray-50 capitalize" />
          </div>
        </CardContent>
      </Card>

      {/* Province */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {lang === 'en' ? 'Region Settings' : 'Paramètres régionaux'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{lang === 'en' ? 'Province (affects tax calculations)' : 'Province (affecte les calculs de taxe)'}</Label>
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
