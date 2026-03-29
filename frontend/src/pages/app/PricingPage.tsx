import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, hasPlanAccess } from '@/store/auth';
import { t } from '@/lib/i18n';
import type { Language, Plan } from '@/types';
import { CheckCircle2, Sparkles } from 'lucide-react';

const plans: { name: Plan; label: string; price: string; features: string[] }[] = [
  {
    name: 'solo',
    label: 'Solo',
    price: '$29',
    features: ['1 User (Owner)', 'Unlimited Customers', 'Job Management', 'Basic Invoicing', 'Expense Tracking', 'Dashboard'],
  },
  {
    name: 'pro',
    label: 'Pro',
    price: '$49',
    features: ['Up to 5 Users', 'Everything in Solo', 'Recurring Jobs', 'Staff Management', 'Revenue Reports', 'Payment Links'],
  },
  {
    name: 'business',
    label: 'Business',
    price: '$99',
    features: ['Unlimited Users', 'Everything in Pro', 'Payroll & WC', 'Accountant Role', 'Tax Filing Reports', 'Priority Support'],
  },
];

export function PricingPage() {
  const { language, account } = useAuthStore();
  const lang = language as Language;
  const currentPlan = account?.plan;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('pricing', lang)}</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.name;
          return (
            <Card key={plan.name} className={isCurrent ? 'border-sparkly-blue border-2 shadow-lg' : ''}>
              <CardHeader className="text-center">
                {isCurrent && (
                  <Badge className="mx-auto mb-2 bg-sparkly-blue">Current Plan</Badge>
                )}
                <CardTitle className="text-2xl">{plan.label}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-sparkly-green flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="w-full" disabled>Current Plan</Button>
                ) : (
                  <Button className="w-full" variant={hasPlanAccess(currentPlan, plan.name) ? 'outline' : 'default'}>
                    {hasPlanAccess(currentPlan, plan.name) ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trial banner */}
      <Card className="bg-gradient-to-r from-sparkly-blue to-sparkly-purple">
        <CardContent className="p-8 text-center text-white">
          <Sparkles className="h-10 w-10 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">14-Day Free Trial</h2>
          <p className="text-white/80 max-w-lg mx-auto">
            All features are available during your trial. No credit card required.
            Upgrade anytime to keep your data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
