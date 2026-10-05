import React from 'react';
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  CalendarClock,
  FolderArchive,
  BarChart3,
  Users2,
  Settings,
  X,
  History,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabId =
  | 'dashboard'
  | 'companies'
  | 'violations'
  | 'tasks'
  | 'documents'
  | 'reports'
  | 'users'
  | 'settings'
  | 'audit';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  counts: {
    violationsCount: number;
    companiesCount: number;
    openTasksCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  lang,
  counts,
}) => {
  const { effectiveRole } = useAuth();

  const navItems: Array<{
    id: TabId;
    labelAr: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      labelAr: 'الرئيسية',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'companies',
      labelAr: 'الشركات',
      labelEn: 'Companies',
      icon: Building2,
      badge: counts.companiesCount,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'violations',
      labelAr: 'المخالفات',
      labelEn: 'Violations',
      icon: AlertTriangle,
      badge: counts.violationsCount,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'tasks',
      labelAr: 'المهام والمواعيد',
      labelEn: 'Tasks & Deadlines',
      icon: CalendarClock,
      badge: counts.openTasksCount,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'documents',
      labelAr: 'المستندات',
      labelEn: 'Documents',
      icon: FolderArchive,
    },
    {
      id: 'reports',
      labelAr: 'التقارير',
      labelEn: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'audit',
      labelAr: 'سجل العمليات',
      labelEn: 'Audit Log',
      icon: History,
    },
    {
      id: 'users',
      labelAr: 'المستخدمون',
      labelEn: 'Users & Roles',
      icon: Users2,
    },
    {
      id: 'settings',
      labelAr: 'الإعدادات وجيت هب',
      labelEn: 'Settings & GitHub',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-all duration-200 ease-in-out border-e border-slate-800 ${
          isOpen ? 'translate-x-0' : 'max-lg:-translate-x-full rtl:max-lg:translate-x-full'
        } lg:static lg:translate-x-0`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-slate-800">
          <span className="font-bold text-sm text-slate-200">
            {lang === 'ar' ? 'القائمة الرئيسية' : 'Navigation Menu'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Compliance Badge */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">
              {lang === 'ar' ? 'نظام الامتثال التنظيمي' : 'HRSD Regulated'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'مُتوافق مع لائحة تنظيم العمل وقرارات وزارة الموارد البشرية بالمملكة'
              : 'Compliant with Saudi Labor Law & Qiwa Ministry mandates.'}
          </p>
        </div>
      </aside>
    </>
  );
};
