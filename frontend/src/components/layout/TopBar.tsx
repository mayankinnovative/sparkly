import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin } from 'lucide-react';
// types inferred from store

export function TopBar() {
  const { user, account, province, language, setProvince, setLanguage } = useAuthStore();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  const toggleProvince = () => {
    setProvince(province === 'QC' ? 'ON' : 'QC');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {account?.businessName || 'Sparkly'}
        </h2>
        {account?.plan && (
          <Badge variant="info" className="capitalize">{account.plan}</Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Province toggle */}
        <button
          onClick={toggleProvince}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-gray-50 text-sm transition-colors"
        >
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{province}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-gray-50 text-sm transition-colors"
        >
          <Globe className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{language === 'en' ? 'EN' : 'FR'}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="h-8 w-8 rounded-full bg-sparkly-blue/10 flex items-center justify-center">
            <span className="text-sparkly-blue text-sm font-bold">
              {user?.fullName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.fullName}
          </span>
        </div>
      </div>
    </header>
  );
}
