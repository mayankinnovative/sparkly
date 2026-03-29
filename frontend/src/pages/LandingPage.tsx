import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sparkles, CheckCircle2, BarChart3, Shield, Globe,
  ArrowRight, Play, Star, Zap, Users, FileText,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Job Management',
    desc: 'Log, schedule, and track cleaning jobs effortlessly. Assign to staff and monitor completion.',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    desc: 'Maintain client profiles, contact info, and service history in one place.',
  },
  {
    icon: FileText,
    title: 'Smart Invoicing',
    desc: 'Generate GST/QST or HST invoices in English or French. Accept online payments via Stripe.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Reports',
    desc: 'Real-time dashboards showing revenue, expenses, profit, and top clients.',
  },
  {
    icon: Shield,
    title: 'Payroll & Tax Engine',
    desc: 'Canadian payroll with QPP/CPP, EI, QPIP deductions. Workers\' comp estimates included.',
  },
  {
    icon: Globe,
    title: 'Bilingual (EN/FR)',
    desc: 'Full English and French support. Province-aware tax calculations for QC and ON.',
  },
];

const plans = [
  {
    name: 'Solo',
    price: '$29',
    period: '/month',
    desc: 'Perfect for independent cleaners',
    features: ['1 User (Owner)', 'Unlimited Customers', 'Job Management', 'Basic Invoicing', 'Expense Tracking', 'Dashboard'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    desc: 'For growing cleaning businesses',
    features: ['Up to 5 Users', 'Everything in Solo', 'Recurring Jobs', 'Staff Management', 'Revenue Reports', 'Payment Links'],
    highlight: true,
  },
  {
    name: 'Business',
    price: '$99',
    period: '/month',
    desc: 'For established operations',
    features: ['Unlimited Users', 'Everything in Pro', 'Payroll & WC', 'Accountant Role', 'Tax Filing Reports', 'Priority Support'],
    highlight: false,
  },
];

const testimonials = [
  {
    name: 'Marie-Claire Dubois',
    company: 'Clean Sparkle Montréal',
    quote: 'Sparkly transformed how I run my cleaning business. Invoicing in French with QST/GST is a game-changer!',
    rating: 5,
  },
  {
    name: 'James Wright',
    company: 'Pristine Clean Toronto',
    quote: 'The payroll feature saves me hours every pay period. Tax calculations are automatic and accurate.',
    rating: 5,
  },
  {
    name: 'Sophie Tremblay',
    company: 'Maison Propre Inc.',
    quote: 'Finally a tool built for Canadian cleaners. Province-specific tax support is exactly what we needed.',
    rating: 5,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-sparkly-blue" />
            <span className="text-xl font-bold gradient-text">Sparkly</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-gray-900">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Start Free Trial <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sparkly-blue/10 text-sparkly-blue text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Built for Canadian Cleaning Businesses
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
              Manage Your Cleaning Business{' '}
              <span className="gradient-text">Like a Pro</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Jobs, invoices, payroll, and taxes — all in one place. Province-aware for Quebec & Ontario.
              Bilingual. Built for you.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="text-base px-8">
                  Start 14-Day Free Trial <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-base gap-2">
                <Play className="h-5 w-5" /> Watch Demo
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500">No credit card required. Cancel anytime.</p>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative max-w-6xl mx-auto px-6 pb-20">
          <div className="rounded-xl border shadow-2xl overflow-hidden bg-gray-50">
            <div className="p-8 bg-gradient-to-b from-white to-gray-50 text-center">
              <p className="text-lg text-gray-500">Dashboard preview — your business at a glance</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Revenue', value: '$12,450', color: 'text-emerald-600' },
                  { label: 'Expenses', value: '$3,200', color: 'text-red-500' },
                  { label: 'Jobs Done', value: '47', color: 'text-blue-600' },
                  { label: 'Net Profit', value: '$9,250', color: 'text-purple-600' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From daily job logging to year-end tax filing, Sparkly covers the entire workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-sparkly-blue/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-sparkly-blue" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600">14-day free trial on all plans. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 ${
                  plan.highlight
                    ? 'border-sparkly-blue shadow-xl scale-105 relative'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sparkly-blue text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 mt-1">{plan.desc}</p>
                <div className="mt-6 mb-8">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-sparkly-green flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <Button
                    className="w-full"
                    variant={plan.highlight ? 'default' : 'outline'}
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Canadian Cleaning Pros
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 border">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-gradient-to-r from-sparkly-blue to-sparkly-purple">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Sparkle?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Join hundreds of Canadian cleaning businesses already using Sparkly.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-sparkly-blue hover:bg-gray-100 text-base px-10">
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-sparkly-blue" />
                <span className="text-lg font-bold text-white">Sparkly</span>
              </div>
              <p className="text-sm">Cleaning business management software built for Canada.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><Link to="/register" className="hover:text-white">Free Trial</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-8 text-sm text-center">
            &copy; {new Date().getFullYear()} Sparkly. All rights reserved. Made in Canada.
          </div>
        </div>
      </footer>
    </div>
  );
}
