import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens, setUser, setAccount } = useAuthStore();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    businessName: '',
    province: 'QC' as 'QC' | 'ON',
    plan: 'pro' as 'solo' | 'pro' | 'business',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', form);
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
          <CardDescription>Start your 14-day free trial</CardDescription>
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
            <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <select
                  value={form.plan}
                  onChange={(e) => update('plan', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="solo">Solo ($29/mo)</option>
                  <option value="pro">Pro ($49/mo)</option>
                  <option value="business">Business ($99/mo)</option>
                </select>
              </div>
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
