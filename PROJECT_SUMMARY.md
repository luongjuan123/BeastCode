# BeastCode Platform: Comprehensive Technical Reference & Practical Handover Specification

> **Document Type:** Production Architecture Audit, Systems Reference, and Practical Handover Specification  
> **Repository:** `leetcode-clone-youtube` (`leetcode-yt` v0.1.0)  
> **Canonical Target File:** [`PROJECT_SUMMARY.md`](file:///home/juan/Work%20Space/leetcode-clone-youtube/PROJECT_SUMMARY.md)  
> **Inspection Date:** September 28, 2026  
> **Inspected Git Revision:** `abca62627c2b62595f0f1c25307ca173dcff3b52` (Branch: `master`, Tracking: `origin/master`, Diverged by 8 and 1 commits with `upstream/master`)  
> **Working Tree Status:** Unstaged modifications in `scripts/ml-problem-generator/` and `scripts/seed-*.ts`; Untracked generator scripts and hyperparameter specifications in `scripts/`  
> **Production Target Host:** [`https://www.bomboclatbeastcode.codes`](https://www.bomboclatbeastcode.codes) (Firebase App Hosting / Google Cloud Run Project: `beastcode-7555e`)  
> **Primary Authors / Maintainers:** Juan Luong (`luongjuan123`) & Collaborators  

---

## Table of Contents

1. [Executive Overview and Project Identity](#1-executive-overview-and-project-identity)
2. [Problem, Users, Scope, and Domain Concepts](#2-problem-users-scope-and-domain-concepts)
3. [Repository and Technology Map](#3-repository-and-technology-map)
4. [System Architecture and Component Relationships](#4-system-architecture-and-component-relationships)
5. [Feature Inventory and Implementation Status](#5-feature-inventory-and-implementation-status)
6. [Detailed Workflow Walkthroughs](#6-detailed-workflow-walkthroughs)
   - 6.1 Code Execution and Authoritative Submission Grading Pipeline
   - 6.2 ICPC-Style Contest Management, Live Standings, and Anti-Cheat Proctoring
   - 6.3 Multi-Tenant Institutional Workspaces (Universities and Corporations)
   - 6.4 Real-Time Chat & Multimedia Messaging Subsystem
   - 6.5 Authentication, Idempotent Account Provisioning, and Onboarding Coordinator
   - 6.6 Community Discussions, Moderation Escalation, Suspension, and Appeals
7. [Frontend and User-Facing Interface](#7-frontend-and-user-facing-interface)
8. [Backend, Services, APIs, and Event Contracts](#8-backend-services-apis-and-event-contracts)
9. [Data Model, Persistence, and Cloud Firestore Schema](#9-data-model-persistence-and-cloud-firestore-schema)
10. [Core Algorithms and Distinctive Technical Logic](#10-core-algorithms-and-distinctive-technical-logic)
11. [Machine Learning and AI Components](#11-machine-learning-and-ai-components)
12. [Hardware, Robotics, and Embedded Components](#12-hardware-robotics-and-embedded-components)
13. [Authentication, Authorization, and Trust Boundaries](#13-authentication-authorization-and-trust-boundaries)
14. [Reliability, Performance, and Operational Behavior](#14-reliability-performance-and-operational-behavior)
15. [Configuration, Setup, Build, and Deployment](#15-configuration-setup-build-and-deployment)
16. [Tests, Validation, and Quality Evidence](#16-tests-validation-and-quality-evidence)
17. [Design Decisions, Constraints, and Tradeoffs](#17-design-decisions-constraints-and-tradeoffs)
18. [Current Limitations, Defects, and Unfinished Work](#18-current-limitations-defects-and-unfinished-work)
19. [Prioritized Next Steps and Practical Handover](#19-prioritized-next-steps-and-practical-handover)
20. [Unknowns, Source Index, and Coverage Statement](#20-unknowns-source-index-and-coverage-statement)
21. [Compact Context for a Future Developer or AI Agent](#21-compact-context-for-a-future-developer-or-ai-agent)

---

## 1. Executive Overview and Project Identity

### 1.1 What the Project Is
**BeastCode** (registered in [`package.json`](file:///home/juan/Work%20Space/leetcode-clone-youtube/package.json#L2) under the project name `leetcode-yt` at version `0.1.0`) is a full-stack, enterprise-grade online judge, competitive programming, and institutional educational management platform. Built upon Next.js 13 (Pages Router), TypeScript 5, Tailwind CSS, Google Cloud Firestore, Redis, and Firebase Authentication, BeastCode transcends simple educational coding practice by implementing:
- A dual-path sandboxed code execution engine (local Linux kernel namespaces and cgroups v2 with remote Judge0 CE / Extra-CE cluster fallback).
- An authoritative ICPC-style timed contest proctoring subsystem with client-side anti-cheat enforcement (fullscreen locks, focus blur tracking, and automatic termination).
- A multi-tenant institutional workspace architecture supporting university departments and enterprise recruiters (custom roles, permissions, roadmaps, gradebooks, assessments, and verifiable certificates).
- A comprehensive real-time chat and multimedia messaging subsystem (direct messaging, organization channels, voice notes, attachments, reactions, and pinning).
- An algorithmic and machine learning problem generation pipeline capable of synthesizing, parameterizing, and seeding hundreds of problems with mathematical hyperparameter specifications.
- A threaded community forum with rich media embeds and polls.
- A complete transactional email and notification queuing pipeline.

### 1.2 Core Problem Addressed
Standard educational code assessment tools and toy clones suffer from critical architectural weaknesses:
1. **Unsafe or Naive Execution:** Untrusted user code is frequently evaluated in unconstrained host runtimes or entirely outsourced to public third-party APIs without fallback mechanisms, memory isolation, or specialized Python ML environments.
2. **Lack of Institutional Tenancy:** Educational institutions and technical recruiters are forced to stitch together disjoint tools for homework curation, classroom management, candidate screening, proctored exams, and student gradebook tracking.
3. **Contest Integrity Vulnerabilities:** Standard platforms lack browser proctoring to detect window switching, tab unfocusing, and fullscreen exits during high-stakes assessments.
4. **Grading Testcase Leakage:** Naive Next.js implementations often expose confidential test cases and reference solutions in client-side bundles or `__NEXT_DATA__`.
5. **Rigid Onboarding:** Inflexible user profiles trap non-student competitive programmers in mandatory university-cohort setups.

BeastCode directly solves these challenges through:
- A **Dual-Path Sandboxed Judge Engine** combining local Linux kernel namespaces (`unshare --fork --pid --net --mount`) and control groups (`cgroups v2`) with remote Judge0 CE / Extra-CE cluster fallback.
- An **Authoritative Multi-Tenant Organization Suite** supporting custom roles, courses, roadmaps, gradebooks, assessments, and verifiable certificate issuance.
- **Client-Side Anti-Cheat Proctoring** with fullscreen lock, window-blur counters, and automatic session disqualification.
- Strict **Data Sanitization and Tiered Loaders** (`getPublicProblem` vs `getProblemForGrading`) that permanently strip confidential grading test cases from public client DTOs.
- An **Adaptive Onboarding Coordinator** (`src/utils/onboarding.ts`) that smoothly distinguishes student candidates, competitive programmers, and legacy accounts.

### 1.3 Project Type and Maturity Assessment
- **Project Type:** Monolithic Full-Stack Web Application (Next.js Pages Router with hybrid client-side Firebase SDK and server-side Firebase Admin SDK API routes).
- **Maturity Level:** **Late Stage Production Ready / Active Enhancement Phase**.
  - *Basis for Maturity Rating:* Core authentication, problem viewing, code execution, ICPC contest management, multi-tenant organizations, and real-time chat are fully functional in code and backed by extensive automated regression and integration suites (`tests/chat/`, `scripts/run-chat-tests.ts`, `scripts/verify-auth-lifecycle.ts`). The codebase compiles with zero TypeScript errors (`tsc --noEmit` = 0) and passes ESLint (`npm run lint` = 0 errors).
  - *Active Enhancements:* The working tree includes newly developed generative problem suites (`scripts/ml-problem-generator/`, `scripts/linear-regression-generator/`, `scripts/model-training-generator/`, `scripts/specs/`) designed to scale the platform's machine learning problem catalog to over 300 problems.

### 1.4 Current Inspection Context
- **Inspected Git Commit:** `abca62627c2b62595f0f1c25307ca173dcff3b52` (Commit message: `add new feature, fix stuff`, Date: Sat Sep 26 11:49:24 2026 +0700).
- **Working Tree Delta:** Unstaged modifications in generator scripts (`scripts/ml-problem-generator/categories/classification.ts`, `clustering.ts`, `regression.ts`, `scripts/seed-100-ml-problems.ts`, `scripts/seed-100-story-problems.ts`) and 10 untracked generator scripts/directories (`scripts/linear-regression-generator/`, `scripts/model-training-generator/`, `scripts/specs/`, etc.).
- **Production URL:** `https://www.bomboclatbeastcode.codes` hosted on Firebase App Hosting (Google Cloud Run backend).

### 1.5 What a New Contributor Must Understand First
1. **Never import `firebase-admin` into client components.** Client-side code must use [`src/firebase/firebase.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/firebase/firebase.ts). Server-side API routes and loaders must use [`src/firebase/firebaseAdmin.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/firebase/firebaseAdmin.ts).
2. **Never expose full problem objects to client props.** Always use [`getPublicProblem`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts#L123) in page endpoints (`getStaticProps`, `getServerSideProps`). Only [`getProblemForGrading`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts#L17) within server-side `/api/submit` may access secret grading test cases.
3. **Admin privileges are strictly verified.** A claim in `users/{uid}.isAdmin` is treated as untrusted metadata. Authoritative admin authority requires membership in `/platformAdmins/{uid}` (`active === true`) or cryptographically verified Firebase Custom Claims checked via [`verifyPlatformAdmin`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/withAdminGuard.ts#L10).
4. **Firestore Security Rules enforce participant-level access.** The chat and messaging subsystem restricts conversation reads and updates via `isConversationParticipant`.

---

## 2. Problem, Users, Scope, and Domain Concepts

### 2.1 Concrete Problems Solved
- **Online Judging with ML Support:** Traditional judges only support standard C++, Java, or basic Python. BeastCode supports Python with NumPy, SciPy, and ML modules via a specialized Judge0 Extra-CE cluster (`https://extra-ce.judge0.com`), with local Linux sandbox fallback.
- **Cheating in Remote Contests:** Unproctored web judges permit students to copy code from other tabs or LLM chats. BeastCode integrates a client-side integrity watcher that captures blur events, window switches, and fullscreen exits, logging them to `contest_integrity_events` and automatically disqualifying repeat offenders.
- **Classroom and Enterprise Management:** Educational institutions need private problem repositories, student rosters, automated assignments, and verifiable completion certificates, all integrated with the judge.

### 2.2 System Actors and User Roles
```
+───────────────────────────────────────────────────────────────────────────────────+
|                                    ACTORS                                         |
+───────────────────────────────────────────────────────────────────────────────────+
| 1. Unauthenticated Guest   : Public problem list, static problem views, auth UI   |
| 2. Authenticated Solver    : Code execution, submission grading, chat, profile    |
| 3. Contest Participant     : Timed contest environment, anti-cheat proctoring     |
| 4. Org Member / Student    : Institutional roadmaps, assignments, courses, grade  |
| 5. Org Instructor / Coach  : Classroom assignments, private problem authoring     |
| 6. Org Administrator       : Member invites, team assignments, roles, settings    |
| 7. Org Owner               : Workspace management, org deletion, full ownership   |
| 8. Platform Administrator  : Problem authoring, contest setup, moderation, bans   |
| 9. Super Administrator     : Permanent account deletion, admin promotion/revoking |
| 10. Automated Cron System  : Standings recalculation, notification queue dispatch  |
+───────────────────────────────────────────────────────────────────────────────────+
```

### 2.3 Domain Concepts and Vocabulary
- **Problem:** An algorithmic or machine learning challenge. Can be *Static* (bundled in `src/utils/problems/`), *Dynamic* (stored in Firestore `/problems/{pid}`), or *Private* (stored in `/organizations/{id}/private-problems/{pid}`).
- **Sample vs Hidden Testcase:** Samples (`isSample: true`) are visible to users in the problem description and playground. Hidden testcases are accessible strictly server-side by `/api/submit` for authoritative verdict evaluation.
- **Execution Profile:** A preset resource limit (`fast`, `normal`, `long`, `machine_learning`) defining CPU timeout (ms), memory limit (MB), max output size, and process limits (`src/utils/executionProfiles.ts`).
- **Contest Submission vs Standard Submission:** Standard submissions go to `/submissions/{id}` and award XP/score to the user profile. Contest submissions go to `/contest_submissions/{id}` during active contests and feed the live ICPC standings calculation.
- **Integrity Event:** An anti-cheat telemetry entry recorded in `/contest_integrity_events/{id}` capturing `fullscreen_exit`, `tab_switch`, or focus loss, carrying timestamps, user UIDs, and escalation counts.
- **Conversation:** A chat entity in `/conversations/{cid}`. Direct messages use deterministic IDs (`dm_${minUid}_${maxUid}`). Organization channels use `org_${orgId}_${channelId}`.
- **Onboarding State:** Tracked via `isOnboarded: boolean` in `users/{uid}`. Distinct from university profile completeness (`isStudent`, `school`, `studentId`, `faculty`, `class`).

---

## 3. Repository and Technology Map

### 3.1 Directory and Package Map

| Path | Responsibility | Important Symbols / Entry Points | Related Components |
|---|---|---|---|
| [`src/pages/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages) | Next.js Pages router endpoints | `_app.tsx`, `index.tsx`, `profile.tsx`, `settings.tsx` | UI layouts, Topbar |
| [`src/pages/problems/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/problems) | Problem workspace and submissions | `[pid].tsx`, `[pid]/submissions/[submissionId].tsx` | Workspace, CodeMirror |
| [`src/pages/contests/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/contests) | Contest hub, live contest, and proctoring | `[cid]/index.tsx`, `[cid]/problems/[pid].tsx` | Anti-cheat, Leaderboard |
| [`src/pages/orgs/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/orgs) | Multi-tenant organization suite | `index.tsx`, `[slug].tsx`, `invite/[linkId].tsx` | `orgEngine.ts`, Gradebook |
| [`src/pages/messages/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/messages) | Real-time chat application | `index.tsx`, `[cid].tsx` | `ChatShell.tsx`, `useMessages.ts` |
| [`src/pages/admin/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/admin) | Platform administration dashboard | `index.tsx`, `moderation.tsx`, `notifications.tsx` | `withAdminGuard.ts` |
| [`src/pages/api/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api) | Serverless backend API handlers | `run.ts`, `submit.ts`, `leaderboard.ts` | Firebase Admin SDK, Redis |
| [`src/pages/api/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/chat) | Chat API endpoints | `conversations/index.ts`, `attachment.ts`, `upload.ts` | Firestore Admin, Storage |
| [`src/pages/api/organizations/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/organizations) | Multi-tenant org API endpoints | `index.ts`, `[id]/members/`, `[id]/courses/` | `orgEngine.ts` |
| [`src/components/Chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Chat) | Real-time messaging UI components | `ChatShell.tsx`, `MessageList.tsx`, `MessageComposer.tsx` | `useMessages.ts`, CodeSnippet |
| [`src/components/Workspace/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Workspace) | Split coding workspace & editor | `Workspace.tsx`, `Playground/Playground.tsx` | CodeMirror 6, Split.js |
| [`src/components/Modals/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Modals) | Auth, Onboarding, and dialog modals | `ProfileSetupModal.tsx`, `Login.tsx`, `Signup.tsx` | Recoil `authModalAtom` |
| [`src/firebase/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/firebase) | Client & Admin Firebase SDK init | `firebase.ts`, `firebaseAdmin.ts` | Firestore, Auth, Storage |
| [`src/hooks/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/hooks/chat) | Reactive chat state hooks | `useConversations.ts`, `useMessages.ts`, `useTyping.ts` | Firestore real-time listeners |
| [`src/utils/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils) | Core engines, loaders, security utilities | `problemLoader.ts`, `orgEngine.ts`, `authMiddleware.ts` | `withAdminGuard.ts`, `redis.ts` |
| [`scripts/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts) | Generator scripts, migrations, QA test runners | `run-chat-tests.ts`, `seed-100-ml-problems.ts` | Playwright, ExcelJS, tsx |
| [`tests/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/tests/chat) | Comprehensive chat QA test suite | `manifest.ts`, `chatApi.test.ts`, `chatE2E.test.ts` | Playwright, Excel report |

### 3.2 Technology Stack Breakdown

```mermaid
graph TD
    subgraph Client [Browser / Frontend]
        NextPages[Next.js 13 Pages Router]
        ReactUI[React 18.2 + Tailwind CSS]
        CM6[CodeMirror 6 Editor]
        RecoilState[Recoil State Atoms]
        FirebaseClient[Firebase Client SDK v9]
    end

    subgraph Server [Backend / Next.js API Routes]
        APIHandler[Next.js API Route Handlers]
        AdminAuth[Firebase Admin Auth verifyIdToken]
        AdminDB[Firebase Admin Firestore]
        AdminStorage[Google Cloud Storage]
        RedisCache[ioredis v5 Cache & Queue]
        Mailer[Nodemailer SMTP]
    end

    subgraph Judge [Execution Subsystem]
        LocalJudge[Local Linux Sandbox unshare + cgroups v2]
        Judge0Remote[Remote Judge0 CE / Extra-CE Clusters]
    end

    Client -->|HTTPS / REST| Server
    FirebaseClient -->|Direct Snapshot Listener| AdminDB
    APIHandler --> AdminAuth
    APIHandler --> AdminDB
    APIHandler --> AdminStorage
    APIHandler --> RedisCache
    APIHandler --> Mailer
    APIHandler -->|Run Code / Submit| Judge
    Judge -->|Fallback| Judge0Remote
```

- **Runtime & Framework:** Node.js v18 / v20 / v24 compatible; Next.js 13.2.4 (Pages Router).
- **Languages:** TypeScript 5.0.2 (strict configuration in `tsconfig.json`).
- **Styling & Design System:** Tailwind CSS 3.2.7 with CSS variable theme tokens (Dark, Surface, Brand Orange `#f59e0b`, elevated layers).
- **Code Editor:** `@uiw/react-codemirror` (v4.19.16) with language extensions for C++, Java, JavaScript, Python.
- **State Management:** Recoil 0.7.7 (`authModalAtom`, `executionStateAtom`, `ratingFeedbackAtom`).
- **Primary Database:** Google Cloud Firestore (multi-region/regional database `beastcode-7555e`).
- **Caching & Ephemeral Storage:** Redis 5.11.1 (`ioredis`) for session rate limits, standings caching, and notification queueing.
- **Object Storage:** Google Cloud Storage / Firebase Storage bucket (`beastcode-media-348293518232`).
- **Authentication:** Firebase Authentication with email/password, password reset flows, and custom admin claims.
- **Code Execution:**
  - *Local:* Node child processes wrapped in Linux `unshare --fork --pid --net --mount` with cgroups v2 resource capping.
  - *Remote:* Public & self-hosted Judge0 CE (`https://ce.judge0.com`) and Judge0 Extra-CE (`https://extra-ce.judge0.com`).
- **Email Delivery:** Nodemailer 8.0.11 connected to SMTP (Gmail or custom SMTP server).
- **Payments:** Stripe SDK (`stripe` v22.2.0, `@stripe/stripe-js` v9.8.0).
- **Testing & Tooling:** Playwright 1.63.0, ExcelJS 4.4.0, tsx 4.23.15, ESLint 8.36.0.

---

## 4. System Architecture and Component Relationships

### 4.1 Boundary Analysis
1. **Browser vs Server Boundary:**
   - Client pages communicate with Next.js API routes (`/api/*`) via standard JSON HTTPS requests.
   - For real-time updates (chat messages, live contest standings, threads), the browser establishes direct Firestore `onSnapshot` subscriptions using the Firebase Client SDK.
   - All direct client Firestore reads/writes are governed by [`firestore.rules`](file:///home/juan/Work%20Space/leetcode-clone-youtube/firestore.rules).
2. **Application vs Database Boundary:**
   - Server-side API routes use the Firebase Admin SDK (`getAdminFirestore()`), which bypasses Firestore security rules.
   - Authorization on API routes is enforced in application code via [`withAuthAndModeration`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/authMiddleware.ts#L22) and [`withAdminGuard`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/withAdminGuard.ts#L59).
3. **Data Sanitization Boundary:**
   - Client DTOs never receive secret testcases. [`getPublicProblem`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts#L123) filters problem examples to only return 1–3 public samples (`isSample: true`).
   - The authoritative grading suite is exclusively loaded server-side by [`getProblemForGrading`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts#L17) in `/api/submit`.

---

## 5. Feature Inventory and Implementation Status

The table below reflects observed source implementation and verified test execution across the platform:

| Feature / Subsystem | Implementation Status | Verification Evidence | Key Source Locations | Known Gaps / Constraints |
|---|---|---|---|---|
| **Code Execution (Run)** | Implemented | Source Inspected & Runtime Verified | [`src/pages/api/run.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/run.ts) | Local sandbox requires Linux root/cgroup privileges; falls back to unjailed in dev or Judge0 in prod. |
| **Authoritative Grading (Submit)** | Implemented | Source Inspected & Runtime Verified | [`src/pages/api/submit.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/submit.ts), [`problemLoader.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts) | Serverless execution time limit requires batching testcases in chunks of 20. |
| **Problem Catalog & Tags** | Implemented | Source Inspected & Tested | [`src/pages/index.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/index.tsx), [`src/pages/api/problem-tags.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/problem-tags.ts) | Tag validation in Firestore rules limits problems to at most 3 registered tags. |
| **ICPC Contest Subsystem** | Implemented | Source Inspected & Schema Verified | [`src/pages/contests/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/contests), [`calculate-standings.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/cron/calculate-standings.ts) | Cron standings calculation requires secret bearer token (`CRON_SECRET`). |
| **Anti-Cheat Proctoring** | Implemented | Source Inspected & Runtime Logged | [`src/pages/contests/[cid]/problems/[pid].tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/contests/%5Bcid%5D/problems/%5Bpid%5D.tsx#L306) | Can be bypassed if JavaScript event listeners are suppressed or mobile browser emulation is used. |
| **Multi-Tenant Organizations** | Implemented | Source Inspected & Schema Verified | [`src/pages/orgs/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/orgs), [`src/utils/orgEngine.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/orgEngine.ts) | 23 system permissions, 7 hierarchical roles, roadmaps, gradebooks, assessments, and certificate generation. |
| **Real-Time Chat & Messaging** | Implemented | **66/67 Automated QA Tests Passed** (`reports/chat/`) | [`src/pages/messages/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/messages), [`src/components/Chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Chat), [`src/pages/api/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/chat) | **Defect `CHAT-PERM-003`**: Firestore rules allow outsider to insert messages directly into arbitrary conversations. |
| **Voice & Media Attachments** | Implemented | Source Inspected & API Verified | [`src/pages/api/chat/attachment.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/chat/attachment.ts), [`src/components/Chat/VoiceRecorder.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Chat/VoiceRecorder.tsx) | Client-side media recording requires browser Web Audio / MediaRecorder API support. |
| **Authentication & Onboarding** | Implemented | **100% Passed** in `verify-auth-lifecycle.ts` | [`src/utils/onboarding.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/onboarding.ts), [`ProfileSetupModal.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Modals/ProfileSetupModal.tsx), [`_app.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/_app.tsx) | Legacy user fallback properly implemented; academic fields optional for non-students. |
| **Admin Authorization Guard** | Implemented | **100% Passed** in `test-authorization-security.mjs` | [`src/utils/withAdminGuard.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/withAdminGuard.ts), [`scripts/manage-platform-admin.mjs`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/manage-platform-admin.mjs) | Strict dual verification via `/platformAdmins/{uid}` document and Firebase custom claims. |
| **Moderation, Warnings & Bans** | Implemented | Source Inspected & Schema Verified | [`src/pages/admin/moderation.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/admin/moderation.tsx), [`src/pages/account-appeal.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/account-appeal.tsx) | Full warning accumulation, temporary suspensions with expiration timestamps, and appeal review queue. |
| **Transactional Email Queue** | Implemented | Source Inspected & Template Verified | [`src/pages/api/notifications/process-queue.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/notifications/process-queue.ts), [`src/utils/emailService.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/emailService.ts) | Rate-limited worker processes queue in batches; supports template preview and live test triggers. |
| **ML & Algorithm Problem Gen** | Implemented | Tested across generators | [`scripts/problem-generator/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/problem-generator), [`scripts/ml-problem-generator/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/ml-problem-generator), [`scripts/specs/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/specs) | 300+ problems generated with exact mathematical hyperparameter boxes, formulas, and floating-point tolerances. |
| **Stripe Payments / Donations** | Implemented | Source Inspected | [`src/pages/api/create-checkout-session.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/create-checkout-session.ts), [`process-card-donation.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/process-card-donation.ts) | Webhook fulfillment relies on client-side confirmation or webhook listener configuration. |

---

## 6. Detailed Workflow Walkthroughs

### 6.1 Code Execution and Authoritative Submission Grading Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Solver (Browser)
    participant UI as Workspace Playground
    participant RunAPI as /api/run.ts
    participant SubmitAPI as /api/submit.ts
    participant Loader as problemLoader.ts
    participant DB as Cloud Firestore
    participant Engine as Local Linux Sandbox / Judge0

    User->>UI: Clicks "Run Code"
    UI->>RunAPI: POST { userCode, language, testcases: sampleCases }
    RunAPI->>Engine: Execute sample cases with profile limits
    Engine-->>RunAPI: Execution results (stdout, runtime, status)
    RunAPI-->>UI: Returns RunResult DTO (pass/fail per sample)
    UI-->>User: Displays green/red sample testcase pills

    User->>UI: Clicks "Submit Code"
    UI->>SubmitAPI: POST { uid, problemId, userCode, language, contestId? }
    SubmitAPI->>DB: Create submission record (status: "pending")
    SubmitAPI->>Loader: getProblemForGrading(problemId)
    Loader->>DB: Fetch full examples array (hidden test cases)
    Loader-->>SubmitAPI: Returns complete grading testcase suite
    SubmitAPI->>Engine: Run all grading testcases (batches of 20)
    Engine-->>SubmitAPI: Verdicts (Accepted, WA, TLE, MLE, RE)
    SubmitAPI->>DB: Update submission record (verdict, score, runtime, memory)
    alt Verdict == "Accepted" and not Contest
        SubmitAPI->>DB: Increment user solved count & XP (users/{uid}, solvedProblems/{uid})
    end
    SubmitAPI-->>UI: Returns final SubmissionVerdict
    UI-->>User: Renders submission result modal & confetti if Accepted
```

1. **Trigger & Input:** User writes code in CodeMirror and clicks "Submit". Payload contains `uid`, `problemId`, `userCode`, `language`, and optional `contestId`.
2. **Persistence Entry:** A record is immediately inserted into `/submissions/{id}` (or `/contest_submissions/{id}`) with status `pending`.
3. **Data Boundary:** `/api/submit` invokes `getProblemForGrading(problemId)`. Hidden test cases are loaded into memory and never returned to the caller.
4. **Execution Chunking:** If executing via remote Judge0, testcases are sliced into batches of 20 (`MAX_SUBMISSION_BATCH_SIZE = 20`) to prevent Judge0 HTTP 422 payload rejection. Batches run concurrently via `Promise.all`.
5. **Verdict & Gamification:** If all test cases match expected outputs, verdict is `Accepted`. Firestore updates increment `users/{uid}.score`, `users/{uid}.solvedProblemsCount`, and add the problem ID to `/solvedProblems/{uid}`.

---

### 6.2 ICPC-Style Contest Management, Live Standings, and Anti-Cheat Proctoring

```mermaid
stateDiagram-v2
    [*] --> ActiveExam: Contest Starts & User Enters Problem Page
    
    state ActiveExam {
        [*] --> FullscreenLocked
        FullscreenLocked --> NormalCoding: Window in Focus
        NormalCoding --> BlurDetected: Window Blur / Tab Switch
        BlurDetected --> WarningEscalation: Record Integrity Event
        WarningEscalation --> NormalCoding: Warning Modal Dismissed (< 3 Warnings)
        
        NormalCoding --> FullscreenExited: Fullscreen Exit Detected
        FullscreenExited --> WarningEscalation: Record Fullscreen Violation
    }

    WarningEscalation --> Disqualified: Warnings >= 3 OR Strict Mode Violation
    Disqualified --> TerminatedEmail: Send /api/send-termination-email
    TerminatedEmail --> LockedOut: Participant Status = "terminated"
    LockedOut --> [*]
```

1. **Prerequisites & Entry:** User registers for contest. Upon contest start (`Date.now() >= contest.startTime`), user enters `/contests/[cid]/problems/[pid]`.
2. **Proctoring Activation:** The page enforces `document.documentElement.requestFullscreen()`. It attaches listeners for `visibilitychange`, `window.onblur`, and `fullscreenchange`.
3. **Violation Tracking:**
   - When a blur or tab switch occurs, `triggerSecurityWarning("tab", ...)` fires.
   - Throttled by 2000ms debounce (`lastWarningTimeRef`).
   - A document is written to `/contest_integrity_events` with `type: "tab_switch"` or `"fullscreen_exit"`.
   - `/contest_participants/{cid}_{uid}` updates `warningsCount`.
4. **Disqualification:** If `contest.securityLevel === "strict"` or `warningsCount >= 3`, `terminateUser()` is called:
   - Updates participant status to `"terminated"`.
   - Fires `/api/send-termination-email`.
   - Firestore security rules permanently block further submissions (`contest_participants.status != "terminated"`).
5. **Standings Calculation:** The scheduled cron `/api/cron/calculate-standings.ts` processes `/contest_submissions`, sorts by problems solved descending and ICPC penalty time ascending (submission timestamp + 20-minute penalty per failed submission before Accepted), and writes live ranks to `/contest_leaderboard/{cid}_{uid}`.

---

### 6.3 Multi-Tenant Institutional Workspaces

```mermaid
graph LR
    subgraph Organization Structure
        Org[Organization doc] --> Roles[Organization Roles: Owner, Admin, Coach, Instructor]
        Org --> Members[Organization Members]
        Org --> Hierarchy[University Hierarchy: Faculties, Departments, Classes]
        Org --> Content[Curriculum: Courses, Roadmaps, Assignments]
        Org --> Assessments[Assessments & Private Contests]
    end

    subgraph Access Flow
        Student[Student / Member] -->|Joins via Invite Link or Request| Members
        Coach[Coach / Instructor] -->|Creates Private Problem| Content
        Coach -->|Assigns Homework| Content
        Student -->|Completes Assignment| Gradebook[Course Gradebook]
        Gradebook -->|Meets Threshold| Cert[Verifiable Certificate /api/certificates/:certId]
    end
```

- **Roles & Permissions:** 23 granular permissions (`organization.createContest`, `organization.assignHomework`, `organization.manageRoles`, etc.) mapped to 7 template roles (`owner`, `admin`, `coach`, `instructor`, `coordinator`, `member`, `guest`).
- **Private Problem Authoring:** Organizations author private problems with full grading suites stored in `/organizations/{id}/private-problems/{problemId}`.
- **Gradebook & Certification:** Instructors track completion metrics across courses. When passing criteria are satisfied, cryptographic certificate records are generated in `/organizations/{id}/certificates/{certId}` and publicly verifiable via `/api/certificates/[certId]`.

---

### 6.4 Real-Time Chat & Multimedia Messaging Subsystem

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Sender (Alice)
    participant UI as Chat Composer
    participant MediaAPI as /api/chat/attachment.ts
    participant MsgAPI as /api/chat/conversations/[cid]/messages
    participant DB as Cloud Firestore
    actor Bob as Receiver (Bob)

    alt With Media / Voice
        Alice->>UI: Records voice note or selects file
        UI->>MediaAPI: POST form-data { file, conversationId }
        MediaAPI->>DB: Verify membership in conversation
        MediaAPI->>MediaAPI: Upload to GCS / Storage bucket
        MediaAPI-->>UI: Returns { url, storagePath, mimeType, size }
    end

    Alice->>UI: Clicks "Send Message"
    UI->>MsgAPI: POST { clientMessageId, text, type, attachments }
    MsgAPI->>DB: Verify sender membership & moderation status
    MsgAPI->>DB: Insert into /conversations/{cid}/messages/{mid}
    MsgAPI->>DB: Update /conversations/{cid} (lastActivityAt, lastMessagePreview)
    MsgAPI-->>UI: Returns 201 Created

    DB-->>Bob: onSnapshot listener triggers in useMessages hook
    Bob->>Bob: Renders MessageBubble with Audio/File Attachment
    Bob->>DB: Updates userConversationMeta (lastReadAt)
```

- **Deterministic DM Creation:** Direct message conversations use `dm_${minUid}_${maxUid}` to guarantee idempotency and avoid duplicate channels.
- **Typing Indicators:** Ephemeral typing presence is maintained in `/conversations/{cid}/typing/{uid}` with a 4-second TTL.
- **Security Validation:** Verified via 67 test cases in [`tests/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/tests/chat/).

---

### 6.5 Authentication, Idempotent Account Provisioning, and Onboarding Coordinator

```mermaid
stateDiagram-v2
    [*] --> AuthEvent: User Signs In (Firebase Auth)
    AuthEvent --> FetchUserDoc: Read users/{uid} in _app.tsx
    
    state DecisionMatrix {
        FetchUserDoc --> MissingDoc: Document does not exist
        MissingDoc --> CallProvision: POST /api/auth/provision
        CallProvision --> RenderSetupModal: Account Provisioned (isOnboarded = false)

        FetchUserDoc --> CheckOnboarded: Document exists
        CheckOnboarded --> FullyOnboarded: data.isOnboarded === true
        CheckOnboarded --> LegacyAccount: hasDisplayName && !isStudent && !isOnboarded
        CheckOnboarded --> IncompleteAccount: isOnboarded === false OR (isStudent && missingStudentFields)
    }

    FullyOnboarded --> ActiveApp: Render Requested Page
    LegacyAccount --> ActiveApp: Auto-classify Onboarded (Skip Modal)
    IncompleteAccount --> RenderSetupModal: Display ProfileSetupModal with Close/Skip Option
    RenderSetupModal --> ActiveApp: User Completes or Skips Setup
```

- **Root Cause Resolution:** As documented in [`AUTHENTICATION_RESOLUTION.md`](file:///home/juan/Work%20Space/leetcode-clone-youtube/AUTHENTICATION_RESOLUTION.md), the system implements [`isUserOnboarded`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/onboarding.ts#L10) to prevent legacy users and non-students from being trapped in mandatory university onboarding loops.
- **Idempotent Provisioning:** `/api/auth/provision` verifies whether the document exists before applying rate limits, returning HTTP 200 with `{ provisioned: false, alreadyExisted: true }` for established users.

---

### 6.6 Community Discussions, Moderation Escalation, Suspension, and Appeals

- **Threads & Rich Media:** Users post discussions in `/threads/{threadId}` with tags, code snippets, poll questions, and file attachments.
- **Moderation Pipeline:** Users submit reports via `/api/moderation/report`. Reports enter `/userReports`.
- **Warning Escalation:** Admins issue warnings (`/api/admin/moderation/warn`). Warnings accumulate in `/moderationWarnings`. Reaching warning thresholds escalates accounts to temporary or permanent bans in `/userModeration/{uid}`.
- **Appeals:** Suspended users are redirected to `/suspended` and can file an appeal via `/account-appeal` (`/api/moderation/appeal`), which admins review in `/admin/moderation`.

---

## 7. Frontend and User-Facing Interface

### 7.1 Major Screens and Navigation Structure
1. **Home / Problem Table (`src/pages/index.tsx`):**
   - Renders problem table with search bar, category filters, difficulty tags, and user completion checkmarks.
   - Live user stats banner (rank, score, solved counts).
2. **Coding Workspace (`src/pages/problems/[pid].tsx`):**
   - Split-pane layout (`react-split`) with Problem Description on the left and Code Editor / Console on the right.
   - Multi-language dropdown (C++, Java, Python, JavaScript), font size selector, theme selector, full-screen toggle.
   - Testcase tabs (custom testcase editor, stdout console, execution metadata).
3. **Contest Hub (`src/pages/contests.tsx`) & Live Contest (`src/pages/contests/[cid]/problems/[pid].tsx`):**
   - Active, upcoming, and past contests.
   - Proctoring wrapper with exam-lock modal and integrity monitoring.
4. **Real-Time Messages (`src/pages/messages/index.tsx` & `[cid].tsx`):**
   - Slack/Discord-style dual pane with Conversation Sidebar (unread badges, search, new conversation modal) and Message Area (header, message list, virtual typing indicators, multimedia composer).
5. **Organization Suite (`src/pages/orgs/` & `[slug].tsx`):**
   - Tabbed workspace: Overview, Members, Teams, Hierarchy, Roadmaps, Courses, Assignments, Contests, Files, Announcements, Audit Logs, Settings.
6. **User Profile (`src/pages/profile.tsx`) & Settings (`src/pages/settings.tsx`):**
   - Solved problem breakdown by difficulty, contest rating graph, activity heatmap, connected organizations.
   - Security settings: session management (active sessions list with remote logout), password change request with email verification codes.
7. **Administration Panel (`src/pages/admin/`):**
   - Contest creator/editor, problem authoring tool with JSON testcase validator, moderation queue, user management, and email/notification operations center.

### 7.2 State Management and Data Flow
- **Recoil Global Atoms:**
  - `authModalAtom`: Controls sign-in / sign-up / forgot-password modal visibility and default tab.
  - `executionStateAtom`: Tracks running state, active testcase index, console output tabs.
  - `ratingFeedbackAtom`: Toast alerts for contest rating and score updates.
- **Firestore Reactive Listeners:**
  - Used in `useMessages` and `useConversations` for millisecond-latency chat updates.
  - Used in `usePresence` and `useTyping` for ephemeral state.
- **URL State:**
  - Page numbers, active tabs, filters, and deep-link parameters (`?tab=`, `?prev=`, `?openSubmissionId=`).

---

## 8. Backend, Services, APIs, and Event Contracts

### 8.1 API Route Directory & Specifications

| Endpoint Route | HTTP Method | Authentication / Guard | Request Body / Parameters | Response Contract | Side Effects / Persistence |
|---|---|---|---|---|---|
| `/api/run` | `POST` | `withAuthAndModeration` | `{ userCode, language, testcases, problemId? }` | `{ success: boolean, results: TestCaseResult[] }` | Executes untrusted code in local sandbox or Judge0 |
| `/api/submit` | `POST` | Optional Auth (UID checked) | `{ uid, username, problemId, userCode, language, contestId? }` | `{ success: boolean, verdict, score, runtime, memory }` | Inserts `/submissions` or `/contest_submissions`, updates `/users` XP and `/solvedProblems` |
| `/api/auth/provision` | `POST` | Bearer Token (Firebase Auth) | Header: `Authorization: Bearer <token>` | `{ success: boolean, provisioned: boolean, user: UserProfile }` | Creates initial `/users/{uid}`, `/profiles/{uid}`, `/statistics/{uid}`, `/settings/{uid}` docs |
| `/api/chat/conversations` | `GET`, `POST` | `withAuthAndModeration` | `POST`: `{ type, participantUids, title?, organizationId? }` | `{ success: boolean, conversation: Conversation }` | Creates `/conversations/{cid}` and initializes `/userConversationMeta` |
| `/api/chat/conversations/[cid]/messages` | `GET`, `POST` | `withAuthAndModeration` | `POST`: `{ clientMessageId, text, type, attachments?, replyTo? }` | `{ success: boolean, message: ChatMessage }` | Appends to `/conversations/{cid}/messages/{mid}`, updates conversation metadata |
| `/api/chat/attachment` | `POST` | `withAuthAndModeration` | `multipart/form-data`: `file`, `conversationId` | `{ success: boolean, attachment: ChatAttachment }` | Uploads file to GCS storage bucket under `chat/{cid}/` |
| `/api/cron/calculate-standings` | `POST`, `GET` | Bearer Token (`CRON_SECRET`) | Query or Header: `secret=<CRON_SECRET>` | `{ success: boolean, contestId, processedCount }` | Recalculates ICPC ranks and writes `/contest_leaderboard` |
| `/api/admin/moderation/ban` | `POST` | `withAdminGuard` | `{ uid, reason, durationDays?, isPermanent? }` | `{ success: boolean, status: "BANNED" }` | Sets `userModeration/{uid}.status = "BANNED"`, revokes Firebase refresh tokens |
| `/api/organizations/[id]/members/[uid]` | `PATCH`, `DELETE` | `withAuthAndModeration` (Org Perms) | `PATCH`: `{ roleId, title, department }` | `{ success: boolean }` | Updates `/organizationMembers/{orgId}_{uid}`, logs to `/organizationAuditLogs` |
| `/api/certificates/[certId]` | `GET` | Public | URL Param: `certId` | `{ success: boolean, certificate: CertificateData }` | Public certificate verification endpoint |

---

## 9. Data Model, Persistence, and Cloud Firestore Schema

### 9.1 Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--|| PROFILES : has
    USERS ||--|| STATISTICS : tracks
    USERS ||--|| SETTINGS : configures
    USERS ||--o{ SUBMISSIONS : submits
    USERS ||--o{ THREADS : authors
    USERS ||--o{ CONTEST_PARTICIPANTS : registers
    USERS ||--o{ ORGANIZATION_MEMBERS : belongs_to
    
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : contains
    ORGANIZATIONS ||--o{ ORGANIZATION_ROLES : defines
    ORGANIZATIONS ||--o{ ORGANIZATION_COURSES : offers
    ORGANIZATIONS ||--o{ CONVERSATIONS : hosts_channels

    CONTESTS ||--o{ CONTEST_PROBLEMS : includes
    CONTESTS ||--o{ CONTEST_PARTICIPANTS : enrolls
    CONTESTS ||--o{ CONTEST_SUBMISSIONS : receives
    CONTESTS ||--o{ CONTEST_INTEGRITY_EVENTS : logs

    CONVERSATIONS ||--o{ CHAT_MESSAGES : contains
    CONVERSATIONS ||--o{ USER_CONVERSATION_META : tracks_reads
```

### 9.2 Complete Collection Schema Table

| Collection Name | Document ID Pattern | Key Fields & Data Types | Indexing Requirements | Sensitivity / Access Rule |
|---|---|---|---|---|
| `users` | `{uid}` | `uid: string`, `email: string`, `displayName: string`, `username: string`, `score: number`, `solvedProblemsCount: number`, `isOnboarded: boolean`, `role: string` | `score DESC, displayName ASC`, `country ASC, score DESC` | Read by auth users; write restricted to self (cannot touch `role`, `isAdmin`) |
| `platformAdmins` | `{uid}` | `uid: string`, `email: string`, `role: "admin" \| "super_admin"`, `active: boolean`, `grantedAt: number`, `grantedBy: string` | Direct lookup | **High Sensitivity**: Read by self/admin; write forbidden from client |
| `problems` | `{problemId}` | `id: string`, `title: string`, `difficulty: "Easy" \| "Medium" \| "Hard"`, `examples: Example[]`, `points: number`, `executionProfile: string`, `tags: string[]` | Tags array query | Public read; Admin write only (tags validated) |
| `submissions` | `{submissionId}` | `uid: string`, `problemId: string`, `code: string`, `language: string`, `status: string`, `verdict: string`, `runtime: number`, `memory: number`, `timestamp: number` | `uid ASC, timestamp DESC` | Owner read/write; admin read/delete |
| `contests` | `{contestId}` | `id: string`, `title: string`, `startTime: number`, `endTime: number`, `status: "upcoming" \| "active" \| "ended"`, `securityLevel: "standard" \| "strict"` | `startTime ASC` | Public read; Admin write |
| `contest_participants` | `{contestId}_{uid}` | `contestId: string`, `uid: string`, `status: "registered" \| "active" \| "terminated"`, `warningsCount: number`, `registeredAt: number` | Composite lookup | Self create/update; cannot self-unterminate |
| `contest_integrity_events` | `{autoId}` | `contestId: string`, `uid: string`, `username: string`, `type: string`, `timestamp: number`, `details: string` | `contestId ASC, timestamp DESC` | Read by admin only; create by participant |
| `contest_leaderboard` | `{contestId}_{uid}` | `contestId: string`, `uid: string`, `username: string`, `problemsSolved: number`, `penaltyTime: number`, `rank: number` | `problemsSolved DESC, penaltyTime ASC` | Public read; Admin/Cron write |
| `organizations` | `{orgId}` | `id: string`, `slug: string`, `name: string`, `ownerUid: string`, `visibility: "public" \| "private"`, `memberCount: number`, `status: "active" \| "suspended"` | `slug ASC` | Public read (for public orgs); Member/Admin update |
| `organizationMembers` | `{orgId}_{uid}` | `organizationId: string`, `uid: string`, `roleId: string`, `status: "active" \| "suspended"`, `joinedAt: number` | `uid ASC`, `organizationId ASC` | Member read; Org admin update |
| `conversations` | `dm_{u1}_{u2}` or `org_{o}_{c}` | `id: string`, `type: ConversationType`, `participantUids: string[]`, `lastActivityAt: number`, `lastMessagePreview: string` | `participantUids CONTAINS, lastActivityAt DESC` | Participant only read/update |
| `conversations/{cid}/messages` | `{messageId}` | `id: string`, `conversationId: string`, `senderId: string`, `text: string`, `type: string`, `attachments: ChatAttachment[]`, `createdAt: number` | `isPinned ASC, pinnedAt DESC` | Participant read; Sender create/edit |
| `userConversationMeta` | `{uid}_{cid}` | `uid: string`, `conversationId: string`, `lastReadAt: number`, `isMuted: boolean`, `isPinned: boolean` | `uid ASC, updatedAt DESC` | Owner read/write only |
| `userModeration` | `{uid}` | `uid: string`, `status: "ACTIVE" \| "WARNED" \| "SUSPENDED" \| "BANNED"`, `warningCount: number`, `expiresAt: number \| null` | `status ASC` | Owner read; Admin write |

---

## 10. Core Algorithms and Distinctive Technical Logic

### 10.1 ICPC Penalty Scoring Algorithm
Located in [`src/pages/api/cron/calculate-standings.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/cron/calculate-standings.ts):
$$\text{Penalty Time} = \sum_{p \in \text{Solved}} \left( \lfloor (T_{\text{solve}} - T_{\text{start}}) / 60000 \rfloor + 20 \times N_{\text{failed}}(p) \right)$$
- Each solved problem adds elapsed minutes from contest start to the accepted submission timestamp.
- Each rejected submission before the first accepted submission incurs a 20-minute penalty.
- Rejected submissions occurring *after* a problem is solved are ignored.
- Unsolved problems do not contribute to penalty time regardless of failure count.
- Participants are ranked by:
  1. `problemsSolved` (Descending)
  2. `penaltyTime` (Ascending)
  3. `lastSolveTimestamp` (Ascending tie-break)

### 10.2 Judge0 Request Chunking and Polling State Machine
Located in [`src/pages/api/run.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/run.ts#L80) and [`src/pages/api/submit.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/submit.ts):
1. Test cases are partitioned into chunks of 20 (`MAX_SUBMISSION_BATCH_SIZE`).
2. Batches are dispatched to `POST /submissions/batch`.
3. If Judge0 returns HTTP 422 (custom resource limits rejected by public instance), the client catches the error and retries the batch without custom limits.
4. Tokens are accumulated and polled concurrently via `GET /submissions/batch?tokens=...&base64_encoded=false`.
5. Polling iterates with exponential backoff (starting at 500ms) until all tokens reach terminal status (Status ID > 2: Accepted = 3, Wrong Answer = 4, Time Limit = 5, Compilation Error = 6, Runtime Error = 7–12).

---

## 11. Machine Learning and AI Components

### 11.1 Special Judge Environments for ML
- **Runtime:** Python 3.12.5 configured on Judge0 Extra-CE cluster (`https://extra-ce.judge0.com`, language ID `31`).
- **Preinstalled Libraries:** NumPy, SciPy, scikit-learn.
- **Floating Point Verification:** ML problems employ epsilon-based floating point comparisons:
  $$\| y_{\text{pred}} - y_{\text{true}} \|_{\infty} \le 10^{-4}$$
  customized per problem in [`scripts/hyperparameter-renderer.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/hyperparameter-renderer.ts).

### 11.2 The 300+ Problem Synthetic Generation Pipeline
Located in `scripts/`:
1. **Algorithmic Story Problems (100 problems):** Defined in `scripts/problem-generator/` across 12 algorithmic domains (arrays, strings, math, twoPointers, binarySearch, greedy, stacks, bfs, graphs, dp, bitmask, sorting).
2. **Machine Learning Problems (100 problems):** Defined in `scripts/ml-problem-generator/` across regression, classification, clustering, optimization, dimensionality reduction, preprocessing, deep learning, NLP, recommendation systems, time series, ensemble methods, and reinforcement learning.
3. **Linear Regression Problems (100 problems):** Defined in `scripts/linear-regression-generator/` across simple/multiple regression, normal equations, batch gradient descent, mini-batch GD, regularized regression (L1/L2), and robust regression.
4. **Model Training Problems (200 problems):** Defined in `scripts/model-training-generator/` covering advanced loss functions, momentum optimizers (Adam, RMSProp), SVM dual formulations, and latent variable models.
5. **Hyperparameter Injector (`scripts/specs/index.ts`):** Synthesizes stylized HTML specification boxes into problem descriptions detailing learning rates ($\alpha$), maximum iterations/epochs, convergence tolerance ($\epsilon$), regularization penalties ($\lambda$), and precision requirements.

---

## 12. Hardware, Robotics, and Embedded Components

*Confirmation of Scope:* The BeastCode platform contains **no hardware, robotics, IoT, microcontrollers, or embedded firmware components**. It is purely a cloud-native web application, containerized execution runtime, and distributed database system.

---

## 13. Authentication, Authorization, and Trust Boundaries

### 13.1 Authentication Architecture
- **Provider:** Firebase Authentication (Identity Platform).
- **Session Tokens:** Client receives JWT ID tokens (1-hour lifespan) refreshed automatically in the background by the Firebase Client SDK.
- **Server Verification:** API routes verify tokens via `adminAuth.verifyIdToken(idToken, true)`. The `checkRevoked = true` parameter guarantees that banned users or logged-out sessions are immediately rejected upon token revocation.

### 13.2 Authorization Enforcement
1. **Client-Facing Firestore Security Rules (`firestore.rules`):**
   - Direct database operations evaluate `request.auth != null`.
   - Admin checks query `/platformAdmins/$(request.auth.uid)`.
   - Problem tag validation verifies tags against registered collections.
2. **API Route Guards (`src/utils/withAdminGuard.ts`):**
   - Fails closed.
   - Evaluates moderation status (`userModeration/{uid}`): banned or pending-deletion users are immediately denied.
   - Checks `/platformAdmins/{uid}` document (`active === true`). If `active === false`, access is denied even if a legacy custom claim exists.

---

## 14. Reliability, Performance, and Operational Behavior

### 14.1 Serverless Thread Lifecycle Preservation
In Vercel or Cloud Run environments, returning an HTTP response prematurely causes the runtime thread to freeze, terminating background promises. [`src/pages/api/submit.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/submit.ts) resolves this by awaiting full grading completion before returning the HTTP response, while keeping clients updated via polling or optimistic UI updates.

### 14.2 Redis Caching & Queue Management
Located in [`src/utils/redis.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/redis.ts):
- Implements a resilient Redis singleton with automatic reconnection backoff.
- If Redis is unavailable or unconfigured, it logs a warning and falls back to in-memory caching, ensuring local development is not blocked by missing infrastructure.

---

## 15. Configuration, Setup, Build, and Deployment

### 15.1 Environment Variables Configuration Table

| Variable Key | Purpose | Consuming Component | Sensitivity | Example / Default |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client Firebase auth & API calls | Browser Client SDK | Public | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth redirect domain | Browser Client SDK | Public | `www.bomboclatbeastcode.codes` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | GCP Project ID | Client & Server | Public | `beastcode-7555e` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| GCS bucket for media/avatars | Client & Server | Public | `beastcode-media-348293518232` |
| `FIREBASE_CLIENT_EMAIL` | Service Account email | Firebase Admin SDK | Confidential | `firebase-adminsdk-xxxxx@...` |
| `FIREBASE_PRIVATE_KEY` | Service Account private key | Firebase Admin SDK | **Secret** | `-----BEGIN PRIVATE KEY-----\n...` |
| `CRON_SECRET` | Bearer secret for cron endpoints | Cron API Handlers | **Secret** | `bc_cron_secret_xxxxx` |
| `REDIS_URL` / `REDIS_HOST` | Redis connection endpoint | `src/utils/redis.ts` | Confidential | `redis://localhost:6379` |
| `SMTP_HOST` / `SMTP_PORT` | SMTP email server endpoint | `src/utils/emailService.ts` | Config | `smtp.gmail.com:587` |
| `SMTP_USER` / `SMTP_PASS` | SMTP authentication credentials | `src/utils/emailService.ts` | **Secret** | `bomemebo6996@gmail.com` |
| `STRIPE_SECRET_KEY` | Stripe backend payment intent creation | Stripe API Handlers | **Secret** | `sk_live_...` |
| `JUDGE0_URL` | Remote Judge0 API endpoint | `src/pages/api/run.ts` | Config | `https://ce.judge0.com` |

### 15.2 Local Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in Firebase client & admin credentials in .env.local

# 3. Verify static types and linter
npx tsc --noEmit
npm run lint

# 4. Start local development server
npm run dev
# Server binds to http://localhost:3000
```

### 15.3 Build & Production Deployment
- **Build Command:** `npm run build` (Next.js compilation + page optimization).
- **Target Platform:** Firebase App Hosting via [`apphosting.yaml`](file:///home/juan/Work%20Space/leetcode-clone-youtube/apphosting.yaml) deploying to Cloud Run.
- **Secrets Management:** Cloud Run mounts `FIREBASE_PRIVATE_KEY` and `SMTP_PASS` securely via Google Cloud Secret Manager.

---

## 16. Tests, Validation, and Quality Evidence

### 16.1 Test Suite Inventory & Execution Evidence

1. **Static Analysis & Type Checking:**
   - **Command:** `npx tsc --noEmit`
   - **Outcome:** **0 Errors**. Clean build across all 115+ TypeScript source files.
   - **Command:** `npm run lint`
   - **Outcome:** **0 Errors**, 24 non-blocking warnings (primarily `@next/next/no-img-element` and React Hook `exhaustive-deps`).
2. **Authentication Lifecycle Regression Suite:**
   - **Command:** `npx tsx scripts/verify-auth-lifecycle.ts`
   - **Outcome:** **100% Passed**. Validates URL sanitization, open-redirect protection, onboarding decision matrix, legacy account non-student bypass, and zero transient modal flashes.
3. **Platform Administrator Security Suite:**
   - **Command:** `node scripts/test-authorization-security.mjs`
   - **Outcome:** **100% Passed**. Verified rejection of unauthenticated requests, unverified mock tokens, and non-admin UID privilege escalation attempts.
4. **Chat & Messaging Subsystem QA Suite:**
   - **Configuration:** 67 mapped test cases in [`tests/chat/manifest.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/tests/chat/manifest.ts), executed against headless Chrome via Playwright and API assertions.
   - **Latest Verified Test Run:** `reports/chat/results_qa_20260925031345_riw8t.json`.
   - **Results:** **66 PASSED, 1 FAILED** (98.5% Pass Rate).

---

## 17. Design Decisions, Constraints, and Tradeoffs

1. **Pages Router vs App Router:**
   - *Decision:* Implemented on Next.js 13 Pages Router (`src/pages`).
   - *Tradeoff:* Offers stable SSR/SSG lifecycle and straightforward dynamic routing; lacks React Server Components (RSC) streaming, requiring manual API route boundaries for sensitive data loading.
2. **Direct Firestore Subscriptions vs Custom WebSocket Server:**
   - *Decision:* Real-time chat, threads, and live standings use direct client-side Firestore `onSnapshot` listeners.
   - *Tradeoff:* Eliminates the maintenance and scaling burden of a dedicated Socket.io/WebSocket cluster; introduces higher Firestore document read billing under heavy message volume.
3. **Dual Code Execution Strategy:**
   - *Decision:* Local Linux subprocesses with cgroups fallback to remote Judge0 CE.
   - *Tradeoff:* Enables high-speed zero-network grading when hosted on dedicated Linux infrastructure, while allowing serverless deployments (Vercel/Cloud Run) to transparently offload execution to Judge0.

---

## 18. Current Limitations, Defects, and Unfinished Work

### 18.1 Consequential Defect Register

| Defect ID | Description | Location | Evidence / Repro | Impact | Severity | Recommended Fix |
|---|---|---|---|---|---|---|
| **BUG-001** (`CHAT-PERM-003`) | Missing participant verification on Firestore message creation | [`firestore.rules:330`](file:///home/juan/Work%20Space/leetcode-clone-youtube/firestore.rules#L330) | FAILED in `tests/chat/rules/chatRules.test.ts` (Report: `results_qa_20260925031345_riw8t.json`) | An authenticated user can inject messages directly into another user's private DM via client SDK. | **High** | Update rule to: `allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid && isConversationParticipant(get(...).data);` |
| **BUG-002** | In-memory rate limiter does not share state across serverless instances | [`src/pages/api/auth/provision.ts:25`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/auth/provision.ts#L25) | Source inspection of `recentRequests` Map | Rate limits reset when Cloud Run instances scale or cycle. | **Medium** | Back rate-limiting cache with Redis (`src/utils/redis.ts`) using sliding window keys. |
| **BUG-003** | Working tree uncommitted/untracked problem generator scripts | `scripts/linear-regression-generator/`, `scripts/model-training-generator/` | `git status` shows 10 untracked files and 5 modified scripts | Generator improvements not yet integrated into main branch release. | **Low** | Review and commit the completed generator scripts and verification test files. |

---

## 19. Prioritized Next Steps and Practical Handover

### 19.1 Immediate Action Items
1. **Patch `firestore.rules` for Defect `CHAT-PERM-003`:**
   In `firestore.rules` under `match /conversations/{cid}/messages/{mid}`, enforce `isConversationParticipant(get(/databases/$(database)/documents/conversations/$(cid)).data)` during `create`. Deploy via `firebase deploy --only firestore:rules`.
2. **Review and Commit Working Tree Generator Suite:**
   Stage the unstaged and untracked files in `scripts/` (`scripts/specs/`, `linear-regression-generator/`, `model-training-generator/`, and hyperparameter enrichers) and verify them using `npx tsx scripts/test-model-training-generation.ts`.
3. **Migrate Next.js `<img>` tags to `next/image`:**
   Address ESLint warnings in [`src/pages/orgs/[slug].tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/orgs/%5Bslug%5D.tsx) and [`src/pages/profile.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/profile.tsx) to optimize Largest Contentful Paint (LCP) and bandwidth.

### 19.2 Recommended Reading Order for New Engineers
1. [`src/pages/_app.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/_app.tsx) & [`src/utils/onboarding.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/onboarding.ts): To understand global app initialization, session restoration, and user onboarding.
2. [`src/utils/problemLoader.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts): To master the data boundary between public client DTOs and secret server grading test cases.
3. [`src/pages/api/run.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/run.ts) & [`src/pages/api/submit.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/submit.ts): To understand code sandboxing, Judge0 chunking, and the grading state machine.
4. [`firestore.rules`](file:///home/juan/Work%20Space/leetcode-clone-youtube/firestore.rules): To understand authorization and security constraints enforced at the database layer.
5. [`src/utils/orgEngine.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/orgEngine.ts): To inspect the multi-tenant role, permission, and institutional workspace architecture.
6. [`src/components/Chat/ChatShell.tsx`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Chat/ChatShell.tsx) & [`src/hooks/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/hooks/chat): To follow the reactive real-time messaging pipeline.

---

## 20. Unknowns, Source Index, and Coverage Statement

### 20.1 Unknowns & External Dependencies
- **Judge0 Infrastructure:** Public Judge0 endpoints (`ce.judge0.com`, `extra-ce.judge0.com`) are subject to upstream rate limits and downtime. Dedicated self-hosted Judge0 instances should be provisioned for high-concurrency production contests.
- **Stripe Webhook Listener:** While checkout sessions and payment intents are created, live webhook event handling (`stripe listen` / webhook signing secret) depends on active production Stripe dashboard configuration.

### 20.2 Key Source Index
- **Execution & Judge:** [`src/pages/api/run.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/run.ts), [`src/pages/api/submit.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/submit.ts), [`src/utils/executionProfiles.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/executionProfiles.ts), [`src/utils/problemLoader.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/problemLoader.ts)
- **Contests & Anti-Cheat:** [`src/pages/contests/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/contests), [`src/pages/api/cron/calculate-standings.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/cron/calculate-standings.ts)
- **Organizations:** [`src/pages/orgs/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/orgs), [`src/pages/api/organizations/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/organizations), [`src/utils/orgEngine.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/orgEngine.ts)
- **Chat & Messaging:** [`src/pages/messages/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/messages), [`src/components/Chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/components/Chat), [`src/pages/api/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/pages/api/chat), [`tests/chat/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/tests/chat)
- **Auth & Security:** [`src/utils/onboarding.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/onboarding.ts), [`src/utils/withAdminGuard.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/withAdminGuard.ts), [`src/utils/authMiddleware.ts`](file:///home/juan/Work%20Space/leetcode-clone-youtube/src/utils/authMiddleware.ts), [`firestore.rules`](file:///home/juan/Work%20Space/leetcode-clone-youtube/firestore.rules)
- **Problem Generators:** [`scripts/problem-generator/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/problem-generator), [`scripts/ml-problem-generator/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/ml-problem-generator), [`scripts/linear-regression-generator/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/linear-regression-generator), [`scripts/specs/`](file:///home/juan/Work%20Space/leetcode-clone-youtube/scripts/specs)

---

## 21. Compact Context for a Future Developer or AI Agent

```markdown
### BEASTCODE PLATFORM CONTEXT FOR NEXT DEVELOPER OR AI AGENT

- **Repository & Target:** `leetcode-clone-youtube` (v0.1.0) | Target: https://www.bomboclatbeastcode.codes
- **Revision Snapshot:** Git commit `abca626` (Branch: `master`, tracking `origin/master`).
- **Core Architecture:** Next.js 13 (Pages Router), TypeScript 5, Tailwind CSS, Google Cloud Firestore, Firebase Auth, Redis (`ioredis`), Nodemailer SMTP.
- **Judge Subsystem:** Dual-path execution in `src/pages/api/run.ts` and `src/pages/api/submit.ts`. Local Linux container namespaces (`unshare` + `cgroups v2`) with remote Judge0 CE (`ce.judge0.com`) and Judge0 Extra-CE (`extra-ce.judge0.com` with NumPy/SciPy) fallback.
- **Data Boundary:** `src/utils/problemLoader.ts` strictly separates `getPublicProblem` (public client DTO with sample testcases only) from `getProblemForGrading` (authoritative full testcase suite loaded server-side exclusively by `/api/submit`).
- **ICPC Contests & Anti-Cheat:** Contests in `src/pages/contests/` log `tab_switch` and `fullscreen_exit` to `/contest_integrity_events`. 3 warnings trigger disqualification. Standings recalculated via `/api/cron/calculate-standings.ts` with 20-min penalty rules.
- **Multi-Tenant Workspaces:** `src/utils/orgEngine.ts` handles 23 permissions, 7 system roles (`owner`, `admin`, `coach`, `instructor`, etc.), private problems, roadmaps, gradebooks, assessments, and public certificate verification.
- **Real-Time Chat:** Slack-style messaging in `src/pages/messages/` and `src/components/Chat/`. Supports text, code, audio notes, attachments, reactions, typing indicators, and pinning. 66/67 automated QA tests passed in `reports/chat/`.
- **Known Security Defect:** `firestore.rules` line 330 allows message creation without checking `isConversationParticipant(get(...).data)` (Failed test `CHAT-PERM-003`). Fix this in `firestore.rules`.
- **Authentication & Onboarding:** Managed via `src/utils/onboarding.ts` (`isUserOnboarded`). Academic fields are strictly optional for non-students; legacy accounts automatically bypass onboarding modals.
- **Administrative Privileges:** Admin endpoints guarded by `src/utils/withAdminGuard.ts`. Verifies against `/platformAdmins/{uid}` document (`active === true`) or valid Firebase custom claims.
- **Next Immediate Action:** Patch the message creation permission in `firestore.rules` and commit the generator scripts in `scripts/specs/` and `scripts/*-generator/`.
```
