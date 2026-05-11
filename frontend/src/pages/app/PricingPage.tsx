import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t, type TranslationKey } from '@/lib/i18n';
import type { Language, Plan } from '@/types';
import { CheckCircle2, Sparkles, X, Loader2, Tag } from 'lucide-react';
import api from '@/lib/api';

const defaultPricing: Record<string, number> = { solo: 19, pro: 29, business: 49 };

const planMeta: { name: Plan; label: string; features: TranslationKey[] }[] = [
  {
    name: 'solo',
    label: 'Solo',
    features: ['plan1User', 'planUnlimitedCustomers', 'planJobMgmt', 'planBasicInvoicing', 'planExpenseTracking', 'planDashboard'],
  },
  {
    name: 'pro',
    label: 'Pro',
    features: ['planUpTo5Users', 'planEverythingInSolo', 'planRecurringJobs', 'planStaffMgmt', 'planRevenueReports', 'planPaymentLinks'],
  },
  {
    name: 'business',
    label: 'Business',
    features: ['planUnlimitedUsers', 'planEverythingInPro', 'planPayrollWC', 'planAccountantRole', 'planTaxFiling', 'planPrioritySupport'],
  },
];

interface CouponBreakdown {
  plan: string;
  province: string;
  subtotal: number;
  discount: number;
  afterDiscount: number;
  gst: number;
  qst: number;
  hst: number;
  taxTotal: number;
  total: number;
}

