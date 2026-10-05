export type UserRole = 'Admin' | 'Legal Consultant' | 'Compliance Officer' | 'Viewer';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ViolationStatus =
  | 'New'
  | 'Under Review'
  | 'Correction in Progress'
  | 'Objection Preparation'
  | 'Objection Submitted'
  | 'Payment Pending'
  | 'Paid'
  | 'Closed';

export interface Company {
  id?: string;
  name: string;
  commercialRegistrationNumber?: string;
  notes?: string;
  isOfficial?: boolean; // false for initial records, true for verified official corporate data
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Violation {
  id?: string;
  violationCode?: string; // e.g. VIO-2026-001
  companyId: string;
  companyName?: string;
  establishmentName?: string;
  branchName?: string;
  category: string;
  description: string;
  violationDate: string;
  notificationDate: string;
  decisionNumber?: string;
  fineAmount: number;
  riskLevel: RiskLevel;
  status: ViolationStatus;
  assignedTo?: string;
  assignedToName?: string;
  deadline?: string; // Legal objection or resolution deadline
  deadlineVerified?: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Task {
  id?: string;
  title: string;
  companyId?: string;
  violationId: string;
  violationCode?: string;
  assignedTo?: string;
  startDate?: string;
  dueDate: string;
  status: TaskStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id?: string;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  companyId?: string;
  companyName?: string;
  violationId?: string;
  violationCode?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  documentType: string;
  fileSize?: number;
}

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  recordId: string;
  collection: string;
  details: string;
  timestamp: string;
}

export const INITIAL_COMPANIES: Array<{ name: string; cr: string; notes: string }> = [
  { name: 'شركة ساعد العالمية للاستقدام', cr: '1010345671', notes: 'سجل مبدئي - شركة الاستقدام والتوظيف الدولي' },
  { name: 'شركة ساعد العالمية للخدمات', cr: '1010345672', notes: 'سجل مبدئي - قطاع الخدمات اللوجستية والتشغيلية' },
  { name: 'شركة ساعد أزكى المحدودة', cr: '1010345673', notes: 'سجل مبدئي - شركة خدمات متخصصة' },
  { name: 'شركة ساعد إسناد الخدمات المحدودة', cr: '1010345674', notes: 'سجل مبدئي - إسناد الموارد البشرية والتعاقد' },
  { name: 'شركة ساعد الرائدة للتوظيف', cr: '1010345675', notes: 'سجل مبدئي - خدمات استقطاب الكفاءات والتوظيف' },
  { name: 'شركة السرب الرقمي لتقنية المعلومات', cr: '1010345676', notes: 'سجل مبدئي - الذراع التقني والحلول الرقمية' },
  { name: 'شركة ساعد مواهب', cr: '1010345677', notes: 'سجل مبدئي - إدارة وتطوير المواهب والكفاءات' },
  { name: 'شركة ساعد مكين', cr: '1010345678', notes: 'سجل مبدئي - قطاع الخدمات المؤسسية' },
  { name: 'شركة ساعد موارد', cr: '1010345679', notes: 'سجل مبدئي - إدارة الموارد البشرية والتشغيل' },
  { name: 'شركة ساعد حلول', cr: '1010345680', notes: 'سجل مبدئي - تقديم الاستشارات والحلول المؤسسية' },
  { name: 'شركة ساعد تمكين', cr: '1010345681', notes: 'سجل مبدئي - حلول التدريب والتأهيل الوظيفي' },
  { name: 'آفاق ساعد', cr: '1010345682', notes: 'سجل مبدئي - الاستثمار وتطوير الأعمال' },
  { name: 'حلول الضيافة المتكاملة', cr: '1010345683', notes: 'سجل مبدئي - تشغيل وخدمات قطاع الضيافة' },
];

export const VIOLATION_CATEGORIES = [
  'توطين وسعودة (نسب التوطين والمهن المقصورة)',
  'حماية الأجور (نظام دفع الأجور وتأخير الرواتب)',
  'تفتيش العمل ومخالفات بيئة العمل',
  'السلامة والصحة المهنية (كود العمل والوقاية)',
  'منصة قوى (توثيق العقود ولوائح العمل)',
  'ساعات العمل وفترات الراحة والإجازات',
  'تشغيل العمالة بدون رخص عمل سارية',
  'تأنيث وتخصيص محلات المستلزمات النسائية',
  'عدم تمكين المفتشين أو الامتناع عن تقديم السجلات',
  'أخرى (مخالفات تنظيمية إدارية)',
];

export const VIOLATION_STATUS_TRANSLATIONS: Record<ViolationStatus, { ar: string; color: string; bg: string }> = {
  'New': { ar: 'جديدة', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'Under Review': { ar: 'قيد المراجعة', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  'Correction in Progress': { ar: 'جاري التصحيح', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  'Objection Preparation': { ar: 'إعداد اللائحة الاعتراضية', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  'Objection Submitted': { ar: 'تم تقديم الاعتراض', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  'Payment Pending': { ar: 'في انتظار السداد', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'Paid': { ar: 'مسددة', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  'Closed': { ar: 'مغلقة ومحسومة', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' },
};

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { ar: string; color: string; bg: string; dot: string }> = {
  'Low': { ar: 'منخفض', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Medium': { ar: 'متوسط', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'High': { ar: 'عالي', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  'Critical': { ar: 'حرج جداً', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-600' },
};

export const ROLE_TRANSLATIONS: Record<UserRole, { ar: string; desc: string }> = {
  'Admin': { ar: 'مدير النظام (Admin)', desc: 'صلاحيات كاملة لإدارة المستخدمين، النظام والبيانات' },
  'Legal Consultant': { ar: 'مستشار قانوني', desc: 'إدارة المخالفات، اللوائح الاعتراضية، والمستندات القانونية' },
  'Compliance Officer': { ar: 'مسؤول امتثال', desc: 'متابعة المخالفات المسندة، تحديث الحالات، والمهام التصحيحية' },
  'Viewer': { ar: 'مطلع / مراجع', desc: 'صلاحية قراءة واطلاع على السجلات والتقارير فقط' },
};
