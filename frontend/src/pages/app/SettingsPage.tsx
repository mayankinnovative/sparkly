import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';
import api from '@/lib/api';
import { Building2, User, Globe, Save, Send } from 'lucide-react';

export function SettingsPage() {
  const { language, user, account, province, setUser } = useAuthStore();
  const lang = language as Language;

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email] = useState(user?.email ?? '');
  const [businessName, setBusinessName] = useState(account?.businessName ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Province change request state
  const [requestedProvince, setRequestedProvince] = useState<'QC' | 'ON'>(province === 'QC' ? 'ON' : 'QC');
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const isOwner = user?.role === 'account_owner';

  useEffect(() => {
    if (!isOwner) return;
    api.get('/users/me/change-requests')
      .then(({ data }) => {
        const all = (data.data as any[]) || [];
        const pending = all.find((r) => r.requestType === 'province_change' && r.status === 'pending');
        setPendingRequest(pending || null);
      })
      .catch(() => {/* ignore */});
  }, [isOwner]);

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

  async function handleSubmitProvinceRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequestMessage(null);
    setRequestSubmitting(true);
    try {
      const { data } = await api.post('/users/me/change-requests', {
        requestType: 'province_change',
        requestedValue: requestedProvince,
        reason: requestReason,
      });
      setPendingRequest(data.data);
      setRequestReason('');
      setRequestMessage(lang === 'fr'
        ? 'Demande envoyée à l’administrateur.'
        : 'Request sent to the administrator.');
    } catch (err: any) {
      setRequestMessage(err.response?.data?.message || (lang === 'fr' ? 'Échec de l’envoi.' : 'Failed to send request.'));
    } finally {
      setRequestSubmitting(false);
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

      {/* Province (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('regionSettings', lang)}
          </CardTitle>
          <CardDescription>
            {lang === 'fr'
              ? 'La province est définie à l’inscription et ne peut pas être modifiée directement. Pour changer, envoyez une demande à l’administrateur.'
              : 'Province is set at sign-up and cannot be changed directly. To change it, please send a request to the administrator.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('provinceTaxInfo', lang)}</Label>
            <Input
              value={province === 'QC' ? 'Québec (QC)' : 'Ontario (ON)'}
              disabled
              className="bg-gray-50 mt-2"
            />
          </div>

          {isOwner && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">
                {lang === 'fr' ? 'Demander un changement de province' : 'Request a province change'}
              </h3>
              {pendingRequest ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {lang === 'fr'
                    ? `Demande en attente : ${pendingRequest.currentValue} → ${pendingRequest.requestedValue} (envoyée le ${new Date(pendingRequest.createdAt).toLocaleDateString()})`
                    : `Pending request: ${pendingRequest.currentValue} → ${pendingRequest.requestedValue} (sent on ${new Date(pendingRequest.createdAt).toLocaleDateString()})`}
                </div>
              ) : (
                <form onSubmit={handleSubmitProvinceRequest} className="space-y-3">
                  <div>
                    <Label>{lang === 'fr' ? 'Province souhaitée' : 'Requested province'}</Label>
                    <select
                      value={requestedProvince}
                      onChange={(e) => setRequestedProvince(e.target.value as 'QC' | 'ON')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                    >
                      <option value="QC">Québec (QC)</option>
                      <option value="ON">Ontario (ON)</option>
                    </select>
                  </div>
                  <div>
                    <Label>{lang === 'fr' ? 'Raison (facultatif)' : 'Reason (optional)'}</Label>
                    <Input
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder={lang === 'fr' ? 'Ex. déménagement à Toronto' : 'e.g. moved to Toronto'}
                      className="mt-2"
                    />
                  </div>
                  {requestMessage && (
                    <p className="text-sm text-sparkly-green">{requestMessage}</p>
                  )}
                  <Button type="submit" disabled={requestSubmitting || requestedProvince === province}>
                    <Send className="h-4 w-4 mr-2" />
                    {requestSubmitting
                      ? '...'
                      : lang === 'fr' ? 'Envoyer la demande' : 'Send request'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
