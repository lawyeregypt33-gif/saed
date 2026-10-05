import React, { useState } from 'react';
import { Company, Violation } from '../../types';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  addCompany,
  updateCompany,
  deleteCompany,
  verifyCompanyOfficial,
  seedInitialCompaniesIfEmpty,
} from '../../services/firestoreService';
import { formatCurrency } from '../../utils/formatters';

interface CompaniesViewProps {
  companies: Company[];
  violations: Violation[];
  lang: 'ar' | 'en';
  onSelectViolation: (violation: Violation) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  violations,
  lang,
  onSelectViolation,
}) => {
  const { isComplianceOrAbove, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'official' | 'initial'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Company | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    commercialRegistrationNumber: '',
    notes: '',
    isOfficial: false,
    active: true,
  });

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.commercialRegistrationNumber && c.commercialRegistrationNumber.includes(searchTerm));
    if (!matchesSearch) return false;
    if (filterType === 'official') return !!c.isOfficial;
    if (filterType === 'initial') return !c.isOfficial;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      commercialRegistrationNumber: '',
      notes: '',
      isOfficial: false,
      active: true,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      commercialRegistrationNumber: company.commercialRegistrationNumber || '',
      notes: company.notes || '',
      isOfficial: !!company.isOfficial,
      active: company.active,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError(lang === 'ar' ? 'اسم الشركة مطلوب' : 'Company name is required');
      return;
    }

    try {
      if (editingCompany?.id) {
        await updateCompany(editingCompany.id, formData);
      } else {
        await addCompany(formData);
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ بيانات الشركة');
    }
  };

  const handleToggleVerification = async (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!company.id || !isComplianceOrAbove) return;
    try {
      await verifyCompanyOfficial(company.id, company.name, !company.isOfficial);
      showNotice(
        'success',
        company.isOfficial
          ? (lang === 'ar' ? 'تم تحويل الشركة إلى سجل مبدئي' : 'Marked as initial record')
          : (lang === 'ar' ? 'تم توثيق السجل الرسمي للشركة بنجاح' : 'Official record verified')
      );
    } catch (err: any) {
      showNotice('error', err.message || 'حدث خطأ أثناء تعديل التوثيق');
    }
  };

  const handleDelete = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!company.id || !isAdmin) return;
    setDeleteCandidate(company);
  };

  const executeDeleteCompany = async () => {
    if (!deleteCandidate?.id) return;
    try {
      await deleteCompany(deleteCandidate.id, deleteCandidate.name);
      if (selectedCompany?.id === deleteCandidate.id) {
        setSelectedCompany(null);
      }
      showNotice(
        'success',
        lang === 'ar' ? `تم حذف شركة "${deleteCandidate.name}" بنجاح` : 'Company deleted successfully'
      );
    } catch (err: any) {
      showNotice('error', err.message || 'فشل حذف الشركة');
    } finally {
      setDeleteCandidate(null);
    }
  };

  const handleSeedCompanies = async () => {
    setSeeding(true);
    try {
      const added = await seedInitialCompaniesIfEmpty();
      if (added === 0) {
        showNotice(
          'error',
          lang === 'ar'
            ? 'قاعدة البيانات تحتوي بالفعل على شركات مسجلة.'
            : 'Companies already exist in the database.'
        );
      } else {
        showNotice(
          'success',
          lang === 'ar'
            ? `تم بنجاح تحميل ${added} شركة تابعة لمجموعة ساعد كسجلات مبدئية.`
            : `Loaded ${added} Saed Group companies as initial records.`
        );
      }
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تحميل الشركات المبدئية');
    } finally {
      setSeeding(false);
    }
  };

  // Associated violations for selected company
  const companyViolations = selectedCompany
    ? violations.filter((v) => v.companyId === selectedCompany.id)
    : [];

  const companyTotalFines = companyViolations.reduce(
    (sum, v) => sum + (Number(v.fineAmount) || 0),
    0
  );
  const companyPaidFines = companyViolations
    .filter((v) => v.status === 'Paid')
    .reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);

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

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'إدارة الشركات والمنشآت' : 'Companies & Establishments'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة الشركات التابعة لمجموعة ساعد والكيانات الخاضعة للامتثال الرقابي'
              : 'Manage group entities and track official vs initial compliance profiles'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {companies.length === 0 && (
            <button
              onClick={handleSeedCompanies}
              disabled={seeding}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>
                {seeding
                  ? lang === 'ar'
                    ? 'جاري التحميل...'
                    : 'Loading...'
                  : lang === 'ar'
                  ? 'تهيئة شركات ساعد الـ 13'
                  : 'Load 13 Saed Companies'}
              </span>
            </button>
          )}

          {isComplianceOrAbove && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة شركة جديدة' : 'Add Company'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'البحث باسم الشركة أو رقم السجل التجاري...'
                : 'Search by company name or CR number...'
            }
            className="w-full text-xs border border-slate-300 rounded-lg py-2.5 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'التصنيف:' : 'Filter:'}</span>
          </span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? `الكل (${companies.length})` : `All (${companies.length})`}
          </button>
          <button
            onClick={() => setFilterType('official')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterType === 'official'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar'
              ? `سجلات موثقة (${companies.filter((c) => c.isOfficial).length})`
              : `Official (${companies.filter((c) => c.isOfficial).length})`}
          </button>
          <button
            onClick={() => setFilterType('initial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterType === 'initial'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar'
              ? `سجلات مبدئية (${companies.filter((c) => !c.isOfficial).length})`
              : `Initial Records (${companies.filter((c) => !c.isOfficial).length})`}
          </button>
        </div>
      </div>

      {/* Distinction explanation banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          {lang === 'ar' ? (
            <>
              <strong>توضيح تصنيف السجلات:</strong> يتم تمييز الشركات المبدئية التي تم إدراجها
              لأول مرة بشارة <span className="text-amber-700 font-bold">[سجل مبدئي]</span>، بينما
              تحمل الشركات المكتملة والمحققة رسمياً شارة{' '}
              <span className="text-emerald-700 font-bold">[سجل رسمي موثق]</span>.
            </>
          ) : (
            'Companies are clearly tagged as Initial Record or Official Verified based on documentation completeness.'
          )}
        </p>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => {
          const compViolations = violations.filter((v) => v.companyId === company.id);
          const compFines = compViolations.reduce(
            (sum, v) => sum + (Number(v.fineAmount) || 0),
            0
          );
          const hasCritical = compViolations.some(
            (v) => v.riskLevel === 'Critical' && v.status !== 'Closed'
          );

          return (
            <div
              key={company.id}
              onClick={() => setSelectedCompany(company)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {company.isOfficial ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'ar' ? 'سجل رسمي موثق' : 'Official Verified'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>{lang === 'ar' ? 'سجل مبدئي' : 'Initial Record'}</span>
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      company.active
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {company.active
                      ? lang === 'ar'
                        ? 'نشطة'
                        : 'Active'
                      : lang === 'ar'
                      ? 'موقوفة'
                      : 'Inactive'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                  {company.name}
                </h3>

                {company.commercialRegistrationNumber && (
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {lang === 'ar' ? 'س.ت:' : 'CR:'} {company.commercialRegistrationNumber}
                  </p>
                )}

                {company.notes && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {company.notes}
                  </p>
                )}
              </div>

              {/* Stats Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">
                      {lang === 'ar' ? 'المخالفات' : 'Violations'}
                    </span>
                    <span
                      className={`font-bold ${
                        hasCritical ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {compViolations.length} {lang === 'ar' ? 'مخالفة' : 'total'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">
                      {lang === 'ar' ? 'الغرامات' : 'Fines'}
                    </span>
                    <span className="font-bold text-slate-800 truncate block">
                      {formatCurrency(compFines, lang)}
                    </span>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between mt-3 pt-2">
                  {isComplianceOrAbove && (
                    <button
                      onClick={(e) => handleToggleVerification(company, e)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                        company.isOfficial
                          ? 'text-amber-700 hover:bg-amber-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {company.isOfficial
                        ? lang === 'ar'
                          ? 'تحويل لمبدئي'
                          : 'Mark Initial'
                        : lang === 'ar'
                        ? 'توثيق السجل'
                        : 'Verify Record'}
                    </button>
                  )}

                  <div className="flex items-center gap-1 ms-auto">
                    {isComplianceOrAbove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(company);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title={lang === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDelete(company, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800">
            {lang === 'ar' ? 'لم يتم العثور على شركات' : 'No companies found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {lang === 'ar'
              ? 'يمكنك إضافة شركة جديدة أو الضغط على زر تهيئة شركات ساعد الـ 13'
              : 'You can create a new company or load the 13 Saed entities'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={handleSeedCompanies}
              disabled={seeding}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              {lang === 'ar' ? 'تهيئة شركات ساعد الـ 13' : 'Load 13 Saed Companies'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Company */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-bold text-base">
                {editingCompany
                  ? lang === 'ar'
                    ? 'تعديل بيانات الشركة'
                    : 'Edit Company'
                  : lang === 'ar'
                  ? 'إضافة شركة جديدة'
                  : 'Add New Company'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'اسم الشركة الرسمي *' : 'Company Legal Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: شركة ساعد العالمية للاستقدام'
                      : 'e.g. Saed International Co.'
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'رقم السجل التجاري (CR)' : 'Commercial Registration No.'}
                </label>
                <input
                  type="text"
                  value={formData.commercialRegistrationNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, commercialRegistrationNumber: e.target.value })
                  }
                  placeholder="1010XXXXXX"
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملاحظات الامتثال والنشاط' : 'Compliance Notes & Activity'}
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={
                    lang === 'ar'
                      ? 'الأنشطة، الفروع، أو جهات الاتصال المسؤولة...'
                      : 'Activities, branches, or contacts...'
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {lang === 'ar' ? 'توثيق السجل الرسمي' : 'Official Verified Record'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'ar'
                      ? 'تمييز الشركة كسجل رسمي موثق بدلاً من سجل مبدئي'
                      : 'Mark as official verified rather than initial'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isOfficial}
                  onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {lang === 'ar' ? 'الحالة التشغيلية (نشطة)' : 'Active Status'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'ar' ? 'هل المنشأة قائمة ونشطة؟' : 'Is entity active?'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ البيانات' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Company Details & Associated Violations */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedCompany.isOfficial ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {lang === 'ar' ? 'سجل رسمي موثق' : 'Official'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {lang === 'ar' ? 'سجل مبدئي' : 'Initial'}
                    </span>
                  )}
                  {selectedCompany.commercialRegistrationNumber && (
                    <span className="font-mono text-xs text-blue-200">
                      CR: {selectedCompany.commercialRegistrationNumber}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold">{selectedCompany.name}</h2>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Financial & Compliance Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">
                    {lang === 'ar' ? 'المخالفات المسجلة' : 'Recorded Violations'}
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    {companyViolations.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">
                    {lang === 'ar' ? 'إجمالي الغرامات' : 'Total Fines'}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 truncate block">
                    {formatCurrency(companyTotalFines, lang)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">
                    {lang === 'ar' ? 'الغرامات المسددة' : 'Paid Fines'}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-emerald-600 truncate block">
                    {formatCurrency(companyPaidFines, lang)}
                  </span>
                </div>
              </div>

              {selectedCompany.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'ar' ? 'ملاحظات الشركة:' : 'Company Notes:'}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedCompany.notes}
                  </p>
                </div>
              )}

              {/* Associated Violations List */}
              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
                  <span>{lang === 'ar' ? 'المخالفات المرتبطة بهذه الشركة' : 'Associated Violations'}</span>
                  <span className="text-xs text-slate-500 font-normal">
                    {companyViolations.length} {lang === 'ar' ? 'مخالفة' : 'records'}
                  </span>
                </h3>

                {companyViolations.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <span>
                      {lang === 'ar'
                        ? 'سجل نظيف! لا توجد مخالفات مسجلة لهذه الشركة حالياً.'
                        : 'Clean record! No violations registered for this company.'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {companyViolations.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedCompany(null);
                          onSelectViolation(v);
                        }}
                        className="p-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">
                              {v.violationCode || v.id?.slice(0, 8)}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {v.category}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                            {v.description}
                          </p>
                        </div>

                        <div className="text-left rtl:text-left ltr:text-right shrink-0">
                          <span className="font-bold text-slate-900 block">
                            {formatCurrency(v.fineAmount, lang)}
                          </span>
                          <span className="text-[10px] font-semibold text-blue-600">
                            {v.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
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
                  {lang === 'ar' ? 'تأكيد حذف الشركة' : 'Confirm Company Deletion'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'إجراء نهائي لا يمكن التراجع عنه' : 'Irreversible action'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'ar'
                ? `هل أنت متأكد من حذف شركة "${deleteCandidate.name}"؟ سيتم حذف السجل وكافة البيانات التابعة لها بشكل نهائي.`
                : `Are you sure you want to permanently delete "${deleteCandidate.name}"?`}
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
                onClick={executeDeleteCompany}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، حذف نهائي' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
