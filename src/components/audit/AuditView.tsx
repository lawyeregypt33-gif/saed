import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { History, Search, ShieldAlert, Clock, UserCheck, FileText, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface AuditViewProps {
  auditLogs: AuditLog[];
  lang: 'ar' | 'en';
}

export const AuditView: React.FC<AuditViewProps> = ({ auditLogs, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      (log.userName && log.userName.toLowerCase().includes(term)) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(term)) ||
      (log.recordId && log.recordId.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'سجل العمليات والرقابة (Audit Trail)' : 'Audit Trail & Compliance Log'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'سجل غير قابل للتعديل يوثق كافة العمليات، تعديل الحالات، وإرفاق المستندات'
              : 'Immutable regulatory activity log tracking changes, status transitions, and uploads'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <span>{lang === 'ar' ? 'حماية ضد التعديل أو الحذف' : 'Append-Only Protected'}</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'البحث في العمليات، اسم المستخدم، أو التفاصيل...'
                : 'Search actions, user, or details...'
            }
            className="w-full text-xs border border-slate-300 rounded-lg py-2.5 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'ar' ? 'لا توجد سجلات عمليات مسجلة' : 'No audit entries yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'ar'
                ? 'يتم تسجيل أي إجراء يتم تنفيذه في النظام تلقائياً هنا'
                : 'All actions taken in the system are logged automatically'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الحدث / الإجراء' : 'Action'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'التفاصيل' : 'Details'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'المستخدم المسؤول' : 'User'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'الرمز التعريفي' : 'Record ID'}</th>
                  <th className="py-3.5 px-4">{lang === 'ar' ? 'التوقيت' : 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {log.collection}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 max-w-md">
                      <span className="leading-relaxed block">{log.details}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {log.userName || log.userEmail?.split('@')[0]}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[150px]">
                        {log.userEmail}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-blue-700">
                      {log.recordId}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-SA') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
