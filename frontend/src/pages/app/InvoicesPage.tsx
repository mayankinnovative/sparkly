import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Invoice, Language } from '@/types';
import { formatDateTz } from '@/lib/timezone';
import { FileText, ExternalLink, Eye, X } from 'lucide-react';

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  draft: 'secondary',
  sent: 'info',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'destructive',
};

interface InvoiceDetail extends Invoice {
  lineItems?: { description: string; qty: number; rate: number; amount: number }[];
  issuedDate?: string;
  notes?: string | null;
}

function InvoiceDetailModal({ invoiceId, lang, onClose }: { invoiceId: string; lang: Language; onClose: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/invoices/${invoiceId}`)
      .then(({ data }) => setInvoice(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{t('invoiceDetails', lang)}</h2>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">{t('loading', lang)}</p>
        ) : !invoice ? (
          <p className="text-center text-gray-500 py-8">{t('noData', lang)}</p>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">{t('invoiceNumber', lang)}</p>
                <p className="font-mono font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">{t('status', lang)}</p>
                <Badge variant={statusVariant[invoice.status] || 'secondary'} className="capitalize mt-1">
                  {t(invoice.status as any, lang)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">{t('customer', lang)}</p>
                <p className="font-medium">{invoice.customer?.name}</p>
                {invoice.customer?.email && <p className="text-sm text-gray-500">{invoice.customer.email}</p>}
                {invoice.customer?.phone && <p className="text-sm text-gray-500">{invoice.customer.phone}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">{t('dueDate', lang)}</p>
                <p>{formatDateTz(invoice.dueDate, 'MMM d, yyyy')}</p>
                {invoice.issuedDate && (
                  <>
                    <p className="text-xs text-gray-500 uppercase mt-2">{t('issuedDate', lang)}</p>
                    <p>{formatDateTz(invoice.issuedDate, 'MMM d, yyyy')}</p>
                  </>
                )}
              </div>
            </div>

            {/* Line Items */}
            {invoice.lineItems && invoice.lineItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">{t('lineItems', lang)}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('description', lang)}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('qty', lang)}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('rate', lang)}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('amount', lang)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoice.lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.qty}</td>
                          <td className="px-4 py-2 text-sm text-right">${item.rate.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('subtotal', lang)}</span>
                <span>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('tax', lang)}</span>
                <span>${Number(invoice.totalTax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>{t('total', lang)}</span>
                <span>${Number(invoice.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">{t('notes', lang)}</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Link */}
            {invoice.paymentLink?.url && (
              <div className="border-t pt-4">
                <a
                  href={invoice.paymentLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sparkly-blue hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> {t('pay', lang)}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InvoicesPage() {
  const { language } = useAuthStore();
  const lang = language as Language;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions', lang)}</th>
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
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedInvoiceId(inv.id)}>
                        <Eye className="h-3 w-3 mr-1" /> {t('viewDetails', lang)}
                      </Button>
                      {inv.paymentLink?.url ? (
                        <a href={inv.paymentLink.url} target="_blank" rel="noopener noreferrer" className="text-sparkly-blue hover:underline flex items-center gap-1 text-sm">
                          <ExternalLink className="h-3 w-3" /> {t('pay', lang)}
                        </a>
                      ) : inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                        <Button size="sm" variant="outline" onClick={() => createPaymentLink(inv.id)}>
                          {t('createLink', lang)}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          lang={lang}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  );
}
