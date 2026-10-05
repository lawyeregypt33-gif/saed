import React, { useState } from 'react';
import { UserProfile, UserRole, ROLE_TRANSLATIONS } from '../../types';
import {
  Users2,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateUserRole, toggleUserStatus } from '../../services/firestoreService';
import { formatDate } from '../../utils/formatters';

interface UsersViewProps {
  users: UserProfile[];
  lang: 'ar' | 'en';
}

export const UsersView: React.FC<UsersViewProps> = ({ users, lang }) => {
  const { isAdmin, currentUser, effectiveRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  const handleRoleChange = async (userId: string, newRole: UserRole, email: string) => {
    if (!isAdmin) {
      showNotice('error', lang === 'ar' ? 'فقط مدير النظام يمكنه تعديل الصلاحيات' : 'Only Admins can change roles');
      return;
    }
    setUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole, email);
      showNotice(
        'success',
        lang === 'ar' ? `تم تحديث صلاحية ${email} إلى ${newRole}` : `Role updated to ${newRole}`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تحديث الصلاحية');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean, email: string) => {
    if (!isAdmin) return;
    setUpdatingId(userId);
    try {
      await toggleUserStatus(userId, currentStatus, email);
      showNotice(
        'success',
        !currentStatus
          ? (lang === 'ar' ? `تم تنشيط حساب ${email} بنجاح` : `Account ${email} activated`)
          : (lang === 'ar' ? `تم تعطيل حساب ${email}` : `Account ${email} disabled`)
      );
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تعديل حالة الحساب');
    } finally {
      setUpdatingId(null);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'User Management & RBAC'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'تحديد الأدوار الرقابية والقانونية وإدارة حسابات فريق الامتثال'
              : 'Role-Based Access Control for legal counsel, compliance officers, and auditors'}
          </p>
        </div>

        {/* Current user role badge */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
          <Key className="w-4 h-4 text-blue-600" />
          <span>
            {lang === 'ar' ? 'دورك الحالي:' : 'Your Active Role:'}{' '}
            <strong className="text-blue-800">{ROLE_TRANSLATIONS[effectiveRole]?.ar || effectiveRole}</strong>
          </span>
        </div>
      </div>

      {/* Role Definitions Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['Admin', 'Legal Consultant', 'Compliance Officer', 'Viewer'] as UserRole[]).map(
          (role) => {
            const trans = ROLE_TRANSLATIONS[role];
            return (
              <div key={role} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck
                    className={`w-4 h-4 ${
                      role === 'Admin'
                        ? 'text-purple-600'
                        : role === 'Legal Consultant'
                        ? 'text-blue-600'
                        : role === 'Compliance Officer'
                        ? 'text-emerald-600'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="font-bold text-xs text-slate-900">
                    {lang === 'ar' ? trans.ar : role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{trans.desc}</p>
              </div>
            );
          }
        )}
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
                ? 'البحث باسم المستخدم، البريد، أو الصلاحية...'
                : 'Search by user name, email, or role...'
            }
            className="w-full text-xs border border-slate-300 rounded-lg py-2.5 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <tr>
                <th className="py-3.5 px-4">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="py-3.5 px-4">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="py-3.5 px-4">{lang === 'ar' ? 'الصلاحية (Role)' : 'Role'}</th>
                <th className="py-3.5 px-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4">{lang === 'ar' ? 'تاريخ الانضمام' : 'Joined'}</th>
                {isAdmin && <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'إجراءات الإدارة' : 'Actions'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.uid === u.uid;

                return (
                  <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                          {u.displayName ? u.displayName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{u.displayName}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-blue-600 font-semibold block">
                              {lang === 'ar' ? '(أنت)' : '(You)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>

                    <td className="py-3.5 px-4">
                      {isAdmin && !isCurrent ? (
                        <select
                          value={u.role}
                          disabled={updatingId === u.uid}
                          onChange={(e) =>
                            handleRoleChange(u.uid, e.target.value as UserRole, u.email)
                          }
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
                        >
                          <option value="Admin">Admin (مدير النظام)</option>
                          <option value="Legal Consultant">Legal Consultant (مستشار قانوني)</option>
                          <option value="Compliance Officer">Compliance Officer (مسؤول امتثال)</option>
                          <option value="Viewer">Viewer (مطلع)</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            u.role === 'Admin'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : u.role === 'Legal Consultant'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : u.role === 'Compliance Officer'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lang === 'ar' ? ROLE_TRANSLATIONS[u.role]?.ar || u.role : u.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.active ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span>
                          {u.active
                            ? lang === 'ar'
                              ? 'حساب نشط'
                              : 'Active'
                            : lang === 'ar'
                            ? 'معطل'
                            : 'Disabled'}
                        </span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {formatDate(u.createdAt, lang)}
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        {!isCurrent && (
                          <button
                            onClick={() => handleStatusToggle(u.uid, u.active, u.email)}
                            disabled={updatingId === u.uid}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                              u.active
                                ? 'text-red-700 hover:bg-red-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.active
                              ? lang === 'ar'
                                ? 'تعطيل الحساب'
                                : 'Disable'
                              : lang === 'ar'
                              ? 'تنشيط'
                              : 'Activate'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
