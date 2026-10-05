import React, { useState } from 'react';
import {
  Violation,
  Company,
  Task,
  DocumentItem,
  AuditLog,
  ViolationStatus,
  RiskLevel,
  VIOLATION_CATEGORIES,
  VIOLATION_STATUS_TRANSLATIONS,
  RISK_LEVEL_CONFIG,
} from '../../types';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Clock,
  Coins,
  Building,
  UserCheck,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  ListTodo,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  addViolation,
  updateViolation,
  updateViolationStatus,
  deleteViolation,
} from '../../services/firestoreService';
import { formatCurrency, isOverdue, daysRemaining, downloadCSV } from '../../utils/formatters';
import { filterAndDownloadViolationsCSV, downloadViolationsCSV } from '../../utils/csvExport';

interface ViolationsViewProps {
  violations: Violation[];
  companies: Company[];
  tasks: Task[];
  documents: DocumentItem[];
  auditLogs: AuditLog[];
  lang: 'ar' | 'en';
  selectedViolation: Violation | null;
  onSelectViolation: (violation: Violation | null) => void;
  onOpenNewTaskForViolation?: (violation: Violation) => void;
  onOpenUploadForViolation?: (violation: Violation) => void;
}

export const ViolationsView: React.FC<ViolationsViewProps> = ({
  violations,
  companies,
  tasks,
  documents,
  auditLogs,
  lang,
  selectedViolation,
  onSelectViolation,
  onOpenNewTaskForViolation,
  onOpenUploadForViolation,
}) => {
  const { isComplianceOrAbove, isLegalOrAbove, isAdmin, currentUser } = useAuth();

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Violation | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Form Fields
  const [formData, setFormData] = useState<{
    violationCode: string;
    companyId: string;
    establishmentName: string;
    branchName: string;
    category: string;
    description: string;
    violationDate: string;
    notificationDate: string;
    decisionNumber: string;
    fineAmount: number;
    riskLevel: RiskLevel;
    status: ViolationStatus;
    assignedTo: string;
    deadline: string;
    notes: string;
  }>({
    violationCode: '',
    companyId: '',
    establishmentName: '',
    branchName: '',
    category: VIOLATION_CATEGORIES[0],
    description: '',
    violationDate: new Date().toISOString().split('T')[0],
    notificationDate: new Date().toISOString().split('T')[0],
    decisionNumber: '',
    fineAmount: 10000,
    riskLevel: 'Medium',
    status: 'New',
    assignedTo: '',
    deadline: '',
    notes: '',
  });

  // Filter logic
  const filteredViolations = violations.filter((v) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (v.violationCode && v.violationCode.toLowerCase().includes(term)) ||
      (v.companyName && v.companyName.toLowerCase().includes(term)) ||
      (v.description && v.description.toLowerCase().includes(term)) ||
      (v.decisionNumber && v.decisionNumber.toLowerCase().includes(term)) ||
      (v.establishmentName && v.establishmentName.toLowerCase().includes(term)) ||
      (v.branchName && v.branchName.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (selectedCompanyId !== 'all' && v.companyId !== selectedCompanyId) return false;
    if (selectedStatus !== 'all' && v.status !== selectedStatus) return false;
    if (selectedRisk !== 'all' && v.riskLevel !== selectedRisk) return false;
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredViolations.length / itemsPerPage) || 1;
  const paginatedViolations = filteredViolations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenCreate = () => {
    setEditingViolation(null);
    const randomCode = `VIO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    // Default 30 days statutory objection period
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 30);

    setFormData({
      violationCode: randomCode,
      companyId: companies[0]?.id || '',
      establishmentName: 'المركز الرئيسي',
      branchName: 'الرياض',
      category: VIOLATION_CATEGORIES[0],
      description: '',
      violationDate: new Date().toISOString().split('T')[0],
      notificationDate: new Date().toISOString().split('T')[0],
      decisionNumber: '',
      fineAmount: 10000,
      riskLevel: 'Medium',
      status: 'New',
      assignedTo: currentUser?.displayName || 'المستشار القانوني',
      deadline: defaultDeadline.toISOString().split('T')[0],
      notes: '',
    });
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (v: Violation) => {
    setEditingViolation(v);
    setFormData({
      violationCode: v.violationCode || '',
      companyId: v.companyId || '',
      establishmentName: v.establishmentName || '',
      branchName: v.branchName || '',
      category: v.category || VIOLATION_CATEGORIES[0],
      description: v.description || '',
      violationDate: v.violationDate || '',
      notificationDate: v.notificationDate || '',
      decisionNumber: v.decisionNumber || '',
      fineAmount: Number(v.fineAmount) || 0,
      riskLevel: v.riskLevel || 'Medium',
      status: v.status || 'New',
      assignedTo: v.assignedTo || '',
      deadline: v.deadline || '',
      notes: v.notes || '',
    });
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const handleSaveViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const company = companies.find((c) => c.id === formData.companyId);
      const companyName = company ? company.name : 'شركة غير محددة';

      const payload = {
        ...formData,
        companyName,
        fineAmount: Number(formData.fineAmount) || 0,
        createdBy: currentUser?.uid || 'system',
      };

      if (editingViolation?.id) {
        await updateViolation(editingViolation.id, payload);
      } else {
        await addViolation(payload);
      }

      setIsAddEditOpen(false);
      if (selectedViolation && selectedViolation.id === editingViolation?.id) {
        onSelectViolation({
          ...selectedViolation,
          ...payload,
        });
      }
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ المخالفة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChangeQuick = async (
    v: Violation,
    newStatus: ViolationStatus,
    e?: React.ChangeEvent<HTMLSelectElement>
  ) => {
    e?.stopPropagation();
    if (!v.id || !isComplianceOrAbove) return;
    try {
      await updateViolationStatus(v.id, v.violationCode || v.id, newStatus);
      if (selectedViolation && selectedViolation.id === v.id) {
        onSelectViolation({
          ...selectedViolation,
          status: newStatus,
        });
      }
      showNotice(
        'success',
        lang === 'ar' ? `تم تغيير حالة المخالفة إلى: ${newStatus}` : `Status changed to ${newStatus}`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تغيير الحالة');
    }
  };

  const handleDelete = (v: Violation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!v.id || !isLegalOrAbove) return;
    setDeleteCandidate(v);
  };

  const executeDeleteViolation = async () => {
    if (!deleteCandidate?.id) return;
    try {
      await deleteViolation(deleteCandidate.id, deleteCandidate.violationCode || deleteCandidate.id);
      if (selectedViolation?.id === deleteCandidate.id) {
        onSelectViolation(null);
      }
      showNotice(
        'success',
        lang === 'ar'
          ? `تم حذف المخالفة ${deleteCandidate.violationCode || deleteCandidate.id} بنجاح`
          : 'Violation deleted successfully'
      );
    } catch (err: any) {
      showNotice('error', err.message || 'تعذر حذف السجل');
    } finally {
      setDeleteCandidate(null);
    }
  };

  // Associated tasks and documents for the selected violation
  const violationTasks = selectedViolation
    ? tasks.filter((t) => t.violationId === selectedViolation.id)
    : [];

  const violationDocs = selectedViolation
    ? documents.filter((d) => d.violationId === selectedViolation.id)
    : [];

  const violationLogs = selectedViolation
    ? auditLogs.filter((l) => l.recordId === selectedViolation.id)
    : [];

  // Download CSV utility handler: filters the current view's state and triggers a browser download
  const handleDownloadCSV = () => {
    filterAndDownloadViolationsCSV(
      violations,
      {
        searchTerm,
        companyId: selectedCompanyId,
        status: selectedStatus,
        riskLevel: selectedRisk,
        category: selectedCategory,
      },
      lang
    );
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'سجل المخالفات الرقابية' : 'HRSD Violations Log'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'إدارة مخالفات التفتيش، قوى، التأنيث، السلامة والصحة، وحماية الأجور'
              : 'Track and manage ministry infractions, defense objections, and settlements'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download CSV Button */}
          <button
            onClick={handleDownloadCSV}
            disabled={filteredViolations.length === 0}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            title={
              lang === 'ar'
                ? `تنزيل ${filteredViolations.length} مخالفة مفلترة كملف CSV`
                : `Download ${filteredViolations.length} filtered violations as CSV`
            }
          >
            <Download className="w-4 h-4" />
            <span>
              {lang === 'ar'
                ? 'تنزيل CSV (Download CSV)'
                : 'Download CSV'}
            </span>
          </button>

          {isComplianceOrAbove && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تسجيل مخالفة جديدة' : 'New Violation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                lang === 'ar'
                  ? 'بحث برقم المخالفة، القرار، الفرع، الوصف...'
                  : 'Search by ID, decision, branch, description...'
              }
              className="w-full text-xs border border-slate-300 rounded-lg py-2.5 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs border border-slate-300 rounded-lg py-2.5 px-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="all">{lang === 'ar' ? 'جميع الشركات' : 'All Companies'}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs border border-slate-300 rounded-lg py-2.5 px-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="all">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
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
              ).map((st) => (
                <option key={st} value={st}>
                  {lang === 'ar' ? VIOLATION_STATUS_TRANSLATIONS[st].ar : st}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs border border-slate-300 rounded-lg py-2.5 px-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="all">{lang === 'ar' ? 'جميع مستويات الخطورة' : 'All Risks'}</option>
              {(['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map((r) => (
                <option key={r} value={r}>
                  {lang === 'ar' ? RISK_LEVEL_CONFIG[r].ar : r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Count summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-3">
            <span>
              {lang === 'ar'
                ? `تم العثور على ${filteredViolations.length} مخالفة مطابقة`
                : `Found ${filteredViolations.length} matching violations`}
            </span>
            {filteredViolations.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                title={lang === 'ar' ? 'تنزيل النتائج المفلترة إلى ملف CSV' : 'Download filtered results to CSV'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تنزيل النتائج (Download CSV)' : 'Download CSV'}</span>
              </button>
            )}
          </div>

          {(searchTerm ||
            selectedCompanyId !== 'all' ||
            selectedStatus !== 'all' ||
            selectedRisk !== 'all' ||
            selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCompanyId('all');
                setSelectedStatus('all');
                setSelectedRisk('all');
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
            </button>
          )}
        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredViolations.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'ar' ? 'لا توجد مخالفات مسجلة' : 'No violations found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {lang === 'ar'
                ? 'جرّب تعديل الفلاتر أو اضغط على زر تسجيل مخالفة جديدة'
                : 'Try adjusting filters or record a new violation'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'رمز المخالفة' : 'Code'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الشركة والفرع' : 'Company & Branch'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الغرامة (ر.س)' : 'Fine (SAR)'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'المهلة النظامية' : 'Deadline'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الخطورة' : 'Risk'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedViolations.map((v) => {
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
                  const overdue = v.deadline && isOverdue(v.deadline) && v.status !== 'Closed';
                  const daysLeft = v.deadline ? daysRemaining(v.deadline) : null;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => onSelectViolation(v)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Code & Decision */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 block">
                          {v.violationCode || v.id?.slice(0, 8)}
                        </span>
                        {v.decisionNumber && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {lang === 'ar' ? 'قرار:' : 'Dec:'} {v.decisionNumber}
                          </span>
                        )}
                      </td>

                      {/* Company & Branch */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block max-w-xs truncate">
                          {v.companyName || lang === 'ar' ? 'غير محدد' : 'Unknown'}
                        </span>
                        {(v.establishmentName || v.branchName) && (
                          <span className="text-[10px] text-slate-500 block truncate">
                            {v.establishmentName} - {v.branchName}
                          </span>
                        )}
                      </td>

                      {/* Category & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-semibold text-slate-800 block truncate" title={v.category}>
                          {v.category}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate" title={v.description}>
                          {v.description || '—'}
                        </span>
                      </td>

                      {/* Fine Amount */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(v.fineAmount, lang)}
                      </td>

                      {/* Deadline & Warning */}
                      <td className="py-3.5 px-4 font-mono">
                        {v.deadline ? (
                          <div>
                            <span
                              className={`block font-semibold ${
                                overdue ? 'text-rose-600' : 'text-slate-700'
                              }`}
                            >
                              {v.deadline}
                            </span>
                            {v.status !== 'Closed' && daysLeft !== null && (
                              <span
                                className={`text-[10px] block ${
                                  overdue
                                    ? 'text-rose-600 font-bold'
                                    : daysLeft <= 7
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {overdue
                                  ? lang === 'ar'
                                    ? `متأخرة ${Math.abs(daysLeft)} يوم`
                                    : `${Math.abs(daysLeft)}d overdue`
                                  : lang === 'ar'
                                  ? `متبقي ${daysLeft} يوم`
                                  : `${daysLeft}d left`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Risk Level */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${riskCfg.bg} ${riskCfg.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${riskCfg.dot}`} />
                          <span>{lang === 'ar' ? riskCfg.ar : v.riskLevel}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isComplianceOrAbove ? (
                          <select
                            value={v.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleStatusChangeQuick(v, e.target.value as ViolationStatus, e)
                            }
                            className={`text-[11px] font-semibold rounded-lg px-2 py-1 border ${statusMeta.bg} ${statusMeta.color} focus:outline-none cursor-pointer`}
                          >
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
                            ).map((st) => (
                              <option key={st} value={st}>
                                {lang === 'ar' ? VIOLATION_STATUS_TRANSLATIONS[st].ar : st}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.bg} ${statusMeta.color}`}
                          >
                            {lang === 'ar' ? statusMeta.ar : v.status}
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onSelectViolation(v)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title={lang === 'ar' ? 'عرض التفاصيل' : 'View'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isComplianceOrAbove && (
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isLegalOrAbove && (
                            <button
                              onClick={(e) => handleDelete(v, e)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              {lang === 'ar'
                ? `صفحة ${currentPage} من ${totalPages}`
                : `Page ${currentPage} of ${totalPages}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Violation */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-bold text-base">
                {editingViolation
                  ? lang === 'ar'
                    ? 'تعديل بيانات المخالفة'
                    : 'Edit Violation'
                  : lang === 'ar'
                  ? 'تسجيل مخالفة رقابية جديدة'
                  : 'Record New Violation'}
              </h2>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveViolation} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'رمز المخالفة الداخلي *' : 'Violation Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.violationCode}
                    onChange={(e) => setFormData({ ...formData, violationCode: e.target.value })}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الشركة التابعة *' : 'Company *'}
                  </label>
                  <select
                    required
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">{lang === 'ar' ? 'اختر الشركة...' : 'Select company...'}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المنشأة' : 'Establishment Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.establishmentName}
                    onChange={(e) => setFormData({ ...formData, establishmentName: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: المركز الرئيسي' : 'e.g. Headquarters'}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الفرع أو الموقع' : 'Branch / Location'}
                  </label>
                  <input
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder={lang === 'ar' ? 'فرع الرياض - السليمانية' : 'Riyadh Branch'}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تصنيف المخالفة (وفق تصنيف الوزارة) *' : 'Violation Category *'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {VIOLATION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'وصف المخالفة والوقائع *' : 'Infraction Description *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={
                      lang === 'ar'
                        ? 'تفاصيل ما تم رصده في محضر الضبط أو إشعار منصة قوى...'
                        : 'Details of the inspector report or Qiwa notice...'
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ المخالفة' : 'Violation Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.violationDate}
                    onChange={(e) => setFormData({ ...formData, violationDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ الإشعار / التبليغ' : 'Notification Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.notificationDate}
                    onChange={(e) => setFormData({ ...formData, notificationDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'رقم القرار الوزاري / الإداري' : 'Decision Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.decisionNumber}
                    onChange={(e) => setFormData({ ...formData, decisionNumber: e.target.value })}
                    placeholder="HRSD-DEC-99882"
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'مبلغ الغرامة (ر.س) *' : 'Fine Amount (SAR) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.fineAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, fineAmount: Number(e.target.value) })
                    }
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'مستوى الخطورة *' : 'Risk Level *'}
                  </label>
                  <select
                    value={formData.riskLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, riskLevel: e.target.value as RiskLevel })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Low">منخفض (Low)</option>
                    <option value="Medium">متوسط (Medium)</option>
                    <option value="High">عالي (High)</option>
                    <option value="Critical">حرج جداً (Critical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حالة المخالفة *' : 'Status *'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ViolationStatus })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
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
                    ).map((st) => (
                      <option key={st} value={st}>
                        {lang === 'ar' ? VIOLATION_STATUS_TRANSLATIONS[st].ar : st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الموظف المسؤول / القانوني' : 'Assigned Employee'}
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم المستشار أو الباحث' : 'Legal Specialist'}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'المهلة النظامية (للاعتراض أو التصحيح)' : 'Applicable Deadline'}
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملاحظات وتوصيات قانونية' : 'Legal Notes & Recommendations'}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={
                    lang === 'ar'
                      ? 'ملاحظات الاعتراض، البنود النظامية المستند عليها...'
                      : 'Defense arguments or legal basis...'
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting
                    ? lang === 'ar'
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : lang === 'ar'
                    ? 'حفظ المخالفة'
                    : 'Save Violation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Full Violation Details */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    {selectedViolation.violationCode || selectedViolation.id?.slice(0, 8)}
                  </span>
                  <span className="text-xs text-slate-300">
                    {selectedViolation.companyName}
                  </span>
                </div>
                <h2 className="text-lg font-bold">{selectedViolation.category}</h2>
              </div>
              <button
                onClick={() => onSelectViolation(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Quick Status Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {lang === 'ar' ? 'حالة المخالفة الحالية:' : 'Current Status:'}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      VIOLATION_STATUS_TRANSLATIONS[selectedViolation.status]?.bg
                    } ${VIOLATION_STATUS_TRANSLATIONS[selectedViolation.status]?.color}`}
                  >
                    {lang === 'ar'
                      ? VIOLATION_STATUS_TRANSLATIONS[selectedViolation.status]?.ar
                      : selectedViolation.status}
                  </span>
                </div>

                {isComplianceOrAbove && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      {lang === 'ar' ? 'تغيير الحالة إلى:' : 'Move to:'}
                    </span>
                    <select
                      value={selectedViolation.status}
                      onChange={(e) =>
                        handleStatusChangeQuick(
                          selectedViolation,
                          e.target.value as ViolationStatus
                        )
                      }
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
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
                      ).map((st) => (
                        <option key={st} value={st}>
                          {lang === 'ar' ? VIOLATION_STATUS_TRANSLATIONS[st].ar : st}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Grid of Key Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block mb-0.5">
                    {lang === 'ar' ? 'الغرامة المالية' : 'Fine Amount'}
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCurrency(selectedViolation.fineAmount, lang)}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block mb-0.5">
                    {lang === 'ar' ? 'المهلة النظامية' : 'Legal Deadline'}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      isOverdue(selectedViolation.deadline) ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {selectedViolation.deadline || '—'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block mb-0.5">
                    {lang === 'ar' ? 'مستوى الخطورة' : 'Risk Severity'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {lang === 'ar'
                      ? RISK_LEVEL_CONFIG[selectedViolation.riskLevel]?.ar
                      : selectedViolation.riskLevel}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block mb-0.5">
                    {lang === 'ar' ? 'الموظف المسؤول' : 'Assigned Specialist'}
                  </span>
                  <span className="font-bold text-slate-800 truncate block">
                    {selectedViolation.assignedTo || '—'}
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    {lang === 'ar' ? 'وقائع المخالفة والتفاصيل:' : 'Infraction Details:'}
                  </span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedViolation.description || (lang === 'ar' ? 'لا يوجد وصف مدخل' : 'No description provided')}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'المنشأة:' : 'Est.:'}</span>
                    <span className="font-semibold">{selectedViolation.establishmentName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'الفرع:' : 'Branch:'}</span>
                    <span className="font-semibold">{selectedViolation.branchName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'تاريخ المخالفة:' : 'Date:'}</span>
                    <span className="font-mono">{selectedViolation.violationDate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'تاريخ التبليغ:' : 'Notified:'}</span>
                    <span className="font-mono">{selectedViolation.notificationDate || '—'}</span>
                  </div>
                </div>

                {selectedViolation.notes && (
                  <div className="pt-2">
                    <span className="font-bold text-slate-700 block mb-1">
                      {lang === 'ar' ? 'ملاحظات وتوصيات قانونية:' : 'Legal Notes:'}
                    </span>
                    <p className="text-slate-600 text-xs bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                      {selectedViolation.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Related Tasks Section */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-xs text-slate-900">
                      {lang === 'ar' ? 'المهام التصحيحية المرتبطة' : 'Linked Corrective Tasks'} ({violationTasks.length})
                    </h3>
                  </div>
                  {isComplianceOrAbove && onOpenNewTaskForViolation && (
                    <button
                      onClick={() => onOpenNewTaskForViolation(selectedViolation)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة مهمة' : 'Add Task'}</span>
                    </button>
                  )}
                </div>

                {violationTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {lang === 'ar' ? 'لا توجد مهام مسندة لهذه المخالفة' : 'No tasks assigned yet'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {violationTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              t.status === 'Completed' ? 'text-emerald-500' : 'text-slate-400'
                            }`}
                          />
                          <span className="font-semibold text-slate-800">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-500">
                            {lang === 'ar' ? 'استحقاق:' : 'Due:'} {t.dueDate}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Documents Section */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-xs text-slate-900">
                      {lang === 'ar' ? 'المستندات واللوائح المرفقة' : 'Linked Documents'} ({violationDocs.length})
                    </h3>
                  </div>
                  {isComplianceOrAbove && onOpenUploadForViolation && (
                    <button
                      onClick={() => onOpenUploadForViolation(selectedViolation)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'رفع مستند' : 'Upload Doc'}</span>
                    </button>
                  )}
                </div>

                {violationDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {lang === 'ar' ? 'لا توجد مستندات مرفقة حالياً' : 'No documents attached'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {violationDocs.map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-slate-800 truncate">{d.fileName}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {d.documentType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-slate-500">{d.uploadedBy}</span>
                          {d.downloadUrl && (
                            <a
                              href={d.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-bold"
                            >
                              {lang === 'ar' ? 'تحميل' : 'Download'}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {isLegalOrAbove && (
                <button
                  onClick={() => handleDelete(selectedViolation)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'حذف المخالفة' : 'Delete'}</span>
                </button>
              )}

              <div className="flex items-center gap-2 ms-auto">
                {isComplianceOrAbove && (
                  <button
                    onClick={() => {
                      const v = selectedViolation;
                      onSelectViolation(null);
                      handleOpenEdit(v);
                    }}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold"
                  >
                    {lang === 'ar' ? 'تعديل البيانات' : 'Edit'}
                  </button>
                )}
                <button
                  onClick={() => onSelectViolation(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'تأكيد حذف المخالفة' : 'Confirm Violation Deletion'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'إجراء نهائي لا يمكن التراجع عنه' : 'Irreversible action'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'ar'
                ? `هل أنت متأكد من حذف المخالفة رقم "${deleteCandidate.violationCode || deleteCandidate.id}"؟ سيتم حذف السجل نهائياً من قاعدة البيانات.`
                : `Are you sure you want to permanently delete violation "${deleteCandidate.violationCode || deleteCandidate.id}"?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeDeleteViolation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، حذف المخالفة' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
