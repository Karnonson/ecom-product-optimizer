import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Login() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - in production, this would validate credentials
    navigate('/dashboard');
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }
    // Mock signup - in production, this would create the account
    toast({
      title: t('auth.checkEmail'),
      description: t('auth.resetEmailSent'),
    });
    setMode('login');
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock password reset - in production, this would send reset email
    setResetEmailSent(true);
    setResendTimer(60);
    toast({
      title: t('auth.resetEmailSent'),
      description: t('auth.checkEmail'),
    });
  };

  const handleResend = () => {
    // Mock resend - in production, this would resend the reset email
    setResendTimer(60);
    toast({
      title: t('auth.resetEmailSent'),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Languages className="h-4 w-4 mr-2" />
              {language.toUpperCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('fr')}>
              Français
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {mode === 'login' && t('auth.login')}
            {mode === 'signup' && t('auth.signup')}
            {mode === 'forgot-password' && t('auth.resetPassword')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('dashboard.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {t('auth.submit')}
              </Button>
              <div className="space-y-2 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-sm text-primary hover:underline block w-full"
                >
                  {t('auth.forgotPassword')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-sm text-primary hover:underline block w-full"
                >
                  {t('auth.createAccount')}
                </button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">{t('auth.email')}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t('auth.password')}</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {t('auth.signup')}
              </Button>
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t('auth.email')}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!resetEmailSent ? (
                <Button type="submit" className="w-full">
                  {t('auth.sendResetLink')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  className="w-full"
                >
                  {resendTimer > 0
                    ? `${t('auth.resendIn')} ${resendTimer}s`
                    : t('auth.resend')}
                </Button>
              )}
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetEmailSent(false);
                    setResendTimer(0);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
