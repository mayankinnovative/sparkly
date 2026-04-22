import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Invoice, Language, TaxBreakdown } from '@/types';
import { formatDateTz } from '@/lib/timezone';
import { FileText, ExternalLink, Eye, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  draft: 'secondary',
  sent: 'info',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'destructive',
};

// Tax rates for computing breakdown when not stored in DB
const TAX_RATES = {
  GST_QST: { gst: 0.05, qst: 0.09975 },
  HST: { hst: 0.13 },
};

function getTaxBreakdown(inv: Invoice): { type: 'GST_QST' | 'HST'; breakdown: TaxBreakdown } {
  // Use stored breakdown if available
  if (inv.taxBreakdown && inv.taxType) {
    return { type: inv.taxType, breakdown: inv.taxBreakdown };
  }

  // Determine tax type from taxType field or customer type
  const taxType: 'GST_QST' | 'HST' =
    inv.taxType || (inv.customer?.customerType === 'ON' ? 'HST' : 'GST_QST');

  // Compute breakdown from subtotal
  const subtotal = Number(inv.subtotal);
  if (taxType === 'HST') {
    return { type: 'HST', breakdown: { hst: Math.round(subtotal * TAX_RATES.HST.hst * 100) / 100 } };
  }
  return {
    type: 'GST_QST',
    breakdown: {
      gst: Math.round(subtotal * TAX_RATES.GST_QST.gst * 100) / 100,
      qst: Math.round(subtotal * TAX_RATES.GST_QST.qst * 100) / 100,
    },
  };
}

type InvoiceDetail = Invoice;

// ─── SendLinkModal ───────────────────────────────────────────────────────────
function SendLinkModal({ invoice, lang, onClose, onSuccess }: {
  invoice: Invoice;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState(invoice.customer?.email || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    setError(null);
    setSending(true);
    try {
      await api.post(`/invoices/${invoice.id}/payment-link`, { email });
      setSent(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{t('sendPaymentLink', lang)}</h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-800">{t('emailSentSuccess', lang)}</p>
            <p className="text-sm text-gray-500 mt-1">{email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Invoice <span className="font-mono font-semibold">{invoice.invoiceNo}</span>
                {' '}— <strong>${Number(invoice.total).toFixed(2)}</strong>
              </p>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {t('recipientEmail', lang)}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) handleSend(); }}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={sending}>
                {t('cancel', lang)}
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !email.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? t('sending', lang) : t('sendLink', lang)}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InvoiceDetailModal ───────────────────────────────────────────────────────
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
                <p className="font-mono font-semibold">{invoice.invoiceNo}</p>
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
              {(() => {
                const { type, breakdown } = getTaxBreakdown(invoice);
                return type === 'GST_QST' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('gst', lang)}</span>
                      <span>${Number(breakdown.gst ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('qst', lang)}</span>
                      <span>${Number(breakdown.qst ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('hst', lang)}</span>
                    <span>${Number(breakdown.hst ?? 0).toFixed(2)}</span>
                  </div>
                );
              })()}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>{t('total', lang)}</span>
                <span>${Number(invoice.total).toFixed(2)}</span>
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
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [sendLinkInvoice, setSendLinkInvoice] = useState<Invoice | null>(null);
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'cancelled' | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);

  const refreshInvoices = () => {
    api.get('/invoices').then(({ data }) => setInvoices(data.data)).catch(console.error);
  };

  const handleOpenLink = async (inv: Invoice) => {
    if (inv.paymentLink?.url) {
      window.open(inv.paymentLink.url, '_blank');
      return;
    }
    setGeneratingLinkId(inv.id);
    try {
      const { data } = await api.post(`/invoices/${inv.id}/generate-link`);
      refreshInvoices();
      if (data.data?.url) window.open(data.data.url, '_blank');
    } catch {
      // refreshInvoices will still update list
    } finally {
      setGeneratingLinkId(null);
    }
  };

  // Handle Stripe redirect: ?payment=success&session_id=xxx OR ?payment=cancelled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'success') {
      setPaymentBanner('success');
      // Verify session with backend to ensure DB is updated (in case webhook hasn't fired)
      if (sessionId) {
        api.post('/invoices/verify-payment', { sessionId })
          .catch(() => {/* webhook may have already handled it */})
          .finally(() => refreshInvoices());
      } else {
        refreshInvoices();
      }
      // Clean URL params without page reload
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'cancelled') {
      setPaymentBanner('cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/invoices')
      .then(({ data }) => setInvoices(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('invoices', lang)}</h1>

      {/* Payment result banner */}
      {paymentBanner === 'success' && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{t('paymentSuccess', lang)}</span>
          </div>
          <Button size="sm" variant="ghost" className="text-green-700 hover:text-green-900 h-7 px-2" onClick={() => setPaymentBanner(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {paymentBanner === 'cancelled' && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{t('paymentCancelled', lang)}</span>
          </div>
          <Button size="sm" variant="ghost" className="text-amber-700 hover:text-amber-900 h-7 px-2" onClick={() => setPaymentBanner(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
                  <td className="px-4 py-3 text-sm font-mono">{inv.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm font-medium">{inv.customer?.name}</td>
                  <td className="px-4 py-3 text-sm">${inv.subtotal}</td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      const { type, breakdown } = getTaxBreakdown(inv);
                      return type === 'GST_QST' ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-gray-500">{t('gst', lang)}: ${Number(breakdown.gst ?? 0).toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{t('qst', lang)}: ${Number(breakdown.qst ?? 0).toFixed(2)}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">{t('hst', lang)}: ${Number(breakdown.hst ?? 0).toFixed(2)}</div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">${inv.total}</td>
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
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={generatingLinkId === inv.id}
                            onClick={() => handleOpenLink(inv)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {generatingLinkId === inv.id ? t('loading', lang) : t('openStripeLink', lang)}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setSendLinkInvoice(inv)} className="gap-1">
                            <Send className="h-3 w-3" />
                            {inv.paymentLink?.url ? t('resendLink', lang) : t('sendPaymentLink', lang)}
                          </Button>
                        </>
                      )}
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

      {sendLinkInvoice && (
        <SendLinkModal
          invoice={sendLinkInvoice}
          lang={lang}
          onClose={() => setSendLinkInvoice(null)}
          onSuccess={refreshInvoices}
        />
      )}
    </div>
  );
}
