import React, { useState } from 'react';
import { DocumentItem, Company, Violation } from '../../types';
import {
  FolderArchive,
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image,
  Search,
  Filter,
  Download,
  Trash2,
  Building,
  AlertTriangle,
  CheckCircle,
  File,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addDocumentItem, deleteDocumentItem } from '../../services/firestoreService';
import { formatDate } from '../../utils/formatters';

interface DocumentsViewProps {
  documents: DocumentItem[];
  companies: Company[];
  violations: Violation[];
  lang: 'ar' | 'en';
  initialViolationForUpload?: Violation | null;
  onClearInitialViolation?: () => void;
  onSelectViolation: (v: Violation) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  companies,
  violations,
  lang,
  initialViolationForUpload,
  onClearInitialViolation,
  onSelectViolation,
}) => {
  const { isComplianceOrAbove, isLegalOrAbove, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(!!initialViolationForUpload);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DocumentItem | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Form states
  const [targetCompanyId, setTargetCompanyId] = useState<string>(
    initialViolationForUpload?.companyId || companies[0]?.id || ''
  );
  const [targetViolationId, setTargetViolationId] = useState<string>(
    initialViolationForUpload?.id || ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const allowedExtensions = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png'];

  const getFileIcon = (type: string) => {
    const ext = type.toLowerCase();
    if (ext.includes('pdf')) return <FileText className="w-5 h-5 text-rose-600" />;
    if (ext.includes('xlsx') || ext.includes('xls') || ext.includes('sheet'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (ext.includes('docx') || ext.includes('doc'))
      return <FileText className="w-5 h-5 text-blue-600" />;
    if (ext.includes('png') || ext.includes('jpg') || ext.includes('jpeg'))
      return <Image className="w-5 h-5 text-purple-600" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const filteredDocs = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      doc.fileName.toLowerCase().includes(term) ||
      (doc.uploadedBy && doc.uploadedBy.toLowerCase().includes(term)) ||
      (doc.companyName && doc.companyName.toLowerCase().includes(term)) ||
      (doc.violationCode && doc.violationCode.toLowerCase().includes(term));
    if (!matchesSearch) return false;
    if (selectedCompanyId !== 'all' && doc.companyId !== selectedCompanyId) return false;
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.includes(ext)) {
        setUploadError(
          lang === 'ar'
            ? 'نوع الملف غير مدعوم. الصيغ المسموحة: PDF, DOCX, XLSX, JPG, PNG'
            : 'Unsupported file type. Supported: PDF, DOCX, XLSX, JPG, PNG'
        );
        return;
      }
      // Check 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(
          lang === 'ar' ? 'الحد الأقصى للملف هو 10 ميجابايت' : 'Maximum file size is 10MB'
        );
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError(lang === 'ar' ? 'الرجاء اختيار ملف' : 'Please select a file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown';
      const company = companies.find((c) => c.id === targetCompanyId);
      const violation = violations.find((v) => v.id === targetViolationId);

      // Read file as base64 dataUrl so it is always persistently downloadable even without public GCP bucket storage rules
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;

          await addDocumentItem({
            fileName: selectedFile.name,
            storagePath: `compliance_docs/${Date.now()}_${selectedFile.name}`,
            downloadUrl: base64Data, // In-memory/Firestore direct download URI
            companyId: targetCompanyId || undefined,
            companyName: company?.name,
            violationId: targetViolationId || undefined,
            violationCode: violation?.violationCode || violation?.id?.slice(0, 8),
            uploadedBy: currentUser?.displayName || currentUser?.email || 'مستشار النظام',
            uploadedAt: new Date().toISOString(),
            documentType: ext.toUpperCase(),
            fileSize: selectedFile.size,
          });

          setIsUploadModalOpen(false);
          setSelectedFile(null);
          onClearInitialViolation?.();
        } catch (err: any) {
          setUploadError(err.message || 'فشل حفظ بيانات المستند');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('فشل قراءة الملف');
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setUploadError(err.message || 'فشل رفع المستند');
      setUploading(false);
    }
  };

  const handleDelete = (docItem: DocumentItem) => {
    if (!docItem.id || !isLegalOrAbove) return;
    setDeleteCandidate(docItem);
  };

  const executeDeleteDocument = async () => {
    if (!deleteCandidate?.id) return;
    try {
      await deleteDocumentItem(deleteCandidate.id, deleteCandidate.fileName);
      showNotice(
        'success',
        lang === 'ar' ? `تم حذف المستند "${deleteCandidate.fileName}" بنجاح` : 'Document deleted successfully'
      );
    } catch (err: any) {
      showNotice('error', err.message || 'تعذر حذف المستند');
    } finally {
      setDeleteCandidate(null);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'المستندات والأرشيف القانوني' : 'Legal Documents & Archive'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'إرفاق وأرشفة إشعارات التفتيش، مذكرات الدفاع، محاضر الضبط، ووصولات السداد'
              : 'Archive ministry notices, defense briefs, audit citations, and payment receipts'}
          </p>
        </div>

        {isComplianceOrAbove && (
          <button
            onClick={() => {
              setTargetViolationId(initialViolationForUpload?.id || '');
              setTargetCompanyId(initialViolationForUpload?.companyId || companies[0]?.id || '');
              setSelectedFile(null);
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Upload className="w-4 h-4" />
            <span>{lang === 'ar' ? 'رفع مستند جديد' : 'Upload Document'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'البحث باسم الملف، الشركة، أو القائم بالرفع...'
                : 'Search document name, company, or uploader...'
            }
            className="w-full text-xs border border-slate-300 rounded-lg py-2.5 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
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
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'ar' ? 'لا توجد مستندات مرفقة' : 'No documents found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'ar'
                ? 'يمكنك رفع مذكرات الاعتراض وصور المخالفات بصيغ PDF, DOCX, XLSX, JPG, PNG'
                : 'You can upload legal attachments in PDF, DOCX, XLSX, JPG, PNG'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'اسم المستند' : 'Document Name'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الشركة المرتبطة' : 'Company'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'المخالفة المرتبطة' : 'Violation'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'تاريخ الرفع' : 'Upload Date'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'بواسطة' : 'Uploaded By'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((item) => {
                  const linkedViolation = violations.find((v) => v.id === item.violationId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(item.documentType)}
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-xs">
                              {item.fileName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.documentType} •{' '}
                              {item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.companyName || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {linkedViolation ? (
                          <button
                            onClick={() => onSelectViolation(linkedViolation)}
                            className="font-mono text-blue-600 hover:underline font-semibold"
                          >
                            {linkedViolation.violationCode || linkedViolation.id?.slice(0, 8)}
                          </button>
                        ) : item.violationCode ? (
                          <span className="font-mono text-slate-600">{item.violationCode}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {formatDate(item.uploadedAt, lang)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">{item.uploadedBy}</td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.downloadUrl && (
                            <a
                              href={item.downloadUrl}
                              download={item.fileName}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title={lang === 'ar' ? 'تنزيل' : 'Download'}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {isLegalOrAbove && (
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
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
      </div>

      {/* Modal: Upload Document */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-bold text-base">
                {lang === 'ar' ? 'إرفاق مستند نظامي' : 'Attach Legal Document'}
              </h2>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  onClearInitialViolation?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {uploadError}
                </div>
              )}

              {/* File Input */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="doc-file-upload"
                  accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="doc-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-8 h-8 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {selectedFile
                      ? selectedFile.name
                      : lang === 'ar'
                      ? 'اضغط لاختيار ملف من جهازك'
                      : 'Click to select file'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'ar'
                      ? 'الصيغ المدعومة: PDF, DOCX, XLSX, JPG, PNG (بحد أقصى 10MB)'
                      : 'Supported formats: PDF, DOCX, XLSX, JPG, PNG (Max 10MB)'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'الشركة المرتبطة' : 'Related Company'}
                </label>
                <select
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
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
                  {lang === 'ar' ? 'المخالفة المرتبطة (اختياري)' : 'Related Violation (Optional)'}
                </label>
                <select
                  value={targetViolationId}
                  onChange={(e) => setTargetViolationId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">
                    {lang === 'ar' ? 'بدون ربط بمخالفة محددة' : 'Not linked to specific violation'}
                  </option>
                  {violations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.violationCode || v.id?.slice(0, 8)} - {v.companyName} ({v.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    onClearInitialViolation?.();
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {uploading
                    ? lang === 'ar'
                      ? 'جاري الرفع...'
                      : 'Uploading...'
                    : lang === 'ar'
                    ? 'رفع وحفظ'
                    : 'Upload Document'}
                </button>
              </div>
            </form>
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
                  {lang === 'ar' ? 'تأكيد حذف المستند' : 'Confirm Document Deletion'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'إجراء نهائي لا يمكن التراجع عنه' : 'Irreversible action'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'ar'
                ? `هل أنت متأكد من حذف المستند "${deleteCandidate.fileName}"؟`
                : `Are you sure you want to permanently delete "${deleteCandidate.fileName}"?`}
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
                onClick={executeDeleteDocument}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، حذف المستند' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
