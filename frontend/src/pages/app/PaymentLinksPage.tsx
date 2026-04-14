import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { t } from '@/lib/i18n';
import api from '@/lib/api';
import type { Invoice, Language } from '@/types';
import { Link2, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';

export function PaymentLinksPage() {
  const { language, selectedAccountId } = useAuthStore();
  const lang = language as Language;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.get('/invoices')
      .then(({ data }) => {
        const withLinks = data.data.filter((inv: Invoice) => inv.paymentLink);
        setInvoices(withLinks);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('paymentLinks', lang)}</h1>

      {loading ? (
        <p className="text-center text-gray-500 py-12">{t('loading', lang)}</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Link2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>{t('noPaymentLinks', lang)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-medium">{inv.invoiceNo}</span>
                    <Badge variant={inv.paymentLink?.status === 'paid' ? 'success' : inv.paymentLink?.status === 'expired' ? 'destructive' : 'info'}>
                      {inv.paymentLink?.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{inv.customer?.name} — ${inv.total}</p>
                </div>
                <div className="flex items-center gap-2">
                  {inv.paymentLink?.url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(inv.paymentLink!.url, inv.id)}
                      >
                        {copied === inv.id ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {copied === inv.id ? t('copied', lang) : t('copy', lang)}
                      </Button>
                      <a href={inv.paymentLink.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" /> {t('open', lang)}
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
