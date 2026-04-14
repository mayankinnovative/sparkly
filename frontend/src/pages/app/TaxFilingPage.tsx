import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import { formatDateTz } from '@/lib/timezone';
import type { Language } from '@/types';
import { Calculator } from 'lucide-react';

interface TaxSummary {
  totalSubtotal: number;
  totalTax: number;
  totalAmount: number;
  invoiceCount: number;
  gst: number;
  qst: number;
  hst: number;
}

export function TaxFilingPage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = `${formatDateTz(now, 'yyyy')}-01-01T00:00:00.000Z`;
    const to = now.toISOString();
    api.get('/dashboard/tax-summary', { params: { from, to } })
      .then(({ data }) => setSummary(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasGstQst = summary ? (summary.gst > 0 || summary.qst > 0) : false;
  const hasHst = summary ? summary.hst > 0 : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('taxFiling', lang)}</h1>

      {loading ? (
        <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>
      ) : summary ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('subtotal', lang)}</p>
                <p className="text-3xl font-bold">${summary.totalSubtotal.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('taxCollected', lang)}</p>
                <p className="text-3xl font-bold text-sparkly-blue">${summary.totalTax.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('invoices', lang)}</p>
                <p className="text-3xl font-bold">{summary.invoiceCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t('taxBreakdown', lang)}
                {hasGstQst && hasHst ? ' (GST + QST / HST)' : hasGstQst ? ' (GST + QST)' : ' (HST)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hasGstQst && (
                  <>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('gst', lang)}</p>
                        <p className="text-sm text-gray-500">{t('gstDescription', lang)}</p>
                      </div>
                      <p className="text-xl font-bold">${summary!.gst.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('qst', lang)}</p>
                        <p className="text-sm text-gray-500">{t('qstDescription', lang)}</p>
                      </div>
                      <p className="text-xl font-bold">${summary!.qst.toLocaleString()}</p>
                    </div>
                  </>
                )}
                {hasHst && (
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{t('hst', lang)}</p>
                        <p className="text-sm text-gray-500">{t('hstDescription', lang)}</p>
                    </div>
                    <p className="text-xl font-bold">${summary!.hst.toLocaleString()}</p>
                  </div>
                )}
                <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
                  <span>{t('totalTaxCollected', lang)}</span>
                  <span className="text-sparkly-blue">${summary.totalTax.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">{t('noData', lang)}</CardContent>
        </Card>
      )}
    </div>
  );
}
