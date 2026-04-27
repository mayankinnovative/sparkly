import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';

interface PricingInfo {
  solo: number;
  pro: number;
  business: number;
  trialDays: number;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens, setUser, setAccount } = useAuthStore();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    businessName: '',
    province: 'QC' as 'QC' | 'ON',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingInfo>({ solo: 19, pro: 29, business: 49, trialDays: 30 });

  useEffect(() => {
    api.get('/pricing')
      .then(({ data }) => {
        if (data?.data) setPricing(data.data);
      })
      .catch(() => {
        // keep defaults
      });
  }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const parts = form.fullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || parts[0] || '';
      const { data } = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
        firstName,
        lastName,
        accountName: form.businessName,
        province: form.province,
      });
      const { accessToken, refreshToken, user, account } = data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
      setAccount(account);
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-sparkly-blue" />
            <span className="text-2xl font-bold gradient-text">Sparkly</span>
          </Link>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start your {pricing.trialDays}-day free trial — no credit card required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                value={form.username}
                onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                minLength={3}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Sparkly Clean Inc."
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Province</Label>
              <select
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="QC">Quebec (QC)</option>
                <option value="ON">Ontario (ON)</option>
              </select>
              <p className="text-xs text-gray-500">
                Province cannot be changed later from your account. To change it, you'll need to send a request to the administrator.
              </p>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Plans available after your free trial:</p>
              <ul className="space-y-0.5">
                <li>Solo — ${pricing.solo}/month</li>
                <li>Pro — ${pricing.pro}/month</li>
                <li>Business — ${pricing.business}/month</li>
              </ul>
              <p className="pt-1">All new accounts start on the Solo plan with a {pricing.trialDays}-day free trial.</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sparkly-blue font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
