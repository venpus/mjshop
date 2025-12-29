import { useState } from 'react';
import { LogIn, Lock, User, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PasswordForgotDialog } from './PasswordForgotDialog';
import { AdminSignupModal } from './AdminSignupModal';

interface LoginProps {
  onLogin: (id: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function Login({ onLogin, isLoading = false, error: externalError }: LoginProps) {
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
      setError('ID를 입력해주세요.');
      return;
    }

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      await onLogin(id.trim(), password);
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    }
  };

  const displayError = error || externalError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 로그인</h1>
          <p className="text-gray-600">시스템에 접근하려면 로그인하세요</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {signupSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-green-800 font-medium">가입 신청이 완료되었습니다.</p>
                  <p className="text-sm text-green-700 mt-1">관리자 승인 후 이용 가능합니다.</p>
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
                ID
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="id"
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="관리자 ID를 입력하세요"
                  className="pl-10 h-12"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
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
                비밀번호를 잊으셨나요?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 중...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  <span>로그인</span>
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
                <span>관리자 가입 신청</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-6 space-y-1">
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

