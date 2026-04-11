import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Invoice, Language } from '@/types';
import { formatDateTz } from '@/lib/timezone';
import { FileText, ExternalLink } from 'lucide-react';

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  draft: 'secondary',
  sent: 'info',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'destructive',
};

export function InvoicesPage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices')
      .then(({ data }) => setInvoices(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const createPaymentLink = async (invoiceId: string) => {
    try {
      const { data } = await api.post(`/invoices/${invoiceId}/payment-link`);
      const link = data.data;
      // Refresh invoices
      const res = await api.get('/invoices');
      setInvoices(res.data.data);
      if (link.url) window.open(link.url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('invoices', lang)}</h1>

      {loading ? (
        <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            {t('noData', lang)}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoiceNumber', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customer', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subtotal', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tax', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('total', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dueDate', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status', lang)}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payment', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{inv.customer?.name}</td>
                  <td className="px-4 py-3 text-sm">${inv.subtotal}</td>
                  <td className="px-4 py-3 text-sm">${inv.totalTax}</td>
                  <td className="px-4 py-3 text-sm font-bold">${inv.totalAmount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTz(inv.dueDate, 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[inv.status] || 'secondary'} className="capitalize">
                      {t(inv.status as any, lang)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {inv.paymentLink?.url ? (
                      <a href={inv.paymentLink.url} target="_blank" rel="noopener noreferrer" className="text-sparkly-blue hover:underline flex items-center gap-1 text-sm">
                        <ExternalLink className="h-3 w-3" /> {t('pay', lang)}
                      </a>
                    ) : inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                      <Button size="sm" variant="outline" onClick={() => createPaymentLink(inv.id)}>
                        {t('createLink', lang)}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