function UpgradeModal({
  plan,
  province,
  lang,
  onClose,
}: {
  plan: Plan;
  province: string;
  lang: Language;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [breakdown, setBreakdown] = useState<CouponBreakdown | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initial preview without coupon
  useEffect(() => {
    let cancelled = false;
    api
      .post('/subscriptions/validate-coupon', { code: '__preview__', plan, province })
      .catch(() => null)
      .finally(() => {
        // The validate endpoint requires a valid code, so for the no-coupon preview
        // we compute it client-side from the plan price + province rates.
        if (cancelled) return;
        const rates: Record<string, { gst: number; qst: number; hst: number }> = {
          QC: { gst: 0.05, qst: 0.09975, hst: 0 },
          ON: { gst: 0, qst: 0, hst: 0.13 },
          AB: { gst: 0.05, qst: 0, hst: 0 },
          BC: { gst: 0.05, qst: 0, hst: 0 },
        };
        const r = rates[province] || rates.QC;
        const subtotal = defaultPricing[plan] ?? 0;
        const gst = Math.round(subtotal * r.gst * 100) / 100;
        const qst = Math.round(subtotal * r.qst * 100) / 100;
        const hst = Math.round(subtotal * r.hst * 100) / 100;
        const taxTotal = Math.round((gst + qst + hst) * 100) / 100;
        setBreakdown({
          plan,
          province,
          subtotal,
          discount: 0,
          afterDiscount: subtotal,
          gst,
          qst,
          hst,
          taxTotal,
          total: Math.round((subtotal + taxTotal) * 100) / 100,
        });
      });

    // Pull the live base price from /pricing so the modal stays in sync
    api.get('/pricing').then((res) => {
      if (cancelled) return;
      const live = res.data?.data?.[plan];
      if (typeof live === 'number') {
        setBreakdown((prev) => {
          if (!prev) return prev;
          const rates: Record<string, { gst: number; qst: number; hst: number }> = {
            QC: { gst: 0.05, qst: 0.09975, hst: 0 },
            ON: { gst: 0, qst: 0, hst: 0.13 },
            AB: { gst: 0.05, qst: 0, hst: 0 },
            BC: { gst: 0.05, qst: 0, hst: 0 },
          };
          const r = rates[province] || rates.QC;
          const gst = Math.round(live * r.gst * 100) / 100;
          const qst = Math.round(live * r.qst * 100) / 100;
          const hst = Math.round(live * r.hst * 100) / 100;
          const taxTotal = Math.round((gst + qst + hst) * 100) / 100;
          return {
            ...prev,
            subtotal: live,
            afterDiscount: live,
            discount: 0,
            gst,
            qst,
            hst,
            taxTotal,
            total: Math.round((live + taxTotal) * 100) / 100,
          };
        });
      }
    }).catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [plan, province]);

  const handleApplyCoupon = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setError(null);
    try {
      const res = await api.post('/subscriptions/validate-coupon', { code: code.trim(), plan, province });
      const data = res.data?.data;
      if (data?.breakdown) {
        setBreakdown(data.breakdown);
        setAppliedCode(data.code);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not validate this code');
      setAppliedCode(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCode(null);
    setCode('');
    setError(null);
    if (breakdown) {
      const subtotal = breakdown.subtotal;
      // Recompute without discount
      const rates: Record<string, { gst: number; qst: number; hst: number }> = {
        QC: { gst: 0.05, qst: 0.09975, hst: 0 },
        ON: { gst: 0, qst: 0, hst: 0.13 },
        AB: { gst: 0.05, qst: 0, hst: 0 },
        BC: { gst: 0.05, qst: 0, hst: 0 },
      };
      const r = rates[province] || rates.QC;
      const gst = Math.round(subtotal * r.gst * 100) / 100;
      const qst = Math.round(subtotal * r.qst * 100) / 100;
      const hst = Math.round(subtotal * r.hst * 100) / 100;
      const taxTotal = Math.round((gst + qst + hst) * 100) / 100;
      setBreakdown({
        ...breakdown,
        discount: 0,
        afterDiscount: subtotal,
        gst,
        qst,
        hst,
        taxTotal,
        total: Math.round((subtotal + taxTotal) * 100) / 100,
      });
    }
  };

  const handleConfirmUpgrade = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/subscriptions/upgrade', {
        plan,
        ...(appliedCode ? { discountCode: appliedCode } : {}),
      });
      const url = res.data?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError('Could not start checkout. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upgrade failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {lang === 'fr' ? 'Mettre à niveau vers' : 'Upgrade to'} {plan.toUpperCase()}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{lang === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
            <span>${breakdown?.subtotal.toFixed(2) ?? '—'}</span>
          </div>
          {breakdown && breakdown.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>
                {lang === 'fr' ? 'Remise' : 'Discount'}
                {appliedCode ? ` (${appliedCode})` : ''}
              </span>
              <span>−${breakdown.discount.toFixed(2)}</span>
            </div>
          )}
          {breakdown && breakdown.gst > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span>${breakdown.gst.toFixed(2)}</span>
            </div>
          )}
          {breakdown && breakdown.qst > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>QST (9.975%)</span>
              <span>${breakdown.qst.toFixed(2)}</span>
            </div>
          )}
          {breakdown && breakdown.hst > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>HST (13%)</span>
              <span>${breakdown.hst.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-2 mt-2">
            <span>{lang === 'fr' ? 'Total' : 'Total'}</span>
            <span>${breakdown?.total.toFixed(2) ?? '—'}</span>
          </div>
          <p className="text-xs text-gray-500 pt-1">
            {lang === 'fr'
              ? 'La remise s\u2019applique avant les taxes (province : ' + province + ').'
              : `Discount applies before tax (province: ${province}).`}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            {lang === 'fr' ? 'Code de remise (optionnel)' : 'Discount code (optional)'}
          </label>
          {appliedCode ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mt-1">
              <span className="text-sm text-emerald-700 flex items-center gap-2">
                <Tag className="h-4 w-4" /> {appliedCode}
              </span>
              <button onClick={handleRemoveCoupon} className="text-xs text-red-600 hover:underline">
                {lang === 'fr' ? 'Retirer' : 'Remove'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={lang === 'fr' ? 'Entrez le code' : 'Enter code'}
                className="flex-1 border rounded-md px-3 py-2 text-sm"
                disabled={validating}
              />
              <Button onClick={handleApplyCoupon} disabled={validating || !code.trim()} variant="outline">
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === 'fr' ? 'Appliquer' : 'Apply')}
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
            {t('cancel', lang)}
          </Button>
          <Button onClick={handleConfirmUpgrade} disabled={submitting || !breakdown} className="flex-1">
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : (lang === 'fr' ? 'Confirmer et payer' : 'Confirm & Pay')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PricingPage() {
  const { language, account, user } = useAuthStore();
  const lang = language as Language;
  const currentPlan = account?.plan;
  const [pricing, setPricing] = useState<Record<string, number>>(defaultPricing);
  const [upgradePlan, setUpgradePlan] = useState<Plan | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const isOwner = user?.role === 'account_owner';

  useEffect(() => {
    api.get('/pricing')
      .then((res) => {
        if (res.data?.data) setPricing(res.data.data);
      })
      .catch(() => {/* use defaults */});

    // Show success / cancel banners after Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      // Refresh the page so the auth/account state reflects the new plan
      window.history.replaceState({}, '', window.location.pathname);
      window.location.reload();
    }
  }, []);

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const res = await api.post('/subscriptions/portal');
      const portalUrl = res.data?.data?.portalUrl;
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (err: any) {
      console.error('Portal error:', err);
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('pricing', lang)}</h1>
        {isOwner && currentPlan && currentPlan !== 'solo' && (
          <Button
            variant="outline"
            className="gap-2"
            disabled={openingPortal}
            onClick={handleOpenPortal}
          >
            {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('manageSubscription', lang)}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {planMeta.map((plan) => {
          const isCurrent = currentPlan === plan.name;
          const price = pricing[plan.name] ?? defaultPricing[plan.name];
          const isDowngrade = hasPlanAccess(currentPlan, plan.name);
          return (
            <Card key={plan.name} className={isCurrent ? 'border-sparkly-blue border-2 shadow-lg' : ''}>
              <CardHeader className="text-center">
                {isCurrent && (
                  <Badge className="mx-auto mb-2 bg-sparkly-blue">{t('currentPlan', lang)}</Badge>
                )}
                <CardTitle className="text-2xl">{plan.label}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold">${price}</span>
                  <span className="text-gray-500">{t('perMonth', lang)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-sparkly-green flex-shrink-0" />
                      {t(f, lang)}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="w-full" disabled>{t('currentPlan', lang)}</Button>
                ) : isDowngrade ? (
                  <Button className="w-full" variant="outline" disabled title={lang === 'fr' ? 'Contactez le support pour rétrograder' : 'Contact support to downgrade'}>
                    {t('downgrade', lang)}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => setUpgradePlan(plan.name)}>
                    {t('upgrade', lang)}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Customer Portal card — visible to account_owner only */}
      {isOwner && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-800">{t('manageSubscription', lang)}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('portalDesc', lang)}</p>
            </div>
            <Button variant="outline" className="gap-2 shrink-0" disabled={openingPortal} onClick={handleOpenPortal}>
              {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('openCustomerPortal', lang)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trial banner */}
      <Card className="bg-gradient-to-r from-sparkly-blue to-sparkly-purple">
        <CardContent className="p-8 text-center text-white">
          <Sparkles className="h-10 w-10 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('freeTrialTitle', lang)}</h2>
          <p className="text-white/80 max-w-lg mx-auto">
            {t('freeTrialDesc', lang)}
          </p>
        </CardContent>
      </Card>

      {upgradePlan && (
        <UpgradeModal
          plan={upgradePlan}
          province={account?.province || 'QC'}
          lang={lang}
          onClose={() => setUpgradePlan(null)}
        />
      )}
    </div>
  );
}
