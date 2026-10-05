import React from 'react';
import {
  Violation,
  Company,
  Task,
  VIOLATION_STATUS_TRANSLATIONS,
  RISK_LEVEL_CONFIG,
  ViolationStatus,
} from '../../types';
import {
  AlertTriangle,
  Clock,
  Coins,
  ShieldCheck,
  FileCheck2,
  AlertOctagon,
  ArrowUpRight,
  TrendingDown,
  Building,
  Plus,
} from 'lucide-react';
import { formatCurrency, isOverdue } from '../../utils/formatters';

interface DashboardViewProps {
  violations: Violation[];
  companies: Company[];
  tasks: Task[];
  lang: 'ar' | 'en';
  onNavigateToViolations: () => void;
  onOpenNewViolation: () => void;
  onSelectViolation: (violation: Violation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  violations,
  companies,
  tasks,
  lang,
  onNavigateToViolations,
  onOpenNewViolation,
  onSelectViolation,
}) => {
  // Calculations
  const totalViolations = violations.length;
  const openViolations = violations.filter(
    (v) => v.status !== 'Paid' && v.status !== 'Closed'
  ).length;
  const criticalViolations = violations.filter(
    (v) => v.riskLevel === 'Critical' && v.status !== 'Closed'
  ).length;

  const overdueViolations = violations.filter((v) => {
    if (!v.deadline || v.status === 'Closed' || v.status === 'Paid') return false;
    return isOverdue(v.deadline);
  }).length;

  const totalFines = violations.reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);
  const paidFines = violations
    .filter((v) => v.status === 'Paid')
    .reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);
  const unpaidFines = totalFines - paidFines;

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  violations.forEach((v) => {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
  });

  // Risk breakdown
  const riskCounts: Record<string, number> = {
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };
  violations.forEach((v) => {
    if (riskCounts[v.riskLevel] !== undefined) {
      riskCounts[v.riskLevel]++;
    }
  });

  // Latest 6 violations
  const latestViolations = [...violations].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>{lang === 'ar' ? 'الامتثال التنظيمي للمجموعة' : 'Corporate HRSD Compliance'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {lang === 'ar' ? 'لوحة قيادة ساعد للامتثال والمخالفات' : 'SAED Compliance & Violations Dashboard'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              {lang === 'ar'
                ? 'متابعة شاملة لمخالفات منصة قوى، مفتشي العمل، اللوائح الاعتراضية، ومواعيد السداد لكافة شركات المجموعة.'
                : 'Comprehensive tracking of HRSD violations, Qiwa labor audits, objection timelines, and financial settlements.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewViolation}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تسجيل مخالفة جديدة' : 'New Violation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Total Violations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'إجمالي المخالفات' : 'Total'}
            </span>
            <AlertTriangle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalViolations}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Building className="w-3 h-3" />
            <span>{companies.length} {lang === 'ar' ? 'شركة مسجلة' : 'companies'}</span>
          </div>
        </div>

        {/* Open Violations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'مخالفات مفتوحة' : 'Open'}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{openViolations}</div>
          <div className="text-[11px] text-amber-700 mt-1">
            {lang === 'ar' ? 'تحت الإجراء والاعتراض' : 'In review / objection'}
          </div>
        </div>

        {/* Critical Violations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'مخالفات حرجة' : 'Critical'}
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">{criticalViolations}</div>
          <div className="text-[11px] text-rose-600 mt-1">
            {lang === 'ar' ? 'تتطلب تدخلاً فورياً' : 'Urgent action required'}
          </div>
        </div>

        {/* Overdue Deadlines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'مواعيد متأخرة' : 'Overdue'}
            </span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">{overdueViolations}</div>
          <div className="text-[11px] text-red-600 mt-1">
            {lang === 'ar' ? 'تجاوزت المهلة النظامية' : 'Past legal deadline'}
          </div>
        </div>

        {/* Total Fines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'إجمالي الغرامات' : 'Total Fines'}
            </span>
            <Coins className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {formatCurrency(totalFines, lang)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'ar' ? 'جميع المطالبات المسجلة' : 'All recorded fines'}
          </div>
        </div>

        {/* Paid Fines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'غرامات مسددة' : 'Paid Fines'}
            </span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-600 truncate">
            {formatCurrency(paidFines, lang)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            {totalFines > 0
              ? `${Math.round((paidFines / totalFines) * 100)}% ${lang === 'ar' ? 'نسبة السداد' : 'settled'}`
              : '0%'}
          </div>
        </div>

        {/* Unpaid Fines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">
              {lang === 'ar' ? 'غرامات غير مسددة' : 'Unpaid Fines'}
            </span>
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-lg font-bold text-orange-600 truncate">
            {formatCurrency(unpaidFines, lang)}
          </div>
          <div className="text-[11px] text-orange-700 mt-1">
            {lang === 'ar' ? 'التزامات مالية قائمة' : 'Pending liabilities'}
          </div>
        </div>
      </div>

      {/* Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'ar' ? 'توزيع المخالفات حسب الحالة' : 'Violations by Status'}
            </h2>
            <button
              onClick={onNavigateToViolations}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>{lang === 'ar' ? 'عرض السجل الكامل' : 'View All'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-270" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                'New',
                'Under Review',
                'Correction in Progress',
                'Objection Preparation',
                'Objection Submitted',
                'Payment Pending',
                'Paid',
                'Closed',
              ] as ViolationStatus[]
            ).map((st) => {
              const meta = VIOLATION_STATUS_TRANSLATIONS[st];
              const count = statusCounts[st] || 0;
              const percent = totalViolations > 0 ? Math.round((count / totalViolations) * 100) : 0;
              return (
                <div
                  key={st}
                  className={`p-3 rounded-xl border ${meta.bg} transition-all`}
                >
                  <div className="text-xs font-semibold text-slate-600 truncate">
                    {lang === 'ar' ? meta.ar : st}
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className={`text-xl font-bold ${meta.color}`}>{count}</span>
                    <span className="text-[11px] font-medium text-slate-500">{percent}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Level Matrix */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            {lang === 'ar' ? 'مستويات المخاطر التنظيمية' : 'Regulatory Risk Levels'}
          </h2>

          <div className="space-y-3">
            {(['Critical', 'High', 'Medium', 'Low'] as const).map((lvl) => {
              const cfg = RISK_LEVEL_CONFIG[lvl];
              const count = riskCounts[lvl] || 0;
              const pct = totalViolations > 0 ? Math.round((count / totalViolations) * 100) : 0;
              return (
                <div key={lvl} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-bold text-slate-800">
                        {lang === 'ar' ? cfg.ar : lvl}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      {count}{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${cfg.dot}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Latest Violations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'ar' ? 'أحدث المخالفات المسجلة' : 'Latest Violations'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar'
                ? 'آخر السجلات المحولة للدراسة والاعتراض والسداد'
                : 'Most recent infractions needing review, objection, or payment'}
            </p>
          </div>

          <button
            onClick={onNavigateToViolations}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 self-start sm:self-center"
          >
            <span>{lang === 'ar' ? 'عرض كافة المخالفات' : 'View All Violations'}</span>
            <ArrowUpRight className="w-4 h-4 rtl:rotate-270" />
          </button>
        </div>

        {latestViolations.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">
              {lang === 'ar' ? 'لا توجد مخالفات مسجلة حالياً' : 'No violations recorded yet'}
            </p>
            <button
              onClick={onOpenNewViolation}
              className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              {lang === 'ar' ? 'إضافة أول مخالفة' : 'Add First Violation'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'رقم المخالفة' : 'Code'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الشركة' : 'Company'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الغرامة (ر.س)' : 'Fine (SAR)'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'المهلة' : 'Deadline'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الخطورة' : 'Risk'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestViolations.map((v) => {
                  const statusMeta = VIOLATION_STATUS_TRANSLATIONS[v.status] || {
                    ar: v.status,
                    color: 'text-slate-700',
                    bg: 'bg-slate-50 border-slate-200',
                  };
                  const riskCfg = RISK_LEVEL_CONFIG[v.riskLevel] || {
                    ar: v.riskLevel,
                    color: 'text-slate-700',
                    bg: 'bg-slate-50 border-slate-200',
                    dot: 'bg-slate-400',
                  };
                  const deadlinePassed = v.deadline && isOverdue(v.deadline) && v.status !== 'Closed';

                  return (
                    <tr
                      key={v.id}
                      onClick={() => onSelectViolation(v)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {v.violationCode || v.id?.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {v.companyName || lang === 'ar' ? 'غير محدد' : 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={v.category}>
                        {v.category}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(v.fineAmount, lang)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={
                            deadlinePassed
                              ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded'
                              : 'text-slate-600'
                          }
                        >
                          {v.deadline || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${riskCfg.bg} ${riskCfg.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${riskCfg.dot}`} />
                          {lang === 'ar' ? riskCfg.ar : v.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.bg} ${statusMeta.color}`}
                        >
                          {lang === 'ar' ? statusMeta.ar : v.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectViolation(v);
                          }}
                          className="px-2.5 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-medium"
                        >
                          {lang === 'ar' ? 'التفاصيل' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
