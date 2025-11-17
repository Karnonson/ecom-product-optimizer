import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Home, HelpCircle, Shield, LogOut, Languages, Settings, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
        >
          <Home className="h-4 w-4 mr-2" />
          {t('nav.home')}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/help')}>
              <HelpCircle className="h-4 w-4 mr-2" />
              {t('nav.help')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/privacy')}>
              <Shield className="h-4 w-4 mr-2" />
              {t('nav.privacy')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {language === 'fr' ? (
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                <Languages className="h-4 w-4 mr-2" />
                English
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setLanguage('fr')}>
                <Languages className="h-4 w-4 mr-2" />
                Français
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/')}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
