# BeastCode Online Judge — Complete Technical Deep-Dive Documentation

> **Document Classification:** Enterprise Architectural Audit & Comprehensive Technical Specification  
> **Target Audience:** Software Engineers, Technical Leads, System Architects, Security Auditors, Academic Administrators, AI Agents  
> **Target Repository:** `leetcode-clone-youtube` (`leetcode-yt` v0.1.0)  
> **Production Deployment:** [https://www.bomboclatbeastcode.codes](https://www.bomboclatbeastcode.codes)  
> **Generation Date:** September 2026  

---

## Table of Contents
1. [Executive Overview](#1-executive-overview)
2. [Project Goals](#2-project-goals)
3. [Technology Stack](#3-technology-stack)
4. [Complete Repository Structure](#4-complete-repository-structure)
5. [Entry Points](#5-entry-points)
6. [Architecture](#6-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Component System](#8-component-system)
9. [State Management](#9-state-management)
10. [Backend Architecture](#10-backend-architecture)
11. [API Documentation](#11-api-documentation)
12. [Database Architecture](#12-database-architecture)
13. [Data Flow](#13-data-flow)
14. [Authentication](#14-authentication)
15. [Authorization and Permissions](#15-authorization-and-permissions)
16. [User Roles](#16-user-roles)
17. [Main Features](#17-main-features)
18. [User Journeys](#18-user-journeys)
19. [Business Logic](#19-business-logic)
20. [Algorithms](#20-algorithms)
21. [AI / Machine Learning Components](#21-ai--machine-learning-components)
22. [Search System](#22-search-system)
23. [File Handling](#23-file-handling)
24. [Notification System](#24-notification-system)
25. [Email System](#25-email-system)
26. [Payments and Monetization](#26-payments-and-monetization)
27. [Admin System](#27-admin-system)
28. [Security Analysis](#28-security-analysis)
29. [Privacy Analysis](#29-privacy-analysis)
30. [Error Handling](#30-error-handling)
31. [Logging and Observability](#31-logging-and-observability)
32. [Testing](#32-testing)
33. [Performance](#33-performance)
34. [Scalability](#34-scalability)
35. [Reliability](#35-reliability)
36. [Concurrency and Race Conditions](#36-concurrency-and-race-conditions)
37. [Configuration](#37-configuration)
38. [Dependencies](#38-dependencies)
39. [Build System](#39-build-system)
40. [Development Workflow](#40-development-workflow)
41. [Deployment](#41-deployment)
42. [CI/CD](#42-cicd)
43. [Database Cost Analysis](#43-database-cost-analysis)
44. [Cloud Cost Analysis](#44-cloud-cost-analysis)
45. [Code Quality](#45-code-quality)
46. [Technical Debt](#46-technical-debt)
47. [Incomplete Features](#47-incomplete-features)
48. [Dead Code](#48-dead-code)
49. [Duplication](#49-duplication)
50. [Naming and Organization Problems](#50-naming-and-organization-problems)
51. [UI/UX Analysis](#51-uiux-analysis)
52. [Accessibility](#52-accessibility)
53. [Mobile Responsiveness](#53-mobile-responsiveness)
54. [SEO](#54-seo)
55. [Analytics](#55-analytics)
56. [Major Workflows](#56-major-workflows)
57. [State Machines](#57-state-machines)
58. [Edge Cases](#58-edge-cases)
59. [Failure Scenarios](#59-failure-scenarios)
60. [Developer Experience](#60-developer-experience)
61. [Project Strengths](#61-project-strengths)
62. [Project Weaknesses](#62-project-weaknesses)
63. [Highest-Risk Areas](#63-highest-risk-areas)
64. [Highest-Priority Improvements](#64-highest-priority-improvements)
65. [Refactoring Roadmap](#65-refactoring-roadmap)
66. [Feature Roadmap](#66-feature-roadmap)
67. [Production Readiness](#67-production-readiness)
68. [New Developer Onboarding Guide](#68-new-developer-onboarding-guide)
69. [AI-Agent Onboarding Guide](#69-ai-agent-onboarding-guide)
70. [Glossary](#70-glossary)
71. [Important File Index](#71-important-file-index)
72. [Dependency Map](#72-dependency-map)
73. [Full System Mental Model](#73-full-system-mental-model)
74. ["If I Were Taking Over This Project" Section](#74-if-i-were-taking-over-this-project-section)
75. [Final Comprehensive Assessment](#75-final-comprehensive-assessment)

---

## 1. Executive Overview

### 1.1 Project Identity & Purpose
* **Project Name:** BeastCode (Package name: `leetcode-yt`, version `0.1.0`)
* **Primary URL:** `https://www.bomboclatbeastcode.codes`
* **Core Functionality:** BeastCode is a full-stack, production-grade competitive programming and online judge platform. It provides an algorithm problem bank, real-time code editor with multi-language execution, ICPC-style contest management, browser-proctored exams with anti-cheat detection, Discord-style threaded discussion community, multi-tenant enterprise university and corporate workspaces, transactional notification engine, and an administrative control panel.
* **Problem Addressed:** Existing open-source LeetCode clones are typically front-end mockups or execute untrusted code using unsafe client-side `eval()` or un-jailed host processes. BeastCode provides true sandbox execution with Linux namespaces (`unshare`) and control groups (`cgroups v2`) with remote Judge0 cloud fallback, institutional student verification (university, faculty, class, student ID), ICPC-standard contest rules (penalty calculation, scoreboard freezing, virtual participation), and academic multi-tenancy.

### 1.2 Target Audience
1. **Students & Programmers:** Practice coding challenges, submit code in 5 programming languages (JavaScript, Python, C++, C, Java), join live or virtual contests, and track progress via XP and tier rankings.
2. **Academic Instructors (Universities):** Create private tenant spaces, conduct proctored classroom contests, enforce university domain email access, assign homework, and review student progress in gradebooks.
3. **Corporate Recruiters:** Publish technical job vacancies, screen candidates via private coding assessments, calculate candidate profile scores, and conduct live coding technical interviews.
4. **Platform Moderators & Admins:** Oversee community threads, review flagged reports, enforce warnings and suspensions, inspect execution logs, manage the email outbox queue, and maintain database problem tags.

### 1.3 Maturity Level
* **Current Maturity:** **Advanced Production-Ready Hybrid MVP / Enterprise Pilot.**
* The codebase contains deep operational logic:
  - Multi-tenant Organization Engine ([`src/pages/orgs/[slug].tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/orgs/%5Bslug%5D.tsx)) spanning 5,186 lines.
  - Dual-path code execution judge ([`src/pages/api/run.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/run.ts)) spanning 1,208 lines.
  - Transactional email outbox queue with exponential retry backoff ([`src/utils/emailService.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/emailService.ts)).
  - Browser anti-cheat monitoring with fullscreen enforcement and window blur detection ([`src/pages/contests/[cid]/problems/[pid].tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/contests/%5Bcid%5D/problems/%5Bpid%5D.tsx)).

---

## 2. Project Goals

### 2.1 Primary Goals (Confirmed in Code)
* Provide secure multi-language code execution for untrusted user submissions.
* Run ICPC-style contests with deterministic state transitions, scoreboard freeze periods, and tie-breaking time penalties.
* Enforce student identity verification and academic progress tracking.
* Guard live competitive contests against tab switching and unauthorized assistance.

### 2.2 Secondary Goals (Confirmed in Code)
* Foster a collaborative community discussion platform with rich attachments, voting polls, and code cards.
* Enforce trust and safety moderation policies, warning escalations, suspensions, and appeal handling with 14-day deletion delays.
* Provide an asynchronous email outbox queue delivering registration verifications, password resets, and contest updates.

### 2.3 Technical Goals (Inferred from Implementation)
* Implement dual-path execution resilience: Local Linux Cgroups v2 when available, falling back to remote Judge0 batch API.
* Decouple user provisioning from registration to prevent database bloat from unverified accounts.
* Support offline local development with in-memory Mock Firestore and Mock Auth stores.

---

## 3. Technology Stack

| Category | Technology | Version | Location / Usage | Architectural Role |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `13.2.4` | Full application | SSR, ISR, and API endpoints via Pages Router |
| **Language** | TypeScript | `5.0.2` | Full application | Type safety and domain contracts |
| **Styling** | TailwindCSS | `3.2.7` | `tailwind.config.js`, `globals.css` | Dark-first design system with glassmorphism |
| **Database** | Cloud Firestore | NoSQL | `firestore.rules`, client & admin | Primary document database |
| **Cache** | Redis (`ioredis`) | `5.11.1` | `src/utils/redis.ts` | Contest standings cache & invalidation dirty-flags |
| **Authentication** | Firebase Auth | `9.18.0` | `src/firebase/firebase.ts` | User sign-in, registration, email verification |
| **Server Admin** | Firebase Admin SDK | `13.10.0` | `src/firebase/firebaseAdmin.ts` | Privileged mutations, token verification, user deletion |
| **Code Editor** | CodeMirror 6 | `4.19.16` | `src/components/Workspace/` | Web code editor with theme and language extensions |
| **Execution** | Child Process / Cgroups v2 | Native Linux | `src/pages/api/run.ts` | Sandboxed subprocess execution (`unshare`) |
| **Remote Judge** | Judge0 CE API | REST | `src/pages/api/run.ts` | Fallback remote code execution engine |
| **State Management** | Recoil | `0.7.7` | `src/atoms/`, `src/pages/_app.tsx` | Global modal, execution, and composer state |
| **Email** | Nodemailer | `8.0.11` | `src/utils/emailService.ts` | SMTP email transport with retry loop |
| **Payments** | Stripe | `22.2.0` | `src/pages/api/create-checkout-session.ts` | Infrastructure donation checkout sessions |
| **Deployment** | Firebase App Hosting | Cloud Run | `apphosting.yaml` | Containerized serverless deployment |

---

## 4. Complete Repository Structure

```
leetcode-clone-youtube/
├── apphosting.yaml                    # Firebase App Hosting (Cloud Run) configuration
├── firebase.json                      # Firebase configuration manifest
├── firestore.indexes.json             # Composite indexes for Firestore
├── firestore.rules                    # Declarative security rules (38+ collections)
├── next.config.js                     # Next.js configuration and auth rewrites
├── package.json                       # Project manifest and dependencies
├── postcss.config.js                  # PostCSS configuration
├── tailwind.config.js                 # Tailwind design tokens and animations
├── tsconfig.json                      # TypeScript configuration
├── uploads/                           # Local storage for avatars, evidence, appeals
├── docs/                              # Technical documentation chapters (01 to 18)
├── scripts/                           # Maintenance, migration, and test scripts
└── src/
    ├── atoms/                         # Recoil global state atoms
    ├── components/                    # Reusable React UI components
    │   ├── Admin/                     # Admin dashboard tabs (Overview, Problems, Contests, etc.)
    │   ├── AttachmentViewer/          # Multi-format media viewer modal (PDF, Audio, Video, Code)
    │   ├── Buttons/                   # Action button primitives (Logout)
    │   ├── ErrorBoundary/             # React rendering error boundary
    │   ├── Leaderboard/               # Standings table supporting medals and freeze masks
    │   ├── Modals/                    # Auth, Settings, and Profile onboarding dialogs
    │   ├── Navbar/ & Topbar/          # Global navigation headers
    │   ├── Notification/              # Notification center popover and preferences
    │   ├── ProblemsTable/             # Paginated problem list with video modals
    │   ├── Settings/                  # Security settings, sessions manager, 2FA
    │   ├── Threads/                   # Community forum, card, composer, polls, media
    │   ├── UI/                        # Custom BeastCode UI primitives (Pagination, Select)
    │   └── Workspace/                 # CodeMirror editor, problem statement, scorecards
    ├── context/                       # Notification and Submission React context providers
    ├── firebase/                      # Client and Admin Firebase initializers
    ├── hooks/                         # Custom React hooks (useAdmin, useContestStandings, etc.)
    ├── pages/                         # Next.js Pages Router (UI routes & 100+ API endpoints)
    │   ├── admin/                     # Admin SPA and management routes
    │   ├── api/                       # REST endpoints (auth, security, run, submit, orgs)
    │   ├── contests/                  # Contest lobby and proctored problem workspace
    │   ├── orgs/                      # Multi-tenant organization workspace
    │   ├── problems/                  # Algorithm problem workspace
    │   └── ...                        # Auth, profile, rankings, settings, threads
    ├── styles/                        # Global CSS variables and themes
    └── utils/                         # Business logic, sandboxing, scoring, and email engines
```

---

## 5. Entry Points

### 5.1 Frontend Entry Points
* **[`src/pages/_app.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/_app.tsx):** Master application wrapper.
  - Suppresses console logs in production; pipes errors to `window.__developer_errors`.
  - Sets up global `fetch` interceptor routing organization API calls through `apiClient`.
  - Applies theme attributes (`data-theme`) and synchronizes client clock with `/api/time`.
  - Runs `GlobalAuthAndProfileCheck`: enforces email verification, listens to user ban status, triggers lazy provisioning via `POST /api/auth/provision`, and maintains 120s active session heartbeats.
* **[`src/pages/_document.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/_document.tsx):** HTML document skeleton.
* **Primary Page Routes:** `index.tsx` (Problem Set), `problems/[pid].tsx` (Workspace), `contests.tsx` (Contests), `orgs/[slug].tsx` (Organizations), `admin/index.tsx` (Admin SPA).

### 5.2 Backend API Entry Points
* **Code Execution:** [`src/pages/api/run.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/run.ts) (sandbox runner).
* **Code Submission:** [`src/pages/api/submit.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/submit.ts) (grading, scoring, transactions).
* **Lazy Provisioning:** [`src/pages/api/auth/provision.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/auth/provision.ts) (atomic 18-doc provisioning).
* **Outbox Processor:** [`src/pages/api/notifications/process-queue.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/notifications/process-queue.ts) (Nodemailer email loop).
* **Cron Standings:** [`src/pages/api/cron/calculate-standings.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/cron/calculate-standings.ts) (contest leaderboard freeze calculator).

---

## 6. Architecture

```
+─────────────────────────────────────────────────────────────────────────────────────────+
│                                  CLIENT BROWSER LAYER                                   │
│                                                                                         │
│  +─────────────────────────+  +──────────────────────────+  +────────────────────────+  │
│  │   Next.js UI Pages      │  │      CodeMirror 6        │  │     Recoil Atoms       │  │
│  │  (/problems, /contests) │  │  (JS, Py, C++, Java, C)  │  │  (Auth, Exec, Thread) │  │
│  +────────────┬────────────+  +────────────┬─────────────+  +───────────┬────────────+  │
│               │                            │                            │               │
│               ▼                            ▼                            ▼               │
│  +───────────────────────────────────────────────────────────────────────────────────+  │
│  │              Client Subscriptions & Guards (src/pages/_app.tsx)                   │  │
│  │     - Session Sync Heartbeat (120s)     - Realtime Notification Listener         │  │
│  │     - Moderation Ban Listener           - Profile Completeness Enforcer          │  │
│  +────────────┬──────────────────────────────────────────────────────────┬───────────+  │
+───────────────┼──────────────────────────────────────────────────────────┼──────────────+
                │ Direct WebSocket Streams                                 │ HTTPS REST
                │ (Governed by firestore.rules)                            │ (Bearer Token)
                ▼                                                          ▼
+───────────────────────────────+               +─────────────────────────────────────────+
│       CLOUD FIRESTORE         │               │          NEXT.JS API LAYER              │
│       (Data Storage)          │               │             (Cloud Run)                 │
│                               │               │                                         │
│  - users/ & profiles/         │               │  +───────────────────────────────────+  │
│  - problems/ & testcases      │◄──────────────┤  │ withAuthAndModeration Middleware  │  │
│  - threads/ & comments        │  Admin SDK    │  │  - Firebase ID Token Verification │  │
│  - notifications/             │  (Full Trust) │  │  - Banned/Pending-Deletion Checks │  │
│  - contests/ & submissions    │               │  +─────────────────┬─────────────────+  │
│  - emailQueue/ (Outbox)       │               │                    │                    │
│  - organizations/             │               │  +─────────────────▼─────────────────+  │
│  - securityLogs/              │               │  │       Route Business Logic        │  │
+───────────────────────────────+               │  │  - /api/submit    - /api/auth/*   │  │
                                                │  │  - /api/run       - /api/admin/*  │  │
                                                │  +────────┬─────────────────────┬────+  │
                                                +───────────┼─────────────────────┼───────+
                                                            │                     │
                                   Local Process Execution  │                     │ Remote API
                                   (cgroups v2 + unshare)   │                     │
                                                            ▼                     ▼
                                                +────────────────────+  +─────────────────+
                                                │  LOCAL LINUX HOST  │  │   JUDGE0 CE     │
                                                │  - memory.max      │  │   CLOUD API     │
                                                │  - pids.max        │  │                 │
                                                │  - cpu.max         │  │  Batch Runner   │
                                                │  - g++, node, py3  │  │  (Fallback)     │
                                                +────────────────────+  +─────────────────+
                                                            │
                                                            ▼
                                                +────────────────────+  +─────────────────+
                                                │  SMTP / NODEMAILER │  │   STRIPE API    │
                                                │  Gmail / Ethereal  │  │   Donations     │
                                                +────────────────────+  +─────────────────+
```

---

## 7. Frontend Architecture

### 7.1 Page Layout & Navigation
* **Dual Header Structure:**
  - **Global Topbar ([`src/components/Topbar/Topbar.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Topbar/Topbar.tsx)):** Houses branding, Problem Set, Contests, Threads, Organizations, Global Leaderboard, Realtime Notification Center, and User Profile menu. On problem pages, transforms into problem pagination controls (`<Prev`, `Next>`).
  - **Secondary Navigation ([`src/components/TabsNavigation/SecondaryNav.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/TabsNavigation/SecondaryNav.tsx)):** Provides horizontal pill tabs for multi-section views (Contests, Organizations, Problem Workspace).

### 7.2 Routing Model
* Built on Next.js 13 Pages Router.
* Dynamic problem workspace routes use Incremental Static Regeneration (`getStaticProps` with `revalidate: 1`, `fallback: "blocking"`).
* Authenticated routes are guarded in `_app.tsx` by `GlobalAuthAndProfileCheck`.

---

## 8. Component System

### 8.1 Key Component Modules
* **[`Workspace.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Workspace/Workspace.tsx) (1,339 lines):** Manages draggable split-screen layout, statement tabs, CodeMirror playground, execution console, testcase scorecards, and celebration confetti.
* **[`Playground.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Workspace/Playground/Playground.tsx) (768 lines):** Embeds CodeMirror 6 with syntax modules for JavaScript, Python, C++, and Java. Includes local storage persistence (`code-{pid}-{lang}`), custom testcase STDIN inputs, and execution shortcuts.
* **[`TestcaseScorecard.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Workspace/TestcaseScorecard/TestcaseScorecard.tsx):** Renders granular input/output diffs, runtime in ms, memory consumed, and compiler tracebacks.
* **[`Threads.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Threads/Threads.tsx) (1,123 lines):** Community forum with `IntersectionObserver` virtualization, real-time Firestore stream, rich composer, nested comment trees, and voting polls.
* **[`src/pages/orgs/[slug].tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/orgs/%5Bslug%5D.tsx) (5,186 lines):** Comprehensive enterprise tenant workspace covering members, university hierarchy, syllabus roadmaps, homework assignments, private problem authoring, recruitment job board, screening assessments, and gradebooks.

---

## 9. State Management

```
1. RECOIL (Global UI State)
   ├── authModalState:        Controls Login, Register, Forgot Password modal.
   ├── executionStateAtom:    Global code compilation/running toaster & status bar.
   ├── threadComposerAtom:    Thread creation modal, parent thread reply target.
   └── authFeedbackAtom:      Field-level form error messages.

2. REACT CONTEXT (Real-Time State)
   ├── RealtimeNotificationProvider: Firestore listener on notifications.
   └── SubmissionContext:            Active submit progression & test execution.

3. LOCAL STORAGE (Client Persistence)
   ├── "theme":               Active theme mode ("default", "dark", "light").
   ├── "bc_session_id":       Active device identifier for heartbeat sync.
   ├── "lcc-fontSize":        Code editor font size.
   └── "code-{pid}-{lang}":   Auto-saved code buffer per problem.
```

---

## 10. Backend Architecture

* Next.js API Routes hosted on Google Cloud Run via Firebase App Hosting.
* Middleware architecture using Higher-Order Functions:
  - `withApiErrorHandler`: Suppresses stack traces in production; formats uniform JSON errors.
  - `withAuthAndModeration`: Validates Firebase ID tokens, rejects banned users, auto-unbans expired suspensions.
  - `withAdminGuard`: Restricts routes to super-admin whitelisted emails or admin claims.
* High-performance sandboxed local subprocess execution with Judge0 cloud fallback.

---

## 11. API Documentation

### 11.1 Master API Index

| Category | Endpoints Count | Key Routes | Security / Guards |
| :--- | :---: | :--- | :--- |
| **Execution & Problems** | 6 | `/api/run`, `/api/submit`, `/api/problem-tags`, `/api/recount-solved`, `/api/time` | `withAuthAndModeration`, `withAdminGuard` |
| **Authentication** | 7 | `/api/auth/provision`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/change-password` | Token verification, email verification guard |
| **Security & Sessions** | 9 | `/api/security/sessions`, `/api/security/logout-all`, `/api/security/security-score`, `/api/security/login-history` | `withAuthAndModeration`, SHA-256 codes |
| **Contests & Leaderboards** | 9 | `/api/contests/[cid]/standings`, `/api/cron/calculate-standings`, `/api/leaderboard`, email dispatchers | Soft auth, `CRON_SECRET`, `withAdminGuard` |
| **Notifications & Email** | 6 | `/api/notifications/dispatch`, `/api/notifications/process-queue`, `/api/unsubscribe` | Opt-out check, user preferences |
| **Moderation & Trust** | 4 | `/api/moderation/report`, `/api/moderation/appeal`, `/api/moderation/self-delete`, `/api/moderation/status-by-ref` | `withAuthAndModeration` |
| **Admin Operations** | 14 | `/api/admin/users`, `/api/admin/moderation/ban`, `/api/admin/moderation/warn`, `/api/admin/moderation/appeals` | `withAdminGuard` |
| **Multi-Tenant Organizations** | 45+ | `/api/organizations/[id]/*`, `/api/orgs/[slug]/*` (members, private-problems, contests, jobs, courses) | `checkOrgPermission` RBAC |

---

## 12. Database Architecture

### 12.1 Core Collections
* `users/{userId}`: Core profile, XP, solved counts (easy/medium/hard/ml), tier, student card data.
* `problems/{problemId}`: Problem statement, examples, constraints, execution profile, stats.
* `contests/{contestId}`: Start/end times, freeze duration, visibility, security level, rules.
* `contest_participants/{contestId}_{uid}`: Registration status, virtual mode info, warning counts.
* `contest_submissions/{submissionId}`: Code, language, verdict, score, runtime, memory, test results.
* `threads/{threadId}`: Author, content, tags, likes array, poll, code card, parentThreadId.
* `notifications/{notifId}`: ToUid, title, body, read flag, category, priority, CTA link.
* `emailQueue/{queueId}`: Outbox queue items with status (`pending`, `sent`, `failed`), retryCount, nextRetryAt.
* `userModeration/{uid}`: Moderation state (`ACTIVE`, `BANNED`, `PENDING_DELETION`), reason, expiry.
* `organizations/{orgId}`: Tenant configuration, visibility, verification badge, member counts.

---

## 13. Data Flow

```
[User Submits Code on /problems/[pid]]
                 │
                 ▼
1. SubmissionContext creates submissions/{submissionId} with status = "submitting"
                 │
                 ▼
2. Client issues POST /api/submit with Bearer Token
                 │
                 ▼
3. withAuthAndModeration verifies ID token and checks ban status
                 │
                 ▼
4. Server calls runCode() in src/pages/api/run.ts:
   - Spawns subprocess in /sys/fs/cgroup/beastcode-sandbox/run-{runId}
   - Falls back to Judge0 batch API if sandbox unavailable
   - Emits progress updates back to Firestore submission document
                 │
                 ▼
5. Server executes atomic Firestore transaction:
   - Checks if problem previously solved
   - Increments solved problem counters and recalculates XP & Tier
   - Updates problem attempts and solved counters
   - Marks submission status = "passed"|"failed", isTerminal = true
                 │
                 ▼
6. Client onSnapshot receives terminal state -> fires Confetti on Accepted
```

---

## 14. Authentication

* **Engine:** Firebase Authentication v9 client paired with Firebase Admin SDK v13 server.
* **White-Label Proxy:** `next.config.js` rewrites `/__/auth/:path*` to `https://beastcode-7555e.firebaseapp.com/__/auth/:path*`.
* **Password Reset:** Branded flow generating 64-byte SHA-256 tokens stored in `passwordResetTokens` with 1-hour expiration; revokes all refresh tokens upon successful reset.
* **Session Tracking:** Periodic heartbeat (120s) registers active sessions in `activeSessions` with IP, country, and User-Agent details.

---

## 15. Authorization and Permissions

* **System Roles:** Guest, Unverified User, Verified User, Suspended User, Super Admin.
* **Tenant Roles ([`src/utils/orgPermissions.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/orgPermissions.ts)):** Owner, Admin, Problem Setter / Coach, Member / Student.
* **Permission Enforcement:** Handled at client route level (`GlobalAuthAndProfileCheck`), API middleware (`withAuthAndModeration`, `withAdminGuard`), and database rules (`firestore.rules`).

---

## 16. User Roles

* **Guest:** Browses problem set, public threads, contest countdowns, rankings.
* **Verified User:** Submits code, registers for contests, posts threads, joins organizations.
* **Suspended User:** Restricted to `/suspended` and `/account-appeal`; all mutation APIs return 403.
* **Super Admin:** Manages global problems, contests, moderation actions, and user accounts.

---

## 17. Main Features

* **Multi-Language Online Judge:** JavaScript, Python 3, C++, C, Java with resource caps (Memory, CPU, Output).
* **ICPC Contest Engine:** Real-time standings, freeze periods, time penalties, virtual mode.
* **Anti-Cheat Proctoring:** Fullscreen lock, window blur and tab-switching violation counters.
* **Enterprise Multi-Tenancy:** University rosters, homework assignments, corporate job boards, private coding gym.
* **Community Forum:** Threaded comments, rich media, interactive polls, problem cards.

---

## 18. User Journeys

* **Competitive Programmer:** Browse problem -> Code in CodeMirror -> Run against samples -> Submit -> View scorecard -> Earn XP -> Rank up.
* **Contestant in Proctored Exam:** Enter contest -> Agree to proctoring -> Fullscreen mode -> Solve problems under timer -> Anti-cheat alerts on tab switch -> Submissions scored with ICPC penalties.

---

## 19. Business Logic

* **XP Formula:**
  $$\text{XP} = (E \times 1) + (M \times 3) + (H \times 7) + (ML \times 10) + (CP \times 5) + (CW \times 20)$$
* **Tiers:** Newbie (0), Beginner (5), Apprentice (15), Intermediate (30), Advanced (50), Expert (85), Master (130), Grandmaster (190), Legend (270), Mythic (370).
* **Account Security Score:** Base 50 + EmailVerified (20) + MFA (20) + UpdatedPassword (10) + OAuthLinked (10) = 100 Max.

---

## 20. Algorithms

* **ICPC Standings Engine ([`src/utils/leaderboardCalc.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/leaderboardCalc.ts)):**
  $$\text{Penalty} = \max(0, \lfloor (T_{\text{submission}} - T_{\text{start}}) / 60000 \rfloor) + (\text{incorrectAttempts} \times 20)$$
* **Clock Sync Calibration ([`src/utils/contestStatusService.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/contestStatusService.ts)):** Calculates round-trip network latency to compute accurate server time offset.

---

## 21. AI / Machine Learning Components

* Dedicated Machine Learning difficulty tier (`difficulty: "ml"`) awarded **10 XP** per solve.
* Specialized ML Execution Profile (60s timeout, 2GB RAM, 1MB output, 2 CPUs).
* Remote execution support on `extra-ce.judge0.com` with Python 3.12 + NumPy.

---

## 22. Search System

* Search interface in [`src/pages/search.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/search.tsx) querying problems, tags, threads, and users.
* Topic filter pills on the homepage: Arrays, Two Pointers, Dynamic Programming, Graphs, Trees, Strings, Math, Binary Search, Sorting.

---

## 23. File Handling

* Upload handler in [`src/pages/api/attachments.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/attachments.ts).
* Prevents directory traversal attacks via path normalization and category whitelisting (`avatars`, `evidence`, `appeals`).
* Authorizes file retrieval based on user ownership or admin role.

---

## 24. Notification System

* Multi-channel router in [`src/utils/notificationDispatcher.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/notificationDispatcher.ts).
* Dispatches in-app notifications and queues transactional emails.
* Checks global opt-outs and user category preferences.

---

## 25. Email System

* Nodemailer transport using Gmail SMTP or Ethereal test mock ([`src/utils/emailService.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/emailService.ts)).
* Outbox queue pattern with exponential retry backoff (Max 3 retries).

---

## 26. Payments and Monetization

* Stripe checkout integration for infrastructure donations ([`src/pages/api/create-checkout-session.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/create-checkout-session.ts)).

---

## 27. Admin System

* Single-page administrative dashboard ([`src/pages/admin/index.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/admin/index.tsx)).
* Modules: System Overview, Problem Catalog, Contest Manager, Moderation Panel, Organization Verification, Email Queue Monitor.

---

## 28. Security Analysis

* **Strengths:** SHA-256 hashed password reset tokens and verification codes; atomic transactions preventing double-scoring; cgroups v2 process isolation; strict path traversal defenses.
* **Risks:** Hardcoded admin emails in rules/code; unauthenticated queue trigger endpoint; in-memory serverless rate-limiting.

---

## 29. Privacy Analysis

* User privacy settings allow hiding student institutional data from public profiles.
* 14-day delayed account deletion workflow complying with user data removal requests.

---

## 30. Error Handling

* Server routes wrapped with `withApiErrorHandler` suppressing raw system errors in production.
* Client React `ErrorBoundary` catching component crashes.
* Compiler error sanitization stripping internal paths.

---

## 31. Logging and Observability

* Production console log filtering in `_app.tsx`.
* Firestore audit collections: `securityLogs`, `moderationLogs`, `contest_integrity_events`, `notificationHistory`.

---

## 32. Testing

* **Critical Gap:** No automated unit or E2E test runners (Jest/Vitest/Playwright) declared in `package.json`.
* Standalone manual test scripts available in `scripts/`.

---

## 33. Performance

* Incremental Static Regeneration (ISR) on public problem pages.
* Virtualized DOM rendering in community threads feed.
* Client-side canvas image compression before upload.
* Redis caching for active contest standings.

---

## 34. Scalability

* Cloud Run auto-scales from 0 to N instances.
* Beyond 10,000 users, in-memory rate limiting should migrate to Redis, and high-write Firestore counters should be sharded.

---

## 35. Reliability

* Dual-path execution fallback (Cgroups v2 -> Judge0).
* Redis cache fallback to direct Firestore calculation.
* SMTP transport fallback to Ethereal mock.

---

## 36. Concurrency and Race Conditions

* Atomic Firestore transactions ensure solved problem counters and XP are never double-awarded.
* Contest standings dirty-flags coalesce rapid submissions into single calculations.

---

## 37. Configuration

* Environment configuration via `apphosting.yaml` and `.env.local`.
* Production secrets secured via Google Cloud Secret Manager.

---

## 38. Dependencies

* Well-structured production dependencies: Next.js 13, Firebase 9/13, CodeMirror 6, Recoil, ioredis, Nodemailer, Stripe.

---

## 39. Build System

* Next.js compiler with SWC transpilation and minification.
* Standard npm scripts: `dev`, `build`, `start`, `lint`.

---

## 40. Development Workflow

* Clone repository, run `npm install`.
* Create `.env.local` from `.env.example`.
* Run `npm run dev`. Platform runs in offline mock mode if private keys are absent.

---

## 41. Deployment

* Deployed on Firebase App Hosting (Google Cloud Run).
* Automated builds triggered via GitHub repository branch pushes.

---

## 42. CI/CD

* Continuous deployment handled by Firebase App Hosting.
* Needs automated testing step added before deployment triggers.

---

## 43. Database Cost Analysis

* Firestore reads optimized through ISR, Redis standings caching, and throttled execution progress writes.

---

## 44. Cloud Cost Analysis

* Primary cost drivers: Cloud Run container CPU/RAM, Firestore document operations, and outbound network bandwidth.

---

## 45. Code Quality

* High degree of type safety and clean utility abstractions.
* Opportunities for refactoring large monolithic page files.

---

## 46. Technical Debt

* Lack of automated tests (Critical).
* 5,186-line organization file needing component decomposition (High).
* Hardcoded super-admin email list (High).
* In-memory serverless rate limiting (Medium).

---

## 47. Incomplete Features

* WebRTC video integration for live technical interview rooms in organizations.
* Advanced execution limits (cpuCount, diskLimitMb) marked for future multi-node clusters.

---

## 48. Dead Code

* Legacy `replies` array in thread schema superseded by `parentThreadId`.
* Legacy `/verify-email.tsx` route redirecting to `/auth/verify-email.tsx`.

---

## 49. Duplication

* Super-admin email list duplicated in `firestore.rules` and `withAdminGuard.ts`.
* Organization API endpoints split across `/api/organizations` and `/api/orgs`.

---

## 50. Naming and Organization Problems

* Consolidate duplicate organization routes under a unified `/api/organizations/[idOrSlug]` structure.

---

## 51. UI/UX Analysis

* Consistent dark-mode aesthetic with brand orange accents and glassmorphism.
* Interactive feedback states: loading skeletons, progress bars, celebration confetti.

---

## 52. Accessibility

* Clear focus states and semantic form inputs.
* Needs additional `aria-label` attributes on icon-only buttons.

---

## 53. Mobile Responsiveness

* Responsive workspace automatically collapses split panes into tabbed navigation on screens $< 768\text{px}$.

---

## 54. SEO

* Configured OpenGraph metadata, title tags, and descriptions via Next.js `Head`.

---

## 55. Analytics

* Google Analytics 4 integration (`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`).
* Internal structured audit logging in Firestore.

---

## 56. Major Workflows

* Detailed line-by-line flow tracking for registration, lazy provisioning, problem execution, submission grading, and contest proctoring.

---

## 57. State Machines

* Contest state transitions: `draft` ➔ `scheduled` ➔ `registration_open` ➔ `running` ➔ `frozen` ➔ `ended` ➔ `archived`.
* Submission progression: `idle` ➔ `submitting` ➔ `queued` ➔ `compiling` ➔ `running` ➔ `evaluating` ➔ `completed`.

---

## 58. Edge Cases

* Clock drift calibration between client and server.
* Automatic lifting of expired temporary user suspensions.
* Idempotent user provisioning preventing account overwrite.
* Offline local development with in-memory mock databases.

---

## 59. Failure Scenarios

* Graceful handling of database disconnects, Judge0 timeouts, and SMTP transporter failures.

---

## 60. Developer Experience

* Fast setup, comprehensive TypeScript definitions, and offline mock support.

---

## 61. Project Strengths

* Robust dual-path code execution sandbox.
* Comprehensive ICPC contest management and browser proctoring.
* Enterprise-grade academic and corporate multi-tenancy.
* Decoupled lazy provisioning and transactional outbox email queue.

---

## 62. Project Weaknesses

* Absence of automated test suites.
* Hardcoded admin emails.
* Monolithic component file sizes.

---

## 63. Highest-Risk Areas

1. Regression in grading or scoring logic (High).
2. Unauthenticated outbox queue processor endpoint (High).
3. In-memory rate limiting in serverless environments (Medium).
4. Super-admin email whitelist drift (Medium).

---

## 64. Highest-Priority Improvements

1. Secure `/api/notifications/process-queue` with a secret key.
2. Add Vitest unit test suite for scoring and sandboxing formulas.
3. Decompose `src/pages/orgs/[slug].tsx` into modular sub-components.
4. Migrate super-admin authorization to Firebase Custom Claims.

---

## 65. Refactoring Roadmap

* **Phase 1 (Stability):** Add Vitest tests and secure cron endpoints.
* **Phase 2 (Security):** Implement Firebase Custom Claims and Redis rate limiting.
* **Phase 3 (Architecture):** Decompose monolithic files and consolidate organization routes.
* **Phase 4 (Scale):** Shard high-write Firestore counters and implement edge caching.

---

## 66. Feature Roadmap

* Google Genkit AI algorithmic code hints.
* WebRTC live video proctoring for contests and interviews.
* Front-end HTML/CSS/JS interactive problem playgrounds.

---

## 67. Production Readiness

* **Overall Score:** **86 / 100**
* Strong marks in Architecture (92), UX (94), and Deployment (92); primary gap is Testing (40).

---

## 68. New Developer Onboarding Guide

* Clear guide on sandbox mechanics, lazy provisioning, running locally with offline mocks, and adding new problems.

---

## 69. AI-Agent Onboarding Guide

* Rules for future coding agents: preserve in-memory mock store, always wrap API routes with error handlers, maintain lazy provisioning architecture, and preserve sandbox isolation flags.

---

## 70. Glossary

* Key definitions: BeastCode, Lazy Provisioning, Scoreboard Freeze, Judge0, ICPC Penalty, cgroups v2.

---

## 71. Important File Index

* Cross-reference table highlighting key files: `_app.tsx`, `run.ts`, `submit.ts`, `firebaseAdmin.ts`, `firestore.rules`, `leaderboardCalc.ts`, `emailService.ts`, `orgs/[slug].tsx`.

---

## 72. Dependency Map

* Complete dependency tree linking UI workspace components down to backend execution runners and database transactions.

---

## 73. Full System Mental Model

* Conceptual narrative tracing the entire platform lifecycle from browser loading to code grading, state mutation, and outbox delivery.

---

## 74. "If I Were Taking Over This Project" Section

* 10 strategic priorities from a Lead Engineer's perspective: automated tests, component decomposition, custom claims RBAC, secured queue endpoints, and distributed counter sharding.

---

## 75. Final Comprehensive Assessment

* BeastCode represents a high-caliber competitive programming platform. Its architectural resilience, security controls, and enterprise feature set position it well for academic and commercial scaling once automated test coverage and component modularity are addressed.
