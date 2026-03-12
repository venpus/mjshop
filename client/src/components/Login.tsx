import { useState } from 'react';
import { LogIn, Lock, User, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PasswordForgotDialog } from './PasswordForgotDialog';
import { AdminSignupModal } from './AdminSignupModal';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginProps {
  onLogin: (id: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function Login({ onLogin, isLoading = false, error: externalError }: LoginProps) {
  const { t } = useLanguage();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!id.trim()) {
      setError(t('login.idRequired'));
      return;
    }

    if (!password.trim()) {
      setError(t('login.passwordRequired'));
      return;
    }

    try {
      await onLogin(id.trim(), password);
    } catch (err: any) {
      setError(err.message || t('login.failed'));
    }
  };

  const displayError = error || externalError;

  return (
    <div className="h-screen max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md mx-auto pt-4 pb-8">
        {/* Logo/Title - 앱에서 잘 보이도록 간격 축소 */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-purple-600 rounded-2xl mb-3">
            <LogIn className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t('login.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('login.subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {signupSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-green-800 font-medium">{t('login.signupSuccess')}</p>
                  <p className="text-sm text-green-700 mt-1">{t('login.signupSuccessDetail')}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800 flex-1">{displayError}</p>
              </div>
            )}

            {/* ID Input */}
            <div className="space-y-2">
              <Label htmlFor="id" className="text-gray-700 font-medium">
                {t('login.id')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="id"
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder={t('login.idPlaceholder')}
                  className="pl-10 h-12"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                {t('login.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="pl-10 h-12"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-purple-600 hover:text-purple-700 hover:underline transition-colors"
                disabled={isLoading}
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            {/* Login Button - 항상 보이도록 폼 상단과 간격 유지 */}
            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('login.submitting')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  <span>{t('login.submit')}</span>
                </div>
              )}
            </Button>

            {/* Signup Link */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowSignupModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
                disabled={isLoading}
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('login.signup')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs sm:text-sm text-gray-500 mt-4 space-y-1">
          <p>© 2025-2026 WK 관리 시스템. All rights reserved.</p>
          <p>Development By INVENTIO</p>
        </div>
      </div>

      {/* Password Forgot Dialog */}
      {showForgotPassword && (
        <PasswordForgotDialog onClose={() => setShowForgotPassword(false)} />
      )}

      {/* Admin Signup Modal */}
      {showSignupModal && (
        <AdminSignupModal
          onClose={() => {
            setShowSignupModal(false);
            setSignupSuccess(false);
          }}
          onSuccess={() => {
            setShowSignupModal(false);
            setSignupSuccess(true);
            // 5초 후 성공 메시지 자동 제거
            setTimeout(() => {
              setSignupSuccess(false);
            }, 5000);
          }}
        />
      )}
    </div>
  );
}

