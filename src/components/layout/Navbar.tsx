import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, ROLE_TRANSLATIONS } from '../../types';
import {
  ShieldAlert,
  LogOut,
  UserCheck,
  Globe,
  Database,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  lang,
  setLang,
}) => {
  const { currentUser, userProfile, effectiveRole, logout, switchSimulatedRole } = useAuth();

  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    document.documentElement.setAttribute('dir', nextLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', nextLang);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Legal Consultant':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Compliance Officer':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Right/Left: Brand and Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    SAED <span className="text-blue-700">COMPLY</span>
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    HRSD v2.4
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  {lang === 'ar'
                    ? 'نظام ساعد للامتثال وإدارة مخالفات الموارد البشرية'
                    : 'Saudi HR Compliance & Violations Management System'}
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Language, Role Simulation, User Profile, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Database indicator */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Database className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'فايربيس متصل' : 'Firebase Connected'}</span>
            </div>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              title="تغيير لغة الواجهة / Switch Language"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Role quick tester (for admin/demo verification) */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[11px] text-slate-500 px-1 font-medium">
                {lang === 'ar' ? 'الصلاحية:' : 'Role:'}
              </span>
              <select
                value={effectiveRole}
                onChange={(e) => switchSimulatedRole?.(e.target.value as UserRole)}
                className="bg-white text-xs text-slate-800 font-semibold rounded px-2 py-1 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                title="تجربة صلاحيات الدور"
              >
                <option value="Admin">Admin (مدير النظام)</option>
                <option value="Legal Consultant">Legal Consultant (مستشار قانوني)</option>
                <option value="Compliance Officer">Compliance Officer (مسؤول امتثال)</option>
                <option value="Viewer">Viewer (مطلع)</option>
              </select>
            </div>

            {/* User Profile */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-1 pr-1">
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-semibold text-slate-800 truncate max-w-[140px]">
                    {userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0]}
                  </div>
                  <span
                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium border ${getRoleBadgeColor(
                      effectiveRole
                    )}`}
                  >
                    {lang === 'ar' ? ROLE_TRANSLATIONS[effectiveRole]?.ar || effectiveRole : effectiveRole}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : <UserCheck className="w-4 h-4" />}
                </div>

                <button
                  onClick={() => logout()}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title={lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
