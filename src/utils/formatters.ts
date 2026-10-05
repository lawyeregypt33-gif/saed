export function formatCurrency(amount: number, lang: 'ar' | 'en' = 'ar'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return lang === 'ar' ? '0 ر.س' : 'SAR 0';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return lang === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
}

export function formatDate(dateString?: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function isOverdue(dateString?: string): boolean {
  if (!dateString) return false;
  try {
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return false;
    const now = new Date();
    // set to midnight for date comparison
    now.setHours(0, 0, 0, 0);
    target.setHours(23, 59, 59, 999);
    return target < now;
  } catch {
    return false;
  }
}

export function daysRemaining(dateString?: string): number | null {
  if (!dateString) return null;
  try {
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function downloadCSV(filename: string, csvRows: string[][]) {
  // UTF-8 BOM to render Arabic characters correctly in Excel
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    csvRows
      .map((row) =>
        row
          .map((item) => {
            const str = item === null || item === undefined ? '' : String(item);
            // escape quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
