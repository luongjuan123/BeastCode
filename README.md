# BeastCode — Competitive Programming and Academic Learning Platform

A full-stack, production-grade online judge, competitive programming engine, and academic workspace ecosystem built with Next.js, Firebase, CodeMirror, and Judge0.

Live Deployment: https://www.bomboclatbeastcode.codes

---

## Table of Contents

- [Overview](#overview)
- [Visual Showcase](#visual-showcase)
- [Key Features](#key-features)
  - [Online Judge and Execution Sandbox](#online-judge-and-execution-sandbox)
  - [Contests and Competitive Arena](#contests-and-competitive-arena)
  - [Organization Workspaces and Academic Multi-Tenancy](#organization-workspaces-and-academic-multi-tenancy)
  - [Real-Time Direct and Group Messaging](#real-time-direct-and-group-messaging)
  - [Community Discussions and Social Features](#community-discussions-and-social-features)
  - [Security, Sessions, and Account Governance](#security-sessions-and-account-governance)
  - [Administrative Dashboard and Bulk Moderation](#administrative-dashboard-and-bulk-moderation)
  - [Automated Email and Notification Service](#automated-email-and-notification-service)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Development Server](#development-server)
- [Repository Structure](#repository-structure)
- [Testing and Verification](#testing-and-verification)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

BeastCode is an enterprise-ready algorithmic problem solving and learning management system designed for students, competitive programmers, university clubs, and academic institutions.

The platform provides a complete LeetCode-style problem bank with multi-language code execution, combined with ICPC-standard contest management, an organization workspace suite for course curricula and team management, real-time messaging, and comprehensive administrative controls.

---

## Visual Showcase

### Organization Workspaces Directory

Browse and discover public and affiliated workspaces across universities and coding clubs.

![Organizations Directory](organization-validation-evidence/screenshots/desktop_01_orgs_directory.png)

### Workspace Dashboard and Overview

Dedicated tenant homepage displaying statistics, recent activities, announcements, and team roadmaps.

![Organization Workspace Overview](organization-validation-evidence/screenshots/desktop_02_org_overview.png)

### Courses and Curriculum Management

Structure learning tracks, organize problem sets by week or module, and track student completion in gradebooks.

![Course Management](organization-validation-evidence/screenshots/desktop_03_org_courses.png)

### Problem Repository and Private Problem Bank

Manage both public algorithmic challenges and private institutional problem sets with custom testcases.

![Problem Bank](organization-validation-evidence/screenshots/desktop_04_org_problems.png)

### Assessments and Timed Evaluations

Schedule and host proctored tests, entrance exams, and coding assessments within organizations.

![Assessments and Exams](organization-validation-evidence/screenshots/desktop_05_org_assessments.png)

### Teams and Study Groups

Group organization members into cohorts, project teams, or contest preparation tracks.

![Workspace Teams](organization-validation-evidence/screenshots/desktop_06_org_teams.png)

### Recruitment and Opportunities Pipeline

Post student job listings, review submitted applications, and coordinate technical interviews.

![Recruitment Board](organization-validation-evidence/screenshots/desktop_07_org_recruitment.png)

### Announcements and Broadcasts

Deliver organization-wide notices and contest updates with markdown support.

![Announcements Feed](organization-validation-evidence/screenshots/desktop_08_org_announcements.png)

### Member Management and Role-Based Access Control

Manage workspace rosters, configure membership roles (Owner, Admin, Member, Reviewer), and track activity.

![Member Roster](organization-validation-evidence/screenshots/desktop_09_org_members.png)

### Workspace Settings and Danger Zone

Configure workspace branding, join permissions, custom slugs, and execute permanent deletion workflows.

![Workspace Settings](organization-validation-evidence/screenshots/desktop_10_org_settings.png)

### Real-Time Direct and Group Messaging

Integrated chat system featuring instant delivery, typing indicators, pinned messages, reactions, and attachments.

![Real-Time Messaging](reports/chat/evidence/chat_realtime_001_received.png)

---

## Key Features

### Online Judge and Execution Sandbox

- Supported Languages: C++, C, Java, Python 3, and JavaScript (Node.js).
- Dual Execution Architecture: Local low-latency sandbox runner backed by subprocess execution with fallback to remote Judge0 Cloud API.
- Configurable Resource Limits: Enforce CPU time limits (TLE), memory limits (MLE), and output size limits (OLE).
- Custom Checkers: Supports EPS checker algorithms for floating-point solutions and token-based custom verifiers for problems with multiple valid solutions.
- Interactive Workspace: CodeMirror 6 with language syntax highlighters, split-pane layout, custom test case editor, and execution telemetry.
- Detailed Submission Reports: View submission status, runtime breakdown, memory consumption, error stack traces, and historical submission diffs.

### Contests and Competitive Arena

- Contest Lifecycle Management: Supports draft, scheduled, registration open, running, scoreboard frozen, ended, and archived states.
- ICPC Scoring Engine: Penalty calculation with submission time weighting and wrong-attempt penalties.
- Leaderboard Freezing: Freeze standings during the final phase of competitions to maintain suspense.
- Virtual Participation: Allows users to compete individually in past contests on identical timelines with custom email confirmations and results.
- Access Restrictions: Configure contests as public, password-protected, or restricted to specific university email domains.
- Live Clarifications: Participants can submit questions to judges and view real-time contest broadcast announcements.

### Organization Workspaces and Academic Multi-Tenancy

- Isolated Workspaces: Dedicated organization spaces (`/orgs/[slug]`) with customized avatars, banners, and member structures.
- Courses and Learning Tracks: Structured educational modules with lecture notes, assignments, and integrated gradebooks.
- Private Problem Banks: Author proprietary algorithms with private test cases visible only to enrolled workspace members.
- Team Management: Sub-teams with designated leaders and team-specific discussion channels.
- Recruitment and Career Portal: Built-in job board, resume uploads, application pipeline tracking, and interview scheduling.
- Join Workflows: Supports secret invitation links, manual join requests with admin approvals, and domain auto-join.
- Permanent Workspace Deletion: Secure two-factor confirmation workflow that completely cascades through all subcollections and resources.

### Real-Time Direct and Group Messaging

- Live Messaging: Real-time message exchange powered by Cloud Firestore real-time listeners and server-side verification.
- Rich Communication: Message pinning, reactions, typing indicators, and unread counters.
- Media Attachments: Secure upload pipeline for images, documents, and code snippets.
- Safety and Privacy: Block abusive users and report messages directly to the moderation queue.

### Community Discussions and Social Features

- Discussion Threads: Categorized technical forum supporting markdown formatting, code blocks, and tags.
- User Profiles: Showcase solved problem breakdown (Easy, Medium, Hard), rating history, follow/unfollow graph, and institutional credentials.
- Global Rankings: Dynamic leaderboard calculating user standing based on problem solving and contest performance.

### Security, Sessions, and Account Governance

- Session Management: View all active browser sessions with device and IP metadata, and trigger selective or global session revocation.
- Security Score: Real-time account posture evaluation reviewing password strength, verification status, and session activity.
- Verification Gates: Mandatory email verification prior to account provisioning to prevent spam registration.
- Step-Up Verification: Verification code requirements for sensitive operations including password changes.

### Administrative Dashboard and Bulk Moderation

- Unified Control Center: Tabbed single-page administration interface covering Users, Problems, Contests, Organizations, Emails, Moderation, and Tags.
- Checkbox Bulk Actions: Select multiple accounts simultaneously to perform bulk role changes, warnings, suspensions, or permanent account deletions.
- Comprehensive Audit Logs: Track every moderator decision with timestamped rationales and target user references.
- Appeal Management: Dedicated queues for processing user suspension appeals and organization reinstatement requests.

### Automated Email and Notification Service

- Transactional Email Pipeline: Automated emails for contest registration, upcoming competition reminders, virtual contest completions, and security alerts.
- High-Deliverability Templates: Branded HTML email layouts compatible across modern and legacy desktop and mobile mail clients.
- In-App Notifications: Notification center with unread badges, action shortcuts, and category filters.

---

## System Architecture

```
+-------------------------------------------------------------------------------+
|                             Client Layer (Browser)                            |
|                                                                               |
|   Next.js UI Pages         CodeMirror 6 Editor          Recoil State & Hooks  |
|   (/problems, /contests,   (Syntax highlight, tabs,     (Auth, notifications, |
|    /orgs, /messages)        stdin/stdout terminals)      workspace state)     |
+---------------------------------------+---------------------------------------+
                                        | HTTPS / WebSocket
+---------------------------------------v---------------------------------------+
|                         Next.js Server & API Routes                           |
|                                                                               |
|   /api/run          /api/submit        /api/admin/*        /api/chat/*        |
|   /api/auth/*       /api/contests/*    /api/orgs/*         /api/security/*    |
+-------------------+--------------------+--------------------+-----------------+
                    |                    |                    |
        +-----------v-----------+  +-----v-------+      +-----v-----------+
        |  Local Subprocess     |  |   Judge0    |      | Nodemailer SMTP |
        |  Execution Sandbox    |  |  Cloud API  |      | Service         |
        |  (cgroups, namespaces)|  |  (Fallback) |      | (Gmail / Relay) |
        +-----------------------+  +-------------+      +-----------------+
                    |                    |
+-------------------v--------------------v--------------------------------------+
|                           Data and Identity Layer                             |
|                                                                               |
|   Cloud Firestore (NoSQL Datastore)         Firebase Authentication           |
|   - Users, Problems, Submissions, Contests  - Identity Tokens, Claims,        |
|   - Organizations, Courses, Assessments     - Email Verification, Passwords   |
|   - Chat Messages, Conversations, Logs                                        |
+-------------------------------------------------------------------------------+
```

---

## Technology Stack

### Frontend

- Framework: Next.js 13 (Pages Router)
- Language: TypeScript 5
- State Management: Recoil
- Editor: CodeMirror 6 (`@uiw/react-codemirror`) with C++, Java, Python, and JavaScript extensions
- Styling: Tailwind CSS 3 with custom CSS design tokens
- Layout: React-Split, React-Virtuoso (virtualized rendering)

### Backend and APIs

- Server Runtime: Next.js API Routes (Node.js 18+)
- Admin SDK: Firebase Admin SDK 13
- Identity and Security: Firebase Authentication (JWT token verification)
- Remote Code Execution: Judge0 Cloud REST API
- Real-Time Messaging: Cloud Firestore real-time snapshots
- Email Dispatch: Nodemailer with SMTP integration

### Database and Infrastructure

- Database: Google Cloud Firestore
- Hosting: Firebase App Hosting (Cloud Run)
- Cache: Redis / ioredis integration
- Payments: Stripe SDK

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- Node.js: version 18.0.0 or higher
- npm: version 9.0.0 or higher
- Compilers (optional for local execution): `g++`, `gcc`, `python3`, `javac`, `node`
- Firebase Project: Active Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:

```bash
git clone https://github.com/luongjuan123/leetcode-clone-youtube.git
cd leetcode-clone-youtube
```

2. Install dependencies:

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file in the root directory by duplicating the example file:

```bash
cp .env.example .env.local
```

Populate the required credentials:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server Only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="BeastCode" <your_email@gmail.com>

# Application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Development Server

Start the local development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser to view the application.

---

## Repository Structure

```
├── docs/                               # Comprehensive architectural documentation
├── organization-validation-evidence/   # Full-page screenshots and validation evidence
├── reports/                            # Chat system reports, test traces, and audit logs
├── scripts/                            # Operational, database, and reconciliation scripts
├── src/
│   ├── atoms/                          # Recoil atomic state management
│   ├── components/
│   │   ├── Admin/                      # Administration dashboard and moderation views
│   │   ├── Chat/                       # Direct messaging and chat UI
│   │   ├── Contests/                   # Contest arena and scoreboard components
│   │   ├── Modals/                     # Authentication and administrative dialogs
│   │   ├── Organizations/              # Workspace tabs, courses, teams, and settings
│   │   ├── Problems/                   # Problem lists, filters, and description panels
│   │   ├── Settings/                   # Security center, session manager, and preferences
│   │   ├── Threads/                    # Forum discussions and comment trees
│   │   ├── Workspace/                  # Code editor, testcase runner, and output console
│   │   └── UI/                         # Reusable UI primitives and form controls
│   ├── context/                        # React context providers
│   ├── firebase/                       # Firebase client and server-side Admin SDK initializers
│   ├── hooks/                          # Custom React hooks
│   ├── pages/
│   │   ├── admin/                      # Admin dashboard routes
│   │   ├── api/                        # Serverless API endpoints
│   │   │   ├── admin/                  # Protected administration endpoints
│   │   │   ├── auth/                   # Identity and provisioning APIs
│   │   │   ├── chat/                   # Messaging endpoints
│   │   │   ├── contests/               # Contest submissions and scoring APIs
│   │   │   ├── organizations/          # Workspace management APIs
│   │   │   └── security/               # Session and security verification APIs
│   │   ├── contests/                   # Contest arena and detail pages
│   │   ├── messages/                   # Real-time chat application
│   │   ├── orgs/                       # Organization directory and workspace pages
│   │   ├── problems/                   # Problem workspace and submission history
│   │   ├── rankings.tsx                # Global leaderboard
│   │   └── settings.tsx                # Security and profile configuration
│   ├── styles/                         # Tailwind and custom theme declarations
│   └── utils/                          # Business logic, email templates, and validators
├── tests/                              # Automated test suites
├── firestore.indexes.json              # Composite Firestore index declarations
├── firestore.rules                     # Database access security rules
├── apphosting.yaml                     # Firebase App Hosting deployment specification
└── package.json                        # Project dependencies and operational scripts
```

---

## Testing and Verification

The repository contains automated test suites for critical business workflows:

```bash
# Run chat system verification
npm run test:chat

# Run global rankings correctness test
npm run test:rankings

# Test contest email generation and delivery
npm run test:contest-emails

# Verify admin checkbox bulk action workflows
npm run test:account-bulk

# Verify organization deletion cascade rules
npm run test:org-deletion

# Run autocomplete and problem set audits
npm run test:autocomplete-audit
npm run test:problem-audit
```

---

## Deployment

The application is deployed on Firebase App Hosting (Cloud Run).

```bash
# Authenticate with Firebase CLI
npx -y firebase-tools@latest login

# Deploy backend rules and indexes
npx firebase-tools deploy --only firestore:rules,firestore:indexes

# Deploy full application
npx firebase-tools deploy
```

Production environment variables and private keys should be configured using Google Cloud Secret Manager.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: description of changes"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request.

Ensure all code follows the TypeScript guidelines and passes `npm run lint`.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
