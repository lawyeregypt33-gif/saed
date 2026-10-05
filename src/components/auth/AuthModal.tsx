import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  lang: 'ar' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, lang }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('Compliance Officer');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose?.();
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          setLocalError(lang === 'ar' ? 'الرجاء إدخال الاسم الكامل' : 'Please enter your full name');
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, displayName, role);
        onClose?.();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMessage(
          lang === 'ar'
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
            : 'Password reset link sent to your email.'
        );
      }
    } catch (err: any) {
      setLocalError(err.message || 'حدث خطأ أثناء المعالجة');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose?.();
    } catch (err: any) {
      setLocalError(err.message || 'فشل تسجيل الدخول عبر Google');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SaedCompliance2026!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">
            {lang === 'ar' ? 'نظام ساعد للامتثال' : 'SAED COMPLY'}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {lang === 'ar'
              ? 'بوابة الدخول الموحدة لإدارة مخالفات وزارة الموارد البشرية'
              : 'HRSD Legal & Compliance Access Gateway'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setMode('login');
              setLocalError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </button>
          <button
            onClick={() => {
              setMode('register');
              setLocalError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'register'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'ar' ? 'حساب جديد' : 'Register'}
          </button>
        </div>

        <div className="p-6">
          {/* Messages */}
          {(localError || error) && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: عبد الله السعيد' : 'e.g. Abdullah Al-Saed'}
                      className="w-full text-sm border border-slate-300 rounded-lg py-2 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المسمى الوظيفي / الصلاحية' : 'Role'}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-sm border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Legal Consultant">مستشار قانوني (Legal Consultant)</option>
                    <option value="Compliance Officer">مسؤول امتثال (Compliance Officer)</option>
                    <option value="Admin">مدير النظام (Admin)</option>
                    <option value="Viewer">مطلع (Viewer)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@saed.sa"
                  className="w-full text-sm border border-slate-300 rounded-lg py-2 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm border border-slate-300 rounded-lg py-2 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>{lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span>
              ) : mode === 'login' ? (
                <>
                  <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              ) : mode === 'register' ? (
                <span>{lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}</span>
              ) : (
                <span>{lang === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}</span>
              )}
            </button>
          </form>

          {/* Google Login Option */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 border border-slate-300 rounded-lg font-medium text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{lang === 'ar' ? 'الدخول بحساب Google' : 'Sign in with Google'}</span>
            </button>
          </div>

          {/* Quick Demo Credentials */}
          <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'ar' ? 'حسابات تجريبية سريعة:' : 'Quick Demo Logins:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fillQuickDemo('lawyeregypt33@gmail.com')}
                className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 font-medium"
              >
                مدير النظام (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('legal@saed-group.sa')}
                className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 font-medium"
              >
                مستشار قانوني (Legal)
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('compliance@saed-group.sa')}
                className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium"
              >
                مسؤول امتثال (Officer)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
