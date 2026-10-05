import React, { useState } from 'react';
import { Task, Violation, TaskStatus } from '../../types';
import {
  CalendarClock,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  Filter,
  Check,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addTask, updateTask, deleteTask } from '../../services/firestoreService';
import { isOverdue, daysRemaining } from '../../utils/formatters';

interface TasksViewProps {
  tasks: Task[];
  violations: Violation[];
  lang: 'ar' | 'en';
  onSelectViolation: (v: Violation) => void;
  initialViolationForTask?: Violation | null;
  onClearInitialViolation?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  violations,
  lang,
  onSelectViolation,
  initialViolationForTask,
  onClearInitialViolation,
}) => {
  const { isComplianceOrAbove, isLegalOrAbove, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(!!initialViolationForTask);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    violationId: initialViolationForTask?.id || '',
    assignedTo: currentUser?.displayName || '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Pending' as TaskStatus,
    notes: '',
  });

  // Calculate Overdue & Upcoming
  const overdueTasks = tasks.filter((t) => t.status !== 'Completed' && isOverdue(t.dueDate));
  const urgentTasks = tasks.filter((t) => {
    if (t.status === 'Completed' || isOverdue(t.dueDate)) return false;
    const remaining = daysRemaining(t.dueDate);
    return remaining !== null && remaining <= 3;
  });

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignedTo && t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterStatus === 'overdue') return t.status !== 'Completed' && isOverdue(t.dueDate);
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      violationId: initialViolationForTask?.id || violations[0]?.id || '',
      assignedTo: currentUser?.displayName || '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Pending',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Task) => {
    setEditingTask(t);
    setFormData({
      title: t.title,
      violationId: t.violationId,
      assignedTo: t.assignedTo || '',
      startDate: t.startDate || '',
      dueDate: t.dueDate,
      status: t.status,
      notes: t.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title.trim()) {
      setFormError(lang === 'ar' ? 'عنوان المهمة مطلوب' : 'Task title is required');
      return;
    }
    if (!formData.violationId) {
      setFormError(lang === 'ar' ? 'يجب ربط المهمة بمخالفة' : 'Linked violation is required');
      return;
    }

    try {
      const linkedViolation = violations.find((v) => v.id === formData.violationId);
      const payload = {
        ...formData,
        violationCode: linkedViolation?.violationCode || linkedViolation?.id?.slice(0, 8),
        companyId: linkedViolation?.companyId,
      };

      if (editingTask?.id) {
        await updateTask(editingTask.id, payload);
      } else {
        await addTask(payload);
      }

      setIsModalOpen(false);
      onClearInitialViolation?.();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ المهمة');
    }
  };

  const handleToggleComplete = async (t: Task) => {
    if (!t.id || !isComplianceOrAbove) return;
    const newStatus: TaskStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await updateTask(t.id, { status: newStatus });
      showNotice(
        'success',
        newStatus === 'Completed'
          ? (lang === 'ar' ? 'تم تحديد المهمة كمكتملة بنجاح' : 'Task marked as completed')
          : (lang === 'ar' ? 'تمت إعادة فتح المهمة' : 'Task reopened')
      );
    } catch (err: any) {
      showNotice('error', err.message || 'حدث خطأ أثناء تحديث حالة المهمة');
    }
  };

  const handleDelete = (t: Task) => {
    if (!t.id || !isLegalOrAbove) return;
    setDeleteCandidate(t);
  };

  const executeDeleteTask = async () => {
    if (!deleteCandidate?.id) return;
    try {
      await deleteTask(deleteCandidate.id, deleteCandidate.title);
      showNotice(
        'success',
        lang === 'ar' ? `تم حذف المهمة "${deleteCandidate.title}" بنجاح` : 'Task deleted successfully'
      );
    } catch (err: any) {
      showNotice('error', err.message || 'تعذر حذف المهمة');
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'المهام والمواعيد القانونية' : 'Tasks & Legal Deadlines'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة مدد الاعتراض النظامية (30 يوماً)، الإجراءات التصحيحية، والمهام المسندة للمستشارين'
              : 'Monitor statutory objection deadlines, corrective actions, and specialist assignments'}
          </p>
        </div>

        {isComplianceOrAbove && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إنشاء مهمة جديدة' : 'New Task'}</span>
          </button>
        )}
      </div>

      {/* Deadline Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overdue alert */}
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-rose-900 block">
              {lang === 'ar' ? 'مهام متأخرة تجاوزت المهلة' : 'Overdue Tasks'}
            </span>
            <span className="text-xl font-extrabold text-rose-700">
              {overdueTasks.length} {lang === 'ar' ? 'مهام' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Urgent within 3 days */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-900 block">
              {lang === 'ar' ? 'مواعيد حرجة (خلال 3 أيام)' : 'Due Within 3 Days'}
            </span>
            <span className="text-xl font-extrabold text-amber-700">
              {urgentTasks.length} {lang === 'ar' ? 'مهام' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-900 block">
              {lang === 'ar' ? 'مهام منجزة بنجاح' : 'Completed Tasks'}
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {tasks.filter((t) => t.status === 'Completed').length} / {tasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'البحث في عنوان المهمة أو الموظف المسؤول...'
                : 'Search task title or assigned person...'
            }
            className="w-full text-xs border border-slate-300 rounded-lg py-2.5 rtl:pr-9 ltr:pl-9 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
          </span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setFilterStatus('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterStatus === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? `المتأخرة (${overdueTasks.length})` : `Overdue (${overdueTasks.length})`}
          </button>
          <button
            onClick={() => setFilterStatus('Pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterStatus === 'Pending'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'معلقة' : 'Pending'}
          </button>
          <button
            onClick={() => setFilterStatus('In Progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterStatus === 'In Progress'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
          </button>
          <button
            onClick={() => setFilterStatus('Completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterStatus === 'Completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'مكتملة' : 'Completed'}
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">
              {lang === 'ar' ? 'لا توجد مهام مسجلة' : 'No tasks found'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const overdue = task.status !== 'Completed' && isOverdue(task.dueDate);
            const remaining = daysRemaining(task.dueDate);
            const linkedViolation = violations.find((v) => v.id === task.violationId);

            return (
              <div
                key={task.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  {/* Quick Toggle Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      task.status === 'Completed'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-blue-600 text-transparent'
                    }`}
                    title={
                      task.status === 'Completed'
                        ? lang === 'ar'
                          ? 'إعادة فتح المهمة'
                          : 'Reopen task'
                        : lang === 'ar'
                        ? 'تحديد كمكتملة'
                        : 'Mark completed'
                    }
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-sm ${
                          task.status === 'Completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>

                      {overdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {lang === 'ar' ? 'متأخرة' : 'Overdue'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-500 mt-1">
                      {linkedViolation && (
                        <button
                          onClick={() => onSelectViolation(linkedViolation)}
                          className="font-mono text-blue-600 hover:underline font-semibold"
                        >
                          {linkedViolation.violationCode || linkedViolation.id?.slice(0, 8)} (
                          {linkedViolation.companyName})
                        </button>
                      )}

                      {task.assignedTo && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.assignedTo}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={overdue ? 'text-rose-600 font-bold' : ''}>
                          {lang === 'ar' ? 'تاريخ الاستحقاق:' : 'Due:'} {task.dueDate}
                        </span>
                      </span>

                      {remaining !== null && task.status !== 'Completed' && (
                        <span
                          className={`font-semibold ${
                            overdue
                              ? 'text-rose-600'
                              : remaining <= 3
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {overdue
                            ? `(${Math.abs(remaining)} ${lang === 'ar' ? 'يوم تأخير' : 'days overdue'})`
                            : `(${remaining} ${lang === 'ar' ? 'أيام متبقية' : 'days remaining'})`}
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-slate-500 mt-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      task.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'In Progress'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {task.status === 'Completed'
                      ? lang === 'ar'
                        ? 'مكتملة'
                        : 'Completed'
                      : task.status === 'In Progress'
                      ? lang === 'ar'
                        ? 'قيد التنفيذ'
                        : 'In Progress'
                      : lang === 'ar'
                      ? 'معلقة'
                      : 'Pending'}
                  </span>

                  {isComplianceOrAbove && (
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isLegalOrAbove && (
                    <button
                      onClick={() => handleDelete(task)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add / Edit Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="font-bold text-base">
                {editingTask
                  ? lang === 'ar'
                    ? 'تعديل بيانات المهمة'
                    : 'Edit Task'
                  : lang === 'ar'
                  ? 'إنشاء مهمة تصحيحية جديدة'
                  : 'New Corrective Task'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  onClearInitialViolation?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'عنوان المهمة *' : 'Task Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: إعداد اللائحة الاعتراضية ورفعها عبر قوى'
                      : 'e.g. Prepare defense memorandum on Qiwa'
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'المخالفة المرتبطة *' : 'Related Violation *'}
                </label>
                <select
                  required
                  value={formData.violationId}
                  onChange={(e) => setFormData({ ...formData, violationId: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">{lang === 'ar' ? 'اختر المخالفة...' : 'Select violation...'}</option>
                  {violations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.violationCode || v.id?.slice(0, 8)} - {v.companyName} ({v.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'الموظف المسؤول' : 'Assigned Specialist'}
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم المستشار' : 'Specialist name'}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'حالة المهمة' : 'Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as TaskStatus })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Pending">{lang === 'ar' ? 'معلقة' : 'Pending'}</option>
                    <option value="In Progress">{lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                    <option value="Completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
                    <option value="Cancelled">{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'ar' ? 'تاريخ الاستحقاق (الموعد النهائي) *' : 'Due Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar' ? 'ملاحظات وإرشادات التنفيذ' : 'Execution Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={
                    lang === 'ar'
                      ? 'ملاحظات حول طريقة السداد، إرفاق مستندات التبرئة...'
                      : 'Instructions or defense evidence required...'
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onClearInitialViolation?.();
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ المهمة' : 'Save Task'}
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
                  {lang === 'ar' ? 'تأكيد حذف المهمة' : 'Confirm Task Deletion'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'إجراء نهائي لا يمكن التراجع عنه' : 'Irreversible action'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'ar'
                ? `هل أنت متأكد من حذف المهمة "${deleteCandidate.title}"؟`
                : `Are you sure you want to permanently delete task "${deleteCandidate.title}"?`}
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
                onClick={executeDeleteTask}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، حذف المهمة' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
