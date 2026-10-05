import { Violation, RISK_LEVEL_CONFIG, VIOLATION_STATUS_TRANSLATIONS } from '../types';
import { downloadCSV } from './formatters';

export interface ViolationFilterCriteria {
  searchTerm?: string;
  companyId?: string;
  status?: string;
  riskLevel?: string;
  category?: string;
}

/**
 * Filter violations list based on the current view's search and filter criteria
 */
export function filterViolationsByCriteria(
  violations: Violation[],
  criteria: ViolationFilterCriteria
): Violation[] {
  return violations.filter((v) => {
    if (criteria.searchTerm && criteria.searchTerm.trim() !== '') {
      const term = criteria.searchTerm.trim().toLowerCase();
      const matchesSearch =
        (v.violationCode && v.violationCode.toLowerCase().includes(term)) ||
        (v.companyName && v.companyName.toLowerCase().includes(term)) ||
        (v.description && v.description.toLowerCase().includes(term)) ||
        (v.decisionNumber && v.decisionNumber.toLowerCase().includes(term)) ||
        (v.establishmentName && v.establishmentName.toLowerCase().includes(term)) ||
        (v.branchName && v.branchName.toLowerCase().includes(term)) ||
        (v.assignedTo && v.assignedTo.toLowerCase().includes(term));

      if (!matchesSearch) return false;
    }

    if (criteria.companyId && criteria.companyId !== 'all' && v.companyId !== criteria.companyId) {
      return false;
    }

    if (criteria.status && criteria.status !== 'all' && v.status !== criteria.status) {
      return false;
    }

    if (criteria.riskLevel && criteria.riskLevel !== 'all' && v.riskLevel !== criteria.riskLevel) {
      return false;
    }

    if (criteria.category && criteria.category !== 'all' && v.category !== criteria.category) {
      return false;
    }

    return true;
  });
}

/**
 * Converts a violations array to CSV format and triggers a browser download
 * including key fields like violation ID, company, fine amount, and status
 */
export function downloadViolationsCSV(
  violations: Violation[],
  lang: 'ar' | 'en' = 'ar',
  fileName?: string
): boolean {
  if (!violations || violations.length === 0) {
    return false;
  }

  const headers =
    lang === 'ar'
      ? [
          'رمز المخالفة (Violation ID)',
          'اسم الشركة (Company)',
          'المنشأة (Establishment)',
          'الفرع (Branch)',
          'تصنيف المخالفة (Category)',
          'الوصف والوقائع (Description)',
          'مبلغ الغرامة بالريال (Fine Amount SAR)',
          'الحالة النظامية (Status)',
          'مستوى الخطورة (Risk Level)',
          'تاريخ المخالفة (Violation Date)',
          'تاريخ التبليغ والإشعار (Notification Date)',
          'رقم القرار الوزاري / الإداري (Decision No)',
          'الموظف المسؤول (Assigned To)',
          'المهلة النظامية (Legal Deadline)',
          'ملاحظات وتوصيات (Notes)',
        ]
      : [
          'Violation ID',
          'Company Name',
          'Establishment',
          'Branch',
          'Category',
          'Description',
          'Fine Amount (SAR)',
          'Status',
          'Risk Level',
          'Violation Date',
          'Notification Date',
          'Decision Number',
          'Assigned Employee',
          'Legal Deadline',
          'Notes',
        ];

  const rows = violations.map((v) => [
    v.violationCode || v.id || '',
    v.companyName || '',
    v.establishmentName || '',
    v.branchName || '',
    v.category || '',
    v.description || '',
    String(v.fineAmount ?? 0),
    lang === 'ar' ? (VIOLATION_STATUS_TRANSLATIONS[v.status]?.ar || v.status) : v.status,
    lang === 'ar' ? (RISK_LEVEL_CONFIG[v.riskLevel]?.ar || v.riskLevel) : v.riskLevel,
    v.violationDate || '',
    v.notificationDate || '',
    v.decisionNumber || '',
    v.assignedTo || '',
    v.deadline || '',
    v.notes || '',
  ]);

  const timestamp = new Date().toISOString().split('T')[0];
  const targetFilename = fileName || `SAED_COMPLY_Violations_${timestamp}`;

  downloadCSV(targetFilename, [headers, ...rows]);
  return true;
}

/**
 * Utility function to filter the current view's state and trigger a browser download
 * of the data as a CSV file.
 */
export function filterAndDownloadViolationsCSV(
  allViolations: Violation[],
  criteria: ViolationFilterCriteria,
  lang: 'ar' | 'en' = 'ar'
): { exportedCount: number; success: boolean } {
  const filtered = filterViolationsByCriteria(allViolations, criteria);
  if (filtered.length === 0) {
    return { exportedCount: 0, success: false };
  }
  const timestamp = new Date().toISOString().split('T')[0];
  const success = downloadViolationsCSV(
    filtered,
    lang,
    `SAED_COMPLY_Violations_Export_${timestamp}`
  );
  return { exportedCount: filtered.length, success };
}
