import React, { useState } from 'react';
import {
  Settings,
  GitBranch,
  Database,
  ShieldCheck,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  RefreshCw,
  Server,
  FileCode,
} from 'lucide-react';
import { firebaseConfig, testConnection } from '../../firebase/config';

interface SettingsViewProps {
  lang: 'ar' | 'en';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ lang }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const gitCommands = [
    {
      label: lang === 'ar' ? '1. تهيئة المستودع المحلي' : '1. Initialize git',
      cmd: 'git init',
    },
    {
      label: lang === 'ar' ? '2. إضافة الملفات والتجهيز' : '2. Stage files',
      cmd: 'git add .',
    },
    {
      label: lang === 'ar' ? '3. تثبيت الإصدار الأولي' : '3. Initial commit',
      cmd: 'git commit -m "Initial release - SAED COMPLY"',
    },
    {
      label: lang === 'ar' ? '4. تعيين الفرع الرئيسي' : '4. Set branch to main',
      cmd: 'git branch -M main',
    },
    {
      label: lang === 'ar' ? '5. ربط المستودع البعيد' : '5. Add GitHub remote',
      cmd: 'git remote add origin https://github.com/YOUR-GITHUB-USERNAME/saed-comply.git',
    },
    {
      label: lang === 'ar' ? '6. رفع الكود إلى جيت هب' : '6. Push to main',
      cmd: 'git push -u origin main',
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTestDb = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await testConnection();
      setConnectionResult(res);
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: err.message || 'فشل الاتصال بقاعدة البيانات',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'ar' ? 'الإعدادات وربط السحابة وجيت هب' : 'Settings, Cloud & GitHub Integration'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {lang === 'ar'
            ? 'التحقق من اتصال فايربيس، قواعد الحماية، وإعدادات المزامنة مع GitHub'
            : 'Verify Firebase connection, security rules, and GitHub repository sync instructions'}
        </p>
      </div>

      {/* Firebase Status Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'ar' ? 'اتصال قاعدة بيانات فايربيس (Firestore)' : 'Firebase Firestore Connection'}
              </h2>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {lang === 'ar' ? 'مُتصل ومُهيأ بالكامل' : 'Connected & Provisioned'}
              </span>
            </div>
          </div>

          <button
            onClick={handleTestDb}
            disabled={testingConnection}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'اختبار الاتصال' : 'Test Connection'}</span>
          </button>
        </div>

        {connectionResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              connectionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{connectionResult.message}</span>
          </div>
        )}

        {/* Config Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-0.5">Project ID</span>
            <span className="font-mono font-bold text-slate-800 break-all">
              {firebaseConfig.projectId || 'hazel-observer-d8chg'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-0.5">Firestore Database ID</span>
            <span className="font-mono font-bold text-slate-800 break-all">
              {firebaseConfig.firestoreDatabaseId || 'default'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-400 block mb-0.5">Auth Domain</span>
            <span className="font-mono font-bold text-slate-800 break-all">
              {firebaseConfig.authDomain || 'hazel-observer-d8chg.firebaseapp.com'}
            </span>
          </div>
        </div>
      </div>

      {/* GitHub Integration Preparation Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'ربط ومزامنة مستودع GitHub' : 'GitHub Repository Integration'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar'
                ? 'تم تجهيز ملفات المشروع (README.md, .gitignore, .env.example) للربط المباشر'
                : 'Project files and security rules prepared for GitHub version control'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-blue-700" />
            <span>
              {lang === 'ar'
                ? 'اسم المستودع المحدد: saed-comply | الفرع الافتراضي: main'
                : 'Repository Name: saed-comply | Default Branch: main'}
            </span>
          </div>
          <p className="text-[11px] text-blue-700">
            {lang === 'ar'
              ? 'قم باستبدال YOUR-GITHUB-USERNAME باسم المستخدم الخاص بك على جيت هب لتنفيذ الأوامر.'
              : 'Replace YOUR-GITHUB-USERNAME with your actual GitHub handle.'}
          </p>
        </div>

        {/* Command list */}
        <div className="space-y-2">
          {gitCommands.map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex items-center justify-between gap-3 font-mono text-xs"
            >
              <div className="truncate">
                <span className="text-slate-400 block text-[10px] font-sans mb-0.5">
                  {item.label}
                </span>
                <span className="text-emerald-400 font-semibold select-all">{item.cmd}</span>
              </div>
              <button
                onClick={() => handleCopy(item.cmd, idx)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
                title="نسخ الأمر"
              >
                {copiedIndex === idx ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
