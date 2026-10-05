import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Company,
  Violation,
  Task,
  DocumentItem,
  AuditLog,
  UserProfile,
  UserRole,
  ViolationStatus,
  INITIAL_COMPANIES,
} from '../types';

// ==========================================
// AUDIT LOGGING HELPER
// ==========================================
export async function logAuditEvent(params: {
  action: string;
  recordId: string;
  collectionName: string;
  details: string;
}) {
  const path = 'auditLogs';
  try {
    const user = auth.currentUser;
    const logData: AuditLog = {
      userId: user?.uid || 'system',
      userEmail: user?.email || 'system@saed-comply.sa',
      userName: user?.displayName || 'نظام ساعد للامتثال',
      action: params.action,
      recordId: params.recordId,
      collection: params.collectionName,
      details: params.details,
      timestamp: new Date().toISOString(),
    };
    await addDoc(collection(db, path), {
      ...logData,
      _serverTimestamp: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking log catch
    console.warn('Audit log write error:', error);
  }
}

// ==========================================
// COMPANIES
// ==========================================
export function subscribeCompanies(
  onData: (companies: Company[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'companies';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: Company[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Company, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError?.(err);
    }
  );
}

export async function addCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) {
  const path = 'companies';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...company,
      createdAt: now,
      updatedAt: now,
    });
    await logAuditEvent({
      action: 'إضافة شركة جديدة',
      recordId: docRef.id,
      collectionName: path,
      details: `تمت إضافة الشركة: ${company.name} (${company.isOfficial ? 'رسمية موثقة' : 'سجل مبدئي'})`,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateCompany(id: string, updates: Partial<Company>) {
  const path = `companies/${id}`;
  try {
    const docRef = doc(db, 'companies', id);
    const updatePayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, updatePayload);
    await logAuditEvent({
      action: 'تعديل بيانات شركة',
      recordId: id,
      collectionName: 'companies',
      details: `تم تحديث بيانات الشركة ${updates.name || id}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function verifyCompanyOfficial(id: string, companyName: string, isOfficial: boolean) {
  const path = `companies/${id}`;
  try {
    const docRef = doc(db, 'companies', id);
    await updateDoc(docRef, {
      isOfficial,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: isOfficial ? 'توثيق سجل رسمي للشركة' : 'إعادة ضبط الشركة كسجل مبدئي',
      recordId: id,
      collectionName: 'companies',
      details: `تم تعديل حالة توثيق الشركة ${companyName} إلى: ${isOfficial ? 'معتمدة ورسمية' : 'سجل مبدئي غير موثق'}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteCompany(id: string, companyName: string) {
  const path = `companies/${id}`;
  try {
    await deleteDoc(doc(db, 'companies', id));
    await logAuditEvent({
      action: 'حذف شركة',
      recordId: id,
      collectionName: 'companies',
      details: `تم حذف سجل الشركة: ${companyName}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Seed the 13 initial companies if collection is empty
export async function seedInitialCompaniesIfEmpty(): Promise<number> {
  const path = 'companies';
  try {
    const snap = await getDocs(collection(db, path));
    if (!snap.empty) {
      return 0; // Already has companies
    }

    let count = 0;
    const now = new Date().toISOString();
    for (const item of INITIAL_COMPANIES) {
      await addDoc(collection(db, path), {
        name: item.name,
        commercialRegistrationNumber: item.cr,
        notes: item.notes,
        isOfficial: false, // Explicitly initial record, distinct from official
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    await logAuditEvent({
      action: 'تهيئة سجلات الشركات المبدئية',
      recordId: 'init-seed',
      collectionName: 'companies',
      details: `تم تهيئة ${count} شركة تابعة لمجموعة ساعد كسجلات مبدئية`,
    });

    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ==========================================
// VIOLATIONS
// ==========================================
export function subscribeViolations(
  onData: (violations: Violation[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'violations';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: Violation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Violation, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError?.(err);
    }
  );
}

export async function addViolation(violation: Omit<Violation, 'id' | 'createdAt' | 'updatedAt'>) {
  const path = 'violations';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...violation,
      createdAt: now,
      updatedAt: now,
    });
    await logAuditEvent({
      action: 'تسجيل مخالفة جديدة',
      recordId: docRef.id,
      collectionName: path,
      details: `مخالفة رقم: ${violation.violationCode || docRef.id} - ${violation.category} - الغرامة: ${violation.fineAmount} ر.س`,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateViolation(id: string, updates: Partial<Violation>) {
  const path = `violations/${id}`;
  try {
    const docRef = doc(db, 'violations', id);
    const updatePayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, updatePayload);
    await logAuditEvent({
      action: 'تعديل بيانات مخالفة',
      recordId: id,
      collectionName: 'violations',
      details: `تحديث بيانات المخالفة ${updates.violationCode || id} - الحالة: ${updates.status || 'بدون تغيير'}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateViolationStatus(
  id: string,
  violationCode: string,
  newStatus: ViolationStatus,
  notes?: string
) {
  const path = `violations/${id}`;
  try {
    const docRef = doc(db, 'violations', id);
    const payload: Record<string, any> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (notes) {
      payload.notes = notes;
    }
    await updateDoc(docRef, payload);
    await logAuditEvent({
      action: 'تغيير حالة المخالفة',
      recordId: id,
      collectionName: 'violations',
      details: `تم نقل المخالفة ${violationCode} إلى الحالة: ${newStatus}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteViolation(id: string, violationCode: string) {
  const path = `violations/${id}`;
  try {
    await deleteDoc(doc(db, 'violations', id));
    await logAuditEvent({
      action: 'حذف مخالفة',
      recordId: id,
      collectionName: 'violations',
      details: `تم حذف سجل المخالفة: ${violationCode}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// TASKS & DEADLINES
// ==========================================
export function subscribeTasks(
  onData: (tasks: Task[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'tasks';
  const q = query(collection(db, path), orderBy('dueDate', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: Task[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError?.(err);
    }
  );
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  const path = 'tasks';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...task,
      createdAt: now,
      updatedAt: now,
    });
    await logAuditEvent({
      action: 'إنشاء مهمة تصحيحية',
      recordId: docRef.id,
      collectionName: path,
      details: `مهمة: ${task.title} - الاستحقاق: ${task.dueDate} - الموظف: ${task.assignedTo || 'غير محدد'}`,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const path = `tasks/${id}`;
  try {
    const docRef = doc(db, 'tasks', id);
    const updatePayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, updatePayload);
    await logAuditEvent({
      action: updates.status === 'Completed' ? 'إكمال مهمة' : 'تحديث مهمة',
      recordId: id,
      collectionName: 'tasks',
      details: `تحديث المهمة ${updates.title || id} - الحالة: ${updates.status || 'جاري العمل'}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteTask(id: string, title: string) {
  const path = `tasks/${id}`;
  try {
    await deleteDoc(doc(db, 'tasks', id));
    await logAuditEvent({
      action: 'حذف مهمة',
      recordId: id,
      collectionName: 'tasks',
      details: `تم حذف المهمة: ${title}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// DOCUMENTS
// ==========================================
export function subscribeDocuments(
  onData: (docs: DocumentItem[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'documents';
  const q = query(collection(db, path), orderBy('uploadedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: DocumentItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DocumentItem, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError?.(err);
    }
  );
}

export async function addDocumentItem(docItem: Omit<DocumentItem, 'id'>) {
  const path = 'documents';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...docItem,
      _serverTimestamp: serverTimestamp(),
    });
    await logAuditEvent({
      action: 'رفع مستند نظامي',
      recordId: docRef.id,
      collectionName: path,
      details: `تم رفع ملف: ${docItem.fileName} (${docItem.documentType}) - بواسطة ${docItem.uploadedBy}`,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function deleteDocumentItem(id: string, fileName: string) {
  const path = `documents/${id}`;
  try {
    await deleteDoc(doc(db, 'documents', id));
    await logAuditEvent({
      action: 'حذف مستند',
      recordId: id,
      collectionName: 'documents',
      details: `تم حذف المستند: ${fileName}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// AUDIT LOGS
// ==========================================
export function subscribeAuditLogs(
  onData: (logs: AuditLog[]) => void,
  maxRecords = 50,
  onError?: (err: Error) => void
) {
  const path = 'auditLogs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(maxRecords));
  return onSnapshot(
    q,
    (snap) => {
      const items: AuditLog[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AuditLog, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError?.(err);
    }
  );
}

// ==========================================
// USERS MANAGEMENT
// ==========================================
export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: UserProfile[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError?.(err);
    }
  );
}

export async function updateUserRole(userId: string, newRole: UserRole, userEmail: string) {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'تعديل صلاحية مستخدم',
      recordId: userId,
      collectionName: 'users',
      details: `تم تحديث صلاحية المستخدم ${userEmail} إلى: ${newRole}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function toggleUserStatus(userId: string, currentStatus: boolean, userEmail: string) {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      active: !currentStatus,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: !currentStatus ? 'تنشيط حساب مستخدم' : 'تعطيل حساب مستخدم',
      recordId: userId,
      collectionName: 'users',
      details: `تم تغيير حالة المستخدم ${userEmail} إلى: ${!currentStatus ? 'نشط' : 'معطل'}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}
