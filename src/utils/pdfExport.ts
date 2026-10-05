import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Violation,
  Company,
  Task,
  VIOLATION_STATUS_TRANSLATIONS,
  RISK_LEVEL_CONFIG,
} from '../types/index';

export interface MonthlyTrendItem {
  label: string;
  monthKey: string;
  shortLabel: string;
  occurrences: number;
  fines: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  paidCount: number;
  openCount: number;
}

export interface ComplianceSummaryPDFOptions {
  violations: Violation[];
  companies: Company[];
  tasks: Task[];
  monthlyTrendData?: MonthlyTrendItem[];
  lang?: 'ar' | 'en';
}

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' SAR';
}

/**
 * Generates an executive compliance summary PDF report using jsPDF and jspdf-autotable.
 */
export function generateComplianceSummaryPDF(options: ComplianceSummaryPDFOptions): jsPDF {
  const { violations, companies, tasks, monthlyTrendData = [], lang = 'ar' } = options;

  // Initialize jsPDF document (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 14;

  // Aggregate Key Figures
  const totalFines = violations.reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
  const paidFines = violations
    .filter((v) => v.status === 'Paid')
    .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
  const unpaidFines = totalFines - paidFines;
  const settlementRate = totalFines > 0 ? Math.round((paidFines / totalFines) * 100) : 0;
  const closedCount = violations.filter((v) => v.status === 'Closed' || v.status === 'Paid').length;
  const openCount = violations.length - closedCount;

  // Risk Counts
  const riskCounts = {
    Critical: violations.filter((v) => v.riskLevel === 'Critical').length,
    High: violations.filter((v) => v.riskLevel === 'High').length,
    Medium: violations.filter((v) => v.riskLevel === 'Medium').length,
    Low: violations.filter((v) => v.riskLevel === 'Low').length,
  };

  const riskFines = {
    Critical: violations
      .filter((v) => v.riskLevel === 'Critical')
      .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0),
    High: violations
      .filter((v) => v.riskLevel === 'High')
      .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0),
    Medium: violations
      .filter((v) => v.riskLevel === 'Medium')
      .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0),
    Low: violations
      .filter((v) => v.riskLevel === 'Low')
      .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0),
  };

  // Overdue Tasks
  const today = new Date().toISOString().split('T')[0];
  const overdueTasksList = tasks.filter(
    (t) => t.status !== 'Completed' && t.dueDate && t.dueDate < today
  );

  // Generation timestamp
  const now = new Date();
  const timestampStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const reportRef = `REF-SAED-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  // =========================================================================
  // 1. HEADER BANNER & BRANDING
  // =========================================================================
  doc.setFillColor(30, 58, 138); // Deep Navy (#1E3A8A)
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(234, 88, 12); // Orange Accent Bar (#EA580C)
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SAED COMPLY | EXECUTIVE COMPLIANCE REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Saudi HRSD Labor Regulations & Inspection Infractions Oversight System',
    margin,
    18
  );

  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Reference: ${reportRef}  |  Generated: ${timestampStr}`, margin, 24);

  // Badge on the right
  doc.setFillColor(239, 68, 68); // Red
  doc.roundedRect(pageWidth - margin - 35, 8, 35, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('STRICTLY CONFIDENTIAL', pageWidth - margin - 33, 12.2);

  currentY = 36;

  // =========================================================================
  // 2. EXECUTIVE SUMMARY & KEY FINANCIAL PERFORMANCE (KPIs)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('1. EXECUTIVE FINANCIAL & CASE EXPOSURE SUMMARY', margin, currentY);
  currentY += 4;

  const kpiData = [
    [
      'Total Recorded Violations',
      `${violations.length} cases (${openCount} active / ${closedCount} resolved)`,
      'Settlement & Payment Rate',
      `${settlementRate}%`,
    ],
    [
      'Total Assessed Penalties',
      formatSAR(totalFines),
      'Outstanding Liabilities',
      formatSAR(unpaidFines),
    ],
    [
      'Paid & Settled Fines',
      formatSAR(paidFines),
      'Overdue Legal Deadlines',
      `${overdueTasksList.length} statutory tasks past due`,
    ],
    [
      'Group Entities Monitored',
      `${companies.length} corporate subsidiaries`,
      'Critical / High Risk Infractions',
      `${riskCounts.Critical + riskCounts.High} priority cases (${Math.round(((riskCounts.Critical + riskCounts.High) / (violations.length || 1)) * 100)}%)`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Key Metric', 'Value', 'Compliance Indicator', 'Status']],
    body: kpiData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { fontStyle: 'bold', textColor: [37, 99, 235] },
      2: { fontStyle: 'bold' },
      3: { fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // =========================================================================
  // 3. RISK LEVEL & SEVERITY CLASSIFICATION TABLE
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. RISK LEVEL & SEVERITY CLASSIFICATION', margin, currentY);
  currentY += 4;

  const totalViolationsCount = violations.length || 1;
  const riskTableData = [
    [
      'Critical (حرجة)',
      String(riskCounts.Critical),
      `${Math.round((riskCounts.Critical / totalViolationsCount) * 100)}%`,
      formatSAR(riskFines.Critical),
      'Immediate Escalation - Defense objection within 30 days or settlement to prevent portal suspension',
    ],
    [
      'High (عالية)',
      String(riskCounts.High),
      `${Math.round((riskCounts.High / totalViolationsCount) * 100)}%`,
      formatSAR(riskFines.High),
      'Legal consultant assignment, wage review, or proof of Saudization quota submission',
    ],
    [
      'Medium (متوسطة)',
      String(riskCounts.Medium),
      `${Math.round((riskCounts.Medium / totalViolationsCount) * 100)}%`,
      formatSAR(riskFines.Medium),
      'Corrective documentation, safety regulation protocol alignment, and fine settlement schedule',
    ],
    [
      'Low (منخفضة)',
      String(riskCounts.Low),
      `${Math.round((riskCounts.Low / totalViolationsCount) * 100)}%`,
      formatSAR(riskFines.Low),
      'Administrative record closure and verification of establishment compliance status',
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Risk Level', 'Cases', 'Share', 'Total Assessed Fines', 'Mandatory Legal Protocol']],
    body: riskTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { fontStyle: 'bold', textColor: [225, 29, 72] },
      4: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check if page break is needed
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  // =========================================================================
  // 4. SUBSIDIARY & ESTABLISHMENT COMPLIANCE EXPOSURE
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. SUBSIDIARY & ESTABLISHMENT COMPLIANCE EXPOSURE', margin, currentY);
  currentY += 4;

  const companyRows = companies.map((c) => {
    const compViolations = violations.filter((v) => v.companyId === c.id);
    const fines = compViolations.reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
    const paid = compViolations
      .filter((v) => v.status === 'Paid')
      .reduce((s, v) => s + (Number(v.fineAmount) || 0), 0);
    const unpaid = fines - paid;
    const open = compViolations.filter(
      (v) => v.status !== 'Paid' && v.status !== 'Closed'
    ).length;

    return [
      c.name,
      c.commercialRegistrationNumber || 'N/A',
      c.isOfficial ? 'Official (موثق)' : 'Initial (مبدئي)',
      String(compViolations.length),
      String(open),
      formatSAR(fines),
      formatSAR(paid),
      formatSAR(unpaid),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Entity Name',
        'CR Number',
        'Record Type',
        'Total',
        'Active',
        'Assessed Fines',
        'Settled',
        'Outstanding',
      ],
    ],
    body: companyRows.length > 0 ? companyRows : [['No companies registered', '—', '—', '0', '0', '0 SAR', '0 SAR', '0 SAR']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6] },
      5: { fontStyle: 'bold' },
      6: { textColor: [5, 150, 105] },
      7: { fontStyle: 'bold', textColor: [225, 29, 72] },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check if page break is needed
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 16;
  }

  // =========================================================================
  // 5. 12-MONTH MONTHLY INFRACTION TREND OVERVIEW
  // =========================================================================
  if (monthlyTrendData && monthlyTrendData.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. 12-MONTH MONTHLY INFRACTION TREND SUMMARY', margin, currentY);
    currentY += 4;

    const trendRows = monthlyTrendData.map((m) => [
      m.label,
      m.monthKey,
      String(m.occurrences),
      formatSAR(m.fines),
      String(m.critical),
      String(m.high),
      String(m.medium + m.low),
      String(m.paidCount),
      String(m.openCount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'Month',
          'Period Key',
          'Violations',
          'Total Fines',
          'Critical',
          'High',
          'Med / Low',
          'Paid',
          'Pending',
        ],
      ],
      body: trendRows,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246], // Blue 600
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold', textColor: [30, 58, 138] },
        3: { fontStyle: 'bold' },
        4: { halign: 'center', textColor: [225, 29, 72], fontStyle: 'bold' },
        5: { halign: 'center', textColor: [234, 88, 12] },
        6: { halign: 'center' },
        7: { halign: 'center', textColor: [5, 150, 105] },
        8: { halign: 'center', textColor: [217, 119, 6], fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Check if page break is needed
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 16;
  }

  // =========================================================================
  // 6. PRIORITY ACTIVE VIOLATIONS REQUIRING IMMEDIATE DEFENSE OR SETTLEMENT
  // =========================================================================
  const activeViolations = violations
    .filter((v) => v.status !== 'Paid' && v.status !== 'Closed')
    .slice(0, 15); // Top 15 active violations

  if (activeViolations.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      '5. PRIORITY ACTIVE VIOLATIONS (REQUIRING DEFENSE / SETTLEMENT)',
      margin,
      currentY
    );
    currentY += 4;

    const violationRows = activeViolations.map((v) => [
      v.violationCode || v.id || 'N/A',
      v.companyName || 'Group Entity',
      v.category || 'General',
      v.violationDate || v.notificationDate || 'N/A',
      v.deadline || 'Statutory 30 Days',
      v.riskLevel,
      v.status,
      formatSAR(v.fineAmount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'Code',
          'Company / Entity',
          'Category',
          'Infraction Date',
          'Statutory Deadline',
          'Risk',
          'Status',
          'Fine Amount',
        ],
      ],
      body: violationRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'normal' },
        2: { fontStyle: 'normal' },
        3: { halign: 'center' },
        4: { halign: 'center', textColor: [225, 29, 72] },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'center' },
        7: { fontStyle: 'bold', textColor: [30, 58, 138] },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================================
  // 7. FOOTER AND PAGE NUMBERING (ALL PAGES)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate 500

    doc.text(
      'SAED COMPLY Compliance Platform  |  Legal Affairs & Human Resources Regulatory Governance',
      margin,
      pageHeight - 8
    );

    const pageStr = `Page ${i} of ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - margin - pageStrWidth, pageHeight - 8);
  }

  return doc;
}
