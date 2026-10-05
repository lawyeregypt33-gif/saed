# SAED COMPLY — Saudi HR Compliance & Violations Management System
نظام ساعد للامتثال وإدارة مخالفات الموارد البشرية

## Overview / نبذة عن النظام
**SAED COMPLY** is a streamlined, enterprise-grade web application built to empower corporate legal and compliance teams to systematically track Ministry of Human Resources and Social Development (HRSD / وزارة الموارد البشرية والتنمية الاجتماعية) violations, enforce corrective actions, manage legal objection deadlines, and archive official dispute documentation across company subsidiaries.

---

## Key Features / المميزات الرئيسية
* **Executive Compliance Dashboard (لوحة المتابعة)**: Real-time KPIs for total, open, and critical infractions, overdue deadlines, total fines, paid amounts, and outstanding liabilities in Saudi Riyals (SAR).
* **Multi-Company Management (إدارة الشركات)**: Support for multi-entity hierarchies (including pre-loaded Saed Group companies), with clear visual distinction between initial unverified records and official verified corporate profiles.
* **HRSD Violations Tracking (سجل المخالفات)**: Comprehensive logging with violation ID, Qiwa notification dates, administrative decision numbers, severity risk matrix (Low, Medium, High, Critical), statutory status workflow, and assigned legal counsel.
* **Deadlines & Action Items (المهام والمواعيد القانونية)**: Tracking of statutory 30-day ministry objection windows, task assignments, urgency indicators, and overdue notifications.
* **Legal Documentation (الأرشفة والمستندات)**: Secure attachment repository supporting PDF, DOCX, XLSX, JPG, and PNG files linked to violations and corporate entities.
* **Analytical Reporting & Export (التقارير والتصدير)**: Aggregated breakdown by company, risk level, status, payment progress, and 1-click UTF-8 CSV data export.
* **Role-Based Access Control (إدارة الصلاحيات)**: Fine-grained security for Admins, Legal Consultants, Compliance Officers, and Read-only Viewers.
* **Immutable Audit Trail (سجل العمليات)**: Transparent change history logging all modifications, status progressions, and uploads.
* **Bilingual & RTL First (ثنائي اللغة وتصميم عربي متكامل)**: Native Arabic UI with RTL alignment and effortless language switching.

---

## Database Architecture (Cloud Firestore)

* `companies`: Corporate records, CR numbers, verification status, and active states.
* `violations`: Detailed compliance infractions, fine amounts, legal statuses, and deadlines.
* `tasks`: Corrective actions, responsible officers, milestones, and statutory deadlines.
* `documents`: Attachment metadata, legal filings, and cloud storage references.
* `users`: Team member roles (Admin, Legal Consultant, Compliance Officer, Viewer).
* `auditLogs`: Append-only compliance log for regulatory transparency.

---

## Firebase Configuration / إعداد فايربيس

1. The application reads configuration from `firebase-applet-config.json` located at the root of the project:
   ```json
   {
     "projectId": "YOUR_PROJECT_ID",
     "appId": "YOUR_APP_ID",
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
     "firestoreDatabaseId": "YOUR_FIRESTORE_DATABASE_ID",
     "storageBucket": "YOUR_STORAGE_BUCKET"
   }
   ```
2. In Google AI Studio, Firebase is provisioned automatically with enterprise-grade Firestore and Firebase Authentication.
3. Deploy Firestore security rules using:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## GitHub Setup & Deployment Instructions / خطوات الربط مع جيت هب

Repository Name: `saed-comply`  
Default Branch: `main`

To initialize and push this codebase to your own GitHub repository:

```bash
# 1. Initialize local git repository (if not already initialized)
git init

# 2. Stage all project files
git add .

# 3. Create initial commit
git commit -m "Initial release - SAED COMPLY"

# 4. Ensure default branch is main
git branch -M main

# 5. Link to your GitHub repository (replace YOUR-GITHUB-USERNAME)
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/saed-comply.git

# 6. Push to GitHub
git push -u origin main
```

---

## Local Development / التشغيل المحلي

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run TypeScript build check
npm run build
```

---

## License
Confidential & Proprietary — Saed International.
