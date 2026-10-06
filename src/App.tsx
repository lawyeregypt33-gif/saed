/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabId } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { CompaniesView } from './components/companies/CompaniesView';
import { ViolationsView } from './components/violations/ViolationsView';
import { TasksView } from './components/tasks/TasksView';
import { DocumentsView } from './components/documents/DocumentsView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { AuditView } from './components/audit/AuditView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import {
  Company,
  Violation,
  Task,
  DocumentItem,
  AuditLog,
  UserProfile,
} from './types';
import {
  subscribeCompanies,
  subscribeViolations,
  subscribeTasks,
  subscribeDocuments,
  subscribeAuditLogs,
  subscribeUsers,
  seedInitialCompaniesIfEmpty,
  seedSampleViolationsIfEmpty,
} from './services/firestoreService';
import { testConnection } from './firebase/config';
import { isOverdue } from './utils/formatters';
import { ShieldAlert, AlertCircle, LogIn } from 'lucide-react';

function MainApp() {
  const { currentUser, loading: authLoading } = useAuth();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Firestore Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Navigation context links
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [taskViolationContext, setTaskViolationContext] = useState<Violation | null>(null);
  const [uploadViolationContext, setUploadViolationContext] = useState<Violation | null>(null);

  // Run testConnection on app startup as mandated by Firebase Skill
  useEffect(() => {
    testConnection();
  }, []);

  // Sync RTL/LTR with document head
  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Subscribe to Firestore collections when currentUser is present
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    // Auto-seed initial 13 Saed companies if collection is completely fresh
    seedInitialCompaniesIfEmpty().catch((err) =>
      console.warn('Initial seed check:', err)
    );

    const unsubCompanies = subscribeCompanies(setCompanies);
    const unsubViolations = subscribeViolations(setViolations);
    const unsubTasks = subscribeTasks(setTasks);
    const unsubDocs = subscribeDocuments(setDocuments);
    const unsubAudit = subscribeAuditLogs(setAuditLogs);
    const unsubUsers = subscribeUsers(setUsers);

    return () => {
      unsubCompanies();
      unsubViolations();
      unsubTasks();
      unsubDocs();
      unsubAudit();
      unsubUsers();
    };
  }, [currentUser]);

  // Seed sample violations if companies are populated but violations collection is empty
  useEffect(() => {
    if (currentUser && companies.length > 0 && violations.length === 0) {
      seedSampleViolationsIfEmpty(companies).catch((err) =>
        console.warn('Violations seed check:', err)
      );
    }
  }, [currentUser, companies, violations.length]);

  // Calculate count badges
  const openTasksCount = tasks.filter(
    (t) => t.status !== 'Completed' && isOverdue(t.dueDate)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        lang={lang}
        setLang={setLang}
        activeTab={activeTab}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          lang={lang}
          counts={{
            violationsCount: violations.length,
            companiesCount: companies.length,
            openTasksCount,
          }}
        />

        {/* Content View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* If not logged in, show welcome notice with direct login prompt */}
          {!currentUser && !authLoading && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {lang === 'ar'
                      ? 'مرحباً بك في نظام ساعد للامتثال الرقابي (SAED COMPLY)'
                      : 'Welcome to SAED COMPLY Management System'}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {lang === 'ar'
                      ? 'قم بتسجيل الدخول للوصول إلى قاعدة بيانات المخالفات والشركات وإدارة المهام'
                      : 'Please sign in to access compliance database, records, and task workflows'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-center shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تسجيل الدخول / فتح حساب' : 'Sign In / Register'}</span>
              </button>
            </div>
          )}

          {/* Active Tab Screen */}
          {activeTab === 'dashboard' && (
            <DashboardView
              violations={violations}
              companies={companies}
              tasks={tasks}
              lang={lang}
              onNavigateToViolations={() => setActiveTab('violations')}
              onOpenNewViolation={() => {
                setActiveTab('violations');
              }}
              onSelectViolation={(v) => {
                setSelectedViolation(v);
                setActiveTab('violations');
              }}
            />
          )}

          {activeTab === 'companies' && (
            <CompaniesView
              companies={companies}
              violations={violations}
              lang={lang}
              onSelectViolation={(v) => {
                setSelectedViolation(v);
                setActiveTab('violations');
              }}
            />
          )}

          {activeTab === 'violations' && (
            <ViolationsView
              violations={violations}
              companies={companies}
              tasks={tasks}
              documents={documents}
              auditLogs={auditLogs}
              lang={lang}
              selectedViolation={selectedViolation}
              onSelectViolation={setSelectedViolation}
              onOpenNewTaskForViolation={(v) => {
                setTaskViolationContext(v);
                setActiveTab('tasks');
              }}
              onOpenUploadForViolation={(v) => {
                setUploadViolationContext(v);
                setActiveTab('documents');
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              violations={violations}
              lang={lang}
              onSelectViolation={(v) => {
                setSelectedViolation(v);
                setActiveTab('violations');
              }}
              initialViolationForTask={taskViolationContext}
              onClearInitialViolation={() => setTaskViolationContext(null)}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              documents={documents}
              companies={companies}
              violations={violations}
              lang={lang}
              initialViolationForUpload={uploadViolationContext}
              onClearInitialViolation={() => setUploadViolationContext(null)}
              onSelectViolation={(v) => {
                setSelectedViolation(v);
                setActiveTab('violations');
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              violations={violations}
              companies={companies}
              tasks={tasks}
              lang={lang}
            />
          )}

          {activeTab === 'audit' && (
            <AuditView auditLogs={auditLogs} lang={lang} />
          )}

          {activeTab === 'users' && (
            <UsersView users={users} lang={lang} />
          )}

          {activeTab === 'settings' && (
            <SettingsView lang={lang} />
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || (!currentUser && !authLoading)}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
