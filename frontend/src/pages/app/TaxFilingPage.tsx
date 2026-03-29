import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Language } from '@/types';
import { Calculator } from 'lucide-react';

interface TaxSummary {
  totalGst: number;
  totalQst: number;
  totalHst: number;
  totalSubtotal: number;
  totalTax: number;
  invoiceCount: number;
}

export function TaxFilingPage() {
  const { language, province } = useAuthStore();
  const lang = language as Language;
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = `${now.getFullYear()}-01-01T00:00:00.000Z`;
    const to = now.toISOString();
    api.get('/dashboard/tax-summary', { params: { from, to } })
      .then(({ data }) => setSummary(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
                <p className="text-sm text-muted-foreground">Invoices</p>
                <p className="text-3xl font-bold">{summary.invoiceCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Breakdown ({province === 'QC' ? 'GST + QST' : 'HST'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {province === 'QC' ? (
                  <>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('gst', lang)}</p>
                        <p className="text-sm text-gray-500">Federal goods and services tax</p>
                      </div>
                      <p className="text-xl font-bold">${summary.totalGst.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('qst', lang)}</p>
                        <p className="text-sm text-gray-500">Quebec sales tax</p>
                      </div>
                      <p className="text-xl font-bold">${summary.totalQst.toLocaleString()}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{t('hst', lang)}</p>
                      <p className="text-sm text-gray-500">Harmonized sales tax</p>
                    </div>
                    <p className="text-xl font-bold">${summary.totalHst.toLocaleString()}</p>
                  </div>
                )}
                <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
                  <span>Total Tax Collected</span>
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
