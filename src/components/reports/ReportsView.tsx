import React, { useState, useMemo } from 'react';
import {
  Violation,
  Company,
  Task,
  VIOLATION_STATUS_TRANSLATIONS,
  RISK_LEVEL_CONFIG,
  ViolationStatus,
} from '../../types';
import {
  BarChart3,
  Download,
  Building,
  AlertTriangle,
  Coins,
  Clock,
  PieChart,
  FileSpreadsheet,
  TrendingUp,
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  FileText,
  Printer,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency, downloadCSV, isOverdue } from '../../utils/formatters';
import { generateComplianceSummaryPDF } from '../../utils/pdfExport';

interface ReportsViewProps {
  violations: Violation[];
  companies: Company[];
  tasks: Task[];
  lang: 'ar' | 'en';
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  violations,
  companies,
  tasks,
  lang,
}) => {
  // Trend Visualization Filters & Display Mode
  const [trendCompanyFilter, setTrendCompanyFilter] = useState<string>('all');
  const [trendChartType, setTrendChartType] = useState<'area' | 'risk' | 'fines'>('area');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Filtered violations for monthly trend
  const trendViolations = useMemo(() => {
    if (trendCompanyFilter === 'all') return violations;
    return violations.filter((v) => v.companyId === trendCompanyFilter);
  }, [violations, trendCompanyFilter]);

  // Calculate 12 monthly periods over the last year
  const monthlyTrendData = useMemo(() => {
    const monthNamesAr = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    const monthNamesEn = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const now = new Date();
    const result = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const shortYear = String(year).slice(-2);

      const label =
        lang === 'ar'
          ? `${monthNamesAr[monthIdx]} ${year}`
          : `${monthNamesEn[monthIdx]} '${shortYear}`;

      const shortLabel = lang === 'ar' ? monthNamesAr[monthIdx] : monthNamesEn[monthIdx];

      // Match violations whose violationDate, notificationDate, or createdAt begins with monthKey
      const inMonth = trendViolations.filter((v) => {
        const dateStr = v.violationDate || v.notificationDate || v.createdAt;
        return dateStr ? dateStr.startsWith(monthKey) : false;
      });

      const occurrences = inMonth.length;
      const fines = inMonth.reduce((acc, v) => acc + (Number(v.fineAmount) || 0), 0);
      const critical = inMonth.filter((v) => v.riskLevel === 'Critical').length;
      const high = inMonth.filter((v) => v.riskLevel === 'High').length;
      const medium = inMonth.filter((v) => v.riskLevel === 'Medium').length;
      const low = inMonth.filter((v) => v.riskLevel === 'Low').length;
      const paidCount = inMonth.filter((v) => v.status === 'Paid').length;
      const openCount = occurrences - paidCount;

      result.push({
        monthKey,
        label,
        shortLabel,
        occurrences,
        fines,
        critical,
        high,
        medium,
        low,
        paidCount,
        openCount,
      });
    }

    return result;
  }, [trendViolations, lang]);

  // Trend statistics summary
  const totalTrendOccurrences = useMemo(
    () => monthlyTrendData.reduce((acc, m) => acc + m.occurrences, 0),
    [monthlyTrendData]
  );

  const totalTrendFines = useMemo(
    () => monthlyTrendData.reduce((acc, m) => acc + m.fines, 0),
    [monthlyTrendData]
  );

  const peakMonth = useMemo(() => {
    let peak = monthlyTrendData[0];
    for (const m of monthlyTrendData) {
      if (m.occurrences > (peak?.occurrences || 0)) {
        peak = m;
      }
    }
    return peak;
  }, [monthlyTrendData]);

  const monthlyAverage = useMemo(
    () => (totalTrendOccurrences / 12).toFixed(1),
    [totalTrendOccurrences]
  );

  // CSV Export for Monthly Trend
  const exportMonthlyTrendCSV = () => {
    const headers =
      lang === 'ar'
        ? [
            'الشهر',
            'المفتاح الزمني',
            'عدد المخالفات',
            'إجمالي الغرامات (ر.س)',
            'مخالفات حرجة',
            'مخالفات عالية',
            'مخالفات متوسطة',
            'مخالفات منخفضة',
            'المسددة',
            'المعلقة',
          ]
        : [
            'Month',
            'Period Key',
            'Occurrences',
            'Fine Amount (SAR)',
            'Critical',
            'High',
            'Medium',
            'Low',
            'Paid',
            'Pending',
          ];

    const rows = monthlyTrendData.map((m) => [
      m.label,
      m.monthKey,
      String(m.occurrences),
      String(m.fines),
      String(m.critical),
      String(m.high),
      String(m.medium),
      String(m.low),
      String(m.paidCount),
      String(m.openCount),
    ]);

    downloadCSV(`SAED_COMPLY_Monthly_Trend_${new Date().toISOString().split('T')[0]}`, [
      headers,
      ...rows,
    ]);
  };
  // Aggregate stats
  const totalFines = violations.reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
  const paidFines = violations
    .filter((v) => v.status === 'Paid')
    .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
  const unpaidFines = totalFines - paidFines;
  const settlementRate = totalFines > 0 ? Math.round((paidFines / totalFines) * 100) : 0;

  // Violations by company
  const companyReport = companies.map((c) => {
    const compViolations = violations.filter((v) => v.companyId === c.id);
    const fines = compViolations.reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
    const paid = compViolations
      .filter((v) => v.status === 'Paid')
      .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
    const openCount = compViolations.filter(
      (v) => v.status !== 'Paid' && v.status !== 'Closed'
    ).length;
    return {
      company: c,
      count: compViolations.length,
      openCount,
      fines,
      paid,
      unpaid: fines - paid,
    };
  });

  // Violations by status
  const statusStats: Record<string, number> = {};
  violations.forEach((v) => {
    statusStats[v.status] = (statusStats[v.status] || 0) + 1;
  });

  // Violations by risk
  const riskStats: Record<string, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };
  violations.forEach((v) => {
    if (riskStats[v.riskLevel] !== undefined) {
      riskStats[v.riskLevel]++;
    }
  });

  // Overdue tasks
  const overdueTasks = tasks.filter((t) => t.status !== 'Completed' && isOverdue(t.dueDate));

  // CSV Export: All Violations
  const exportAllViolationsCSV = () => {
    const headers = [
      'رمز المخالفة',
      'الشركة',
      'المنشأة',
      'الفرع',
      'التصنيف',
      'الوصف',
      'تاريخ المخالفة',
      'تاريخ التبليغ',
      'رقم القرار',
      'مبلغ الغرامة (ر.س)',
      'مستوى الخطورة',
      'الحالة',
      'الموظف المسؤول',
      'المهلة النظامية',
      'ملاحظات',
    ];

    const rows = violations.map((v) => [
      v.violationCode || v.id || '',
      v.companyName || '',
      v.establishmentName || '',
      v.branchName || '',
      v.category || '',
      v.description || '',
      v.violationDate || '',
      v.notificationDate || '',
      v.decisionNumber || '',
      String(v.fineAmount || 0),
      v.riskLevel || '',
      VIOLATION_STATUS_TRANSLATIONS[v.status]?.ar || v.status,
      v.assignedTo || '',
      v.deadline || '',
      v.notes || '',
    ]);

    downloadCSV('SAED_COMPLY_Violations_Report', [headers, ...rows]);
  };

  // CSV Export: Companies Summary
  const exportCompaniesReportCSV = () => {
    const headers = [
      'اسم الشركة',
      'السجل التجاري',
      'حالة السجل',
      'إجمالي المخالفات',
      'المخالفات المفتوحة',
      'إجمالي الغرامات (ر.س)',
      'الغرامات المسددة (ر.س)',
      'المبالغ المعلقة (ر.س)',
    ];

    const rows = companyReport.map((r) => [
      r.company.name,
      r.company.commercialRegistrationNumber || '',
      r.company.isOfficial ? 'رسمي موثق' : 'سجل مبدئي',
      String(r.count),
      String(r.openCount),
      String(r.fines),
      String(r.paid),
      String(r.unpaid),
    ]);

    downloadCSV('SAED_COMPLY_Companies_Financial_Report', [headers, ...rows]);
  };

  // CSV Export: Overdue Tasks
  const exportOverdueTasksCSV = () => {
    const headers = [
      'عنوان المهمة',
      'المخالفة المرتبطة',
      'الموظف المسؤول',
      'تاريخ الاستحقاق',
      'الحالة',
      'ملاحظات',
    ];

    const rows = overdueTasks.map((t) => [
      t.title,
      t.violationCode || t.violationId,
      t.assignedTo || '',
      t.dueDate,
      t.status,
      t.notes || '',
    ]);

    downloadCSV('SAED_COMPLY_Overdue_Tasks', [headers, ...rows]);
  };

  // PDF Export using jsPDF and jspdf-autotable
  const handleExportPDF = () => {
    setIsGeneratingPDF(true);
    try {
      const doc = generateComplianceSummaryPDF({
        violations,
        companies,
        tasks,
        monthlyTrendData,
        lang,
      });
      const fileName = `SAED_COMPLY_Executive_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showNotice(
        'success',
        lang === 'ar'
          ? 'تم بنجاح تصدير وتحميل تقرير ملخص الامتثال بصيغة PDF'
          : 'Compliance summary PDF exported and downloaded successfully'
      );
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showNotice(
        'error',
        lang === 'ar'
          ? `فشل في إنشاء وثيقة PDF: ${err.message || 'حدث خطأ غير متوقع'}`
          : `Failed to generate PDF: ${err.message || 'Unexpected error'}`
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice notification */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'التقارير التحليلية والإحصاءات' : 'Analytical Reports & Compliance Metrics'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'مؤشرات أداء الامتثال، المبالغ المحصلة والمطالبات، ومعدلات تسوية المخالفات'
              : 'Compliance KPIs, financial exposure, payment settlements, and overdue actions'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Executive PDF Report Button */}
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title={
              lang === 'ar'
                ? 'تحميل التقرير والملخص التنفيذي الشامل بصيغة PDF'
                : 'Download Executive Compliance Summary as PDF'
            }
          >
            <FileText className="w-4 h-4 text-rose-200" />
            <span>
              {isGeneratingPDF
                ? (lang === 'ar' ? 'جاري تجهيز PDF...' : 'Generating PDF...')
                : (lang === 'ar' ? 'تقرير الامتثال التنفيذي (PDF)' : 'Executive Summary (PDF)')}
            </span>
          </button>

          <button
            onClick={exportMonthlyTrendCSV}
            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير الاتجاه الشهري (CSV)' : 'Export Monthly Trend (CSV)'}</span>
          </button>

          <button
            onClick={exportAllViolationsCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير سجل المخالفات (CSV)' : 'Export Violations (CSV)'}</span>
          </button>

          <button
            onClick={exportCompaniesReportCSV}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تقرير الشركات المالي' : 'Company Report (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Financial Exposure KPI Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Coins className="w-4 h-4 text-blue-600" />
          <span>{lang === 'ar' ? 'الموقف المالي للغرامات والسداد' : 'Fines & Payment Status'}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">
              {lang === 'ar' ? 'إجمالي الغرامات المحتسبة' : 'Total Assessed Fines'}
            </span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(totalFines, lang)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs text-emerald-800 block mb-1">
              {lang === 'ar' ? 'الغرامات المسددة' : 'Settled / Paid Fines'}
            </span>
            <span className="text-xl font-bold text-emerald-700">
              {formatCurrency(paidFines, lang)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
            <span className="text-xs text-orange-800 block mb-1">
              {lang === 'ar' ? 'الغرامات غير المسددة' : 'Outstanding Liabilities'}
            </span>
            <span className="text-xl font-bold text-orange-700">
              {formatCurrency(unpaidFines, lang)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-xs text-blue-800 block mb-1">
              {lang === 'ar' ? 'نسبة الإنجاز والسداد' : 'Settlement Rate'}
            </span>
            <span className="text-xl font-bold text-blue-700">{settlementRate}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${settlementRate}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>{lang === 'ar' ? 'مسدد: ' : 'Paid: '} {formatCurrency(paidFines, lang)}</span>
            <span>{lang === 'ar' ? 'قيد المتابعة: ' : 'Pending: '} {formatCurrency(unpaidFines, lang)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Trend of Violation Occurrences Over the Last Year */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        {/* Header with Title, Company Filter, Chart Type Toggle and Export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'ar'
                  ? 'الاتجاه الشهري لتسجيل المخالفات خلال العام الأخير'
                  : 'Monthly Trend of Violation Occurrences (Past 12 Months)'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 rtl:mr-10 ltr:ml-10">
              {lang === 'ar'
                ? 'رصد ديناميكي لمعدل تسجيل المخالفات، مستوى الخطورة، وتطور الغرامات على مدار الـ 12 شهراً الماضية'
                : 'Dynamic tracking of monthly violation frequency, risk distribution, and fine trajectories'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Company Filter */}
            <select
              value={trendCompanyFilter}
              onChange={(e) => setTrendCompanyFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="all">{lang === 'ar' ? 'جميع الشركات والمنشآت' : 'All Companies'}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setTrendChartType('area')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  trendChartType === 'area'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'ar' ? 'المنحنى العام' : 'Area Trend'}
              </button>
              <button
                type="button"
                onClick={() => setTrendChartType('risk')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  trendChartType === 'risk'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'ar' ? 'حسب الخطورة' : 'By Risk'}
              </button>
              <button
                type="button"
                onClick={() => setTrendChartType('fines')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  trendChartType === 'fines'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'ar' ? 'المخالفات والغرامات' : 'Fines vs Counts'}
              </button>
            </div>

            {/* Export PDF summary button */}
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title={lang === 'ar' ? 'تصدير وثيقة الملخص التنفيذي PDF' : 'Export Executive Summary PDF'}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{lang === 'ar' ? 'ملخص PDF' : 'PDF Summary'}</span>
            </button>

            {/* Export CSV button for this trend */}
            <button
              onClick={exportMonthlyTrendCSV}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={lang === 'ar' ? 'تصدير بيانات الاتجاه الشهري إلى CSV' : 'Export monthly trend data to CSV'}
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === 'ar' ? 'تصدير التوجه' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* 4 Trend Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-semibold text-blue-800 block mb-0.5">
              {lang === 'ar' ? 'مخالفات العام الأخير' : 'Total 12-Month Violations'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-blue-900 font-mono">
                {totalTrendOccurrences}
              </span>
              <span className="text-[10px] text-blue-700 font-medium">
                {lang === 'ar' ? 'مخالفة مسجلة' : 'infractions'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-800 block mb-0.5">
              {lang === 'ar' ? 'شهر الذروة (الأعلى تسجيلاً)' : 'Peak Infraction Month'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-rose-900">
                {peakMonth?.label || '—'}
              </span>
              <span className="text-[10px] text-rose-700 font-mono font-bold">
                ({peakMonth?.occurrences || 0})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
            <span className="text-[11px] font-semibold text-purple-800 block mb-0.5">
              {lang === 'ar' ? 'المعدل الشهري للمخالفات' : 'Monthly Average'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-purple-900 font-mono">
                {monthlyAverage}
              </span>
              <span className="text-[10px] text-purple-700 font-medium">
                {lang === 'ar' ? 'مخالفة / شهر' : 'per month'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-800 block mb-0.5">
              {lang === 'ar' ? 'غرامات العام الأخير' : 'Total 12-Month Fines'}
            </span>
            <span className="text-sm font-bold text-emerald-900 font-mono block truncate">
              {formatCurrency(totalTrendFines, lang)}
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {trendChartType === 'area' ? (
              <AreaChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 min-w-[200px]">
                          <div className="font-bold text-slate-100 border-b border-slate-800 pb-1 flex justify-between items-center">
                            <span>{data.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{data.monthKey}</span>
                          </div>
                          <div className="flex justify-between items-center text-blue-400 font-semibold">
                            <span>{lang === 'ar' ? 'عدد المخالفات:' : 'Violations Count:'}</span>
                            <span className="font-bold font-mono text-sm">{data.occurrences}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400 font-semibold">
                            <span>{lang === 'ar' ? 'إجمالي الغرامات:' : 'Fine Amount:'}</span>
                            <span className="font-mono">{formatCurrency(data.fines, lang)}</span>
                          </div>
                          {data.occurrences > 0 && (
                            <div className="pt-1.5 border-t border-slate-800 text-[10px] grid grid-cols-2 gap-1 text-slate-300">
                              <span className="text-rose-400">{lang === 'ar' ? 'حرجة: ' : 'Critical: '}{data.critical}</span>
                              <span className="text-orange-400">{lang === 'ar' ? 'عالية: ' : 'High: '}{data.high}</span>
                              <span className="text-amber-400">{lang === 'ar' ? 'متوسطة: ' : 'Medium: '}{data.medium}</span>
                              <span className="text-slate-400">{lang === 'ar' ? 'منخفضة: ' : 'Low: '}{data.low}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="occurrences"
                  name={lang === 'ar' ? 'عدد المخالفات' : 'Violations'}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#1d4ed8' }}
                />
              </AreaChart>
            ) : trendChartType === 'risk' ? (
              <BarChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 min-w-[200px]">
                          <div className="font-bold text-slate-100 border-b border-slate-800 pb-1">
                            {data.label}
                          </div>
                          <div className="flex justify-between items-center text-rose-400">
                            <span>{lang === 'ar' ? 'حرجة (Critical):' : 'Critical:'}</span>
                            <span className="font-bold font-mono">{data.critical}</span>
                          </div>
                          <div className="flex justify-between items-center text-orange-400">
                            <span>{lang === 'ar' ? 'عالية (High):' : 'High:'}</span>
                            <span className="font-bold font-mono">{data.high}</span>
                          </div>
                          <div className="flex justify-between items-center text-amber-400">
                            <span>{lang === 'ar' ? 'متوسطة (Medium):' : 'Medium:'}</span>
                            <span className="font-bold font-mono">{data.medium}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>{lang === 'ar' ? 'منخفضة (Low):' : 'Low:'}</span>
                            <span className="font-bold font-mono">{data.low}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                <Bar
                  dataKey="critical"
                  name={lang === 'ar' ? 'حرجة' : 'Critical'}
                  fill="#e11d48"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="high"
                  name={lang === 'ar' ? 'عالية' : 'High'}
                  fill="#ea580c"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="medium"
                  name={lang === 'ar' ? 'متوسطة' : 'Medium'}
                  fill="#d97706"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="low"
                  name={lang === 'ar' ? 'منخفضة' : 'Low'}
                  fill="#64748b"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <ComposedChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  tick={{ fontSize: 10, fill: '#10b981' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 min-w-[200px]">
                          <div className="font-bold text-slate-100 border-b border-slate-800 pb-1">
                            {data.label}
                          </div>
                          <div className="flex justify-between items-center text-blue-400">
                            <span>{lang === 'ar' ? 'عدد المخالفات:' : 'Violations:'}</span>
                            <span className="font-bold font-mono">{data.occurrences}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>{lang === 'ar' ? 'مبلغ الغرامة:' : 'Fine Amount:'}</span>
                            <span className="font-bold font-mono">
                              {formatCurrency(data.fines, lang)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="occurrences"
                  name={lang === 'ar' ? 'عدد المخالفات' : 'Violations'}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="fines"
                  name={lang === 'ar' ? 'قيمة الغرامات (ر.س)' : 'Fines (SAR)'}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* 12-Month Mini Horizontal Pills Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-2 border-t border-slate-100">
          {monthlyTrendData.map((m) => (
            <div
              key={m.monthKey}
              className={`p-2 rounded-lg text-center transition-all ${
                m.occurrences > 0
                  ? 'bg-slate-50 border border-slate-200'
                  : 'bg-slate-50/40 border border-slate-100 text-slate-400'
              }`}
            >
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {m.shortLabel}
              </span>
              <span
                className={`text-xs font-bold block ${
                  m.occurrences > 0 ? 'text-blue-700 font-mono' : 'text-slate-400'
                }`}
              >
                {m.occurrences}
              </span>
              <span className="text-[9px] text-slate-400 block truncate font-mono">
                {m.fines > 0 ? `${Math.round(m.fines / 1000)}k` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Violations by Status & Violations by Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>{lang === 'ar' ? 'المخالفات حسب الحالة النظامية' : 'Violations by Status'}</span>
          </h2>

          <div className="space-y-2.5">
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
              const count = statusStats[st] || 0;
              const pct = violations.length > 0 ? Math.round((count / violations.length) * 100) : 0;
              return (
                <div key={st} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">
                      {lang === 'ar' ? meta.ar : st}
                    </span>
                    <span className="font-bold text-slate-900">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Level Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{lang === 'ar' ? 'المخالفات حسب درجة الخطورة' : 'Violations by Risk Level'}</span>
          </h2>

          <div className="space-y-3">
            {(['Critical', 'High', 'Medium', 'Low'] as const).map((r) => {
              const cfg = RISK_LEVEL_CONFIG[r];
              const count = riskStats[r] || 0;
              const pct = violations.length > 0 ? Math.round((count / violations.length) * 100) : 0;
              return (
                <div key={r} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-bold text-slate-800">
                        {lang === 'ar' ? cfg.ar : r}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overdue Tasks box */}
          <div className="mt-5 p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-900 block">
                  {lang === 'ar' ? 'المهام المتأخرة المستحقة' : 'Overdue Tasks Summary'}
                </span>
                <span className="text-[11px] text-rose-700">
                  {overdueTasks.length} {lang === 'ar' ? 'مهمة متأخرة عن موعدها' : 'tasks past due date'}
                </span>
              </div>
              {overdueTasks.length > 0 && (
                <button
                  onClick={exportOverdueTasksCSV}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                >
                  {lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table: Violations by Company */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'توزيع المخالفات والغرامات حسب الشركات' : 'Violations by Company'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar'
                ? 'إجمالي المخالفات والمطالبات المالية لكل كيان تابع'
                : 'Infraction count and financial liabilities per subsidiary'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title={lang === 'ar' ? 'تصدير ملخص الامتثال كملف PDF' : 'Export Compliance Summary as PDF'}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{lang === 'ar' ? 'ملخص PDF' : 'PDF Report'}</span>
            </button>
            <button
              onClick={exportCompaniesReportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'الشركة' : 'Company'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'نوع السجل' : 'Record Type'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'عدد المخالفات' : 'Violations'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'مفتوحة' : 'Open'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'إجمالي الغرامات' : 'Total Fines'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المسدد' : 'Paid'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'المتبقي' : 'Outstanding'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyReport.map((r) => (
                <tr key={r.company.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{r.company.name}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        r.company.isOfficial
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {r.company.isOfficial
                        ? lang === 'ar'
                          ? 'رسمي موثق'
                          : 'Official'
                        : lang === 'ar'
                        ? 'سجل مبدئي'
                        : 'Initial'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold">{r.count}</td>
                  <td className="py-3.5 px-4 text-amber-700 font-bold">{r.openCount}</td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    {formatCurrency(r.fines, lang)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">
                    {formatCurrency(r.paid, lang)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-orange-600 font-bold">
                    {formatCurrency(r.unpaid, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
