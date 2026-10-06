<div align="center">

<img src="https://img.shields.io/badge/BeastCode-Online%20Judge-FF8C00?style=for-the-badge&logoColor=white" alt="BeastCode" />

# BeastCode — Competitive Programming Platform

**A full-stack, production-grade online judge and competitive programming platform built with Next.js, Firebase, and Judge0.**

[![Next.js](https://img.shields.io/badge/Next.js-13-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

[Live Demo](https://www.bomboclatbeastcode.codes) · [Report Bug](https://github.com/luongjuan123/leetcode-clone-youtube/issues) · [Request Feature](https://github.com/luongjuan123/leetcode-clone-youtube/issues)

</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Project Structure](#-project-structure)
- [Key Modules](#-key-modules)
- [Security](#-security)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 About The Project

**BeastCode** is a production-ready competitive programming and online judge platform designed for academic institutions and coding communities. It provides a complete LeetCode-style experience with real-time contest management, multi-language code execution, a social community layer, and a powerful admin dashboard.

The platform was purpose-built to support structured academic use — including student profiles with institutional data, class-based contest access controls, and an email-verified authentication pipeline.

---

## ✨ Features

### 🏋️ Problem Set
- Searchable, sortable, paginated problem list
- Per-problem difficulty tags (Easy / Medium / Hard)
- Success rate tracking and like/dislike system
- Linked editorial videos via YouTube embed
- Custom test cases with interactive code runner

### ⚡ Code Execution Engine
- **Multi-language support**: JavaScript, Python, C++, C, Java
- **Local execution** (Node.js, g++, gcc, Python3, javac) with fallback to **Judge0 Cloud API**
- Per-problem configurable limits: CPU time, memory, output size
- Batch test case execution with real-time progress updates
- Custom checker support for problems with non-unique answers
- TLE / MLE / OLE / Compile Error / Runtime Error detection

### 🏆 Contests
- Full contest lifecycle: `draft → scheduled → registration_open → running → frozen → ended → archived`
- Real-time leaderboard with freeze support
- Contest visibility: `public`, `password-protected`, `university domain-restricted`
- Virtual participation mode for past contests
- Registration confirmation emails with SMTP
- Live countdown timers and auto-status transitions

### 👤 User System
- **Email verification gate** — users must verify email before provisioning a Firestore profile
- Lazy provisioning via `/api/auth/provision` — decoupled from registration
- Username with 90-day change cooldown
- Avatar upload with canvas compression
- Follow / Follower social graph
- Experience tier: Beginner / Intermediate / Advanced
- Student card with school, faculty, class, student ID (privacy toggle)
- Solved statistics dashboard with per-difficulty progress bars

### 🛡️ Moderation & Admin
- **Unified Admin SPA** with tabs: Overview, Problems, Contests, Users, Emails, Moderation, Community, Tags
- Content moderation for Threads (flagging, ban, appeals)
- Account suspension system with `/suspended` and `/account-appeal` flows
- Admin-only API routes guarded by Firebase ID token verification
- Cron jobs for scheduled reminders and status sync

### 💬 Community Threads
- Discord-style threaded discussion board
- GIF picker integration
- Attachment support
- Tag-based filtering
- Real-time updates via Firestore listeners

### 🔔 Notifications
- In-app notification system
- Email notifications for contests (registration, reminder, termination)
- Unsubscribe link support

### 🔐 Auth & Security
- Firebase Authentication (email/password)
- Email verification guard on all protected routes
- Server-side Firebase Admin SDK for privileged operations
- Password reset via branded `/reset-password` page (not Firebase default)
- Rate-limited forgot password (anti-spam)
- SMTP password app via Google App Password

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 13 (Pages Router) |
| **Language** | TypeScript 5 |
| **Styling** | TailwindCSS 3 + custom CSS variables |
| **State Management** | Recoil |
| **Database** | Cloud Firestore |
| **Authentication** | Firebase Auth v9 |
| **Admin SDK** | Firebase Admin SDK (server-side) |
| **Code Editor** | CodeMirror 6 (`@uiw/react-codemirror`) |
| **Code Execution** | Local subprocess + Judge0 Cloud API fallback |
| **Email** | Nodemailer + Gmail SMTP |
| **Payments** | Stripe |
| **Deployment** | Firebase App Hosting (Cloud Run) |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────┐
│                  Next.js Application               │
│                                                    │
│  ┌──────────────┐        ┌──────────────────────┐  │
│  │  Pages (UI)  │        │   API Routes         │  │
│  │  /index      │        │   /api/run            │  │
│  │  /problems   │◄──────►│   /api/submit         │  │
│  │  /contests   │        │   /api/auth/*         │  │
│  │  /profile    │        │   /api/admin/*        │  │
│  │  /admin      │        │   /api/contests/*     │  │
│  └──────────────┘        └────────────┬─────────┘  │
└────────────────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────┐
              │                         │                      │
     ┌────────▼────────┐     ┌──────────▼─────────┐   ┌───────▼──────┐
     │  Cloud Firestore │     │  Firebase Admin SDK │   │  Judge0 API  │
     │  (client + admin)│     │  (Auth, User mgmt)  │   │  (remote     │
     │                  │     │                     │   │   execution) │
     └──────────────────┘     └─────────────────────┘   └──────────────┘
```

### Authentication Flow (Lazy Provisioning)

```
User Registers → Firebase Auth Account Created
        ↓
Verification Email Sent → /verify-email interstitial shown
        ↓
User Clicks Link → Email Verified
        ↓
POST /api/auth/provision → Firestore user document created
        ↓
Redirect to App (fully provisioned)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Firebase project** with Firestore and Authentication enabled
- A **Gmail account** with an [App Password](https://support.google.com/accounts/answer/185833) for SMTP
- *(Optional)* Local compilers: `node`, `python3`, `g++`, `gcc`, `javac` for local code execution

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/luongjuan123/leetcode-clone-youtube.git
cd leetcode-clone-youtube

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env.local
# → Fill in your real values in .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and fill in each value. **Never commit files containing real secrets.**

```env
# ── Firebase Client SDK ────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ── Firebase Admin SDK (server-side only) ──────────────────────────────────
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# ── Email / SMTP ───────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="BeastCode" <your_gmail@gmail.com>

# ── Site URL ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Obtaining Firebase Admin credentials:**
> Firebase Console → Project Settings → Service Accounts → Generate new key
> Copy `client_email` and `private_key` from the downloaded JSON file.

---

## 📁 Project Structure

```
├── src/
│   ├── atoms/              # Recoil state atoms
│   ├── components/
│   │   ├── Admin/          # Admin SPA tab components
│   │   ├── Modals/         # Auth modals (Login, Signup, etc.)
│   │   ├── Threads/        # Community discussion board
│   │   ├── Workspace/      # Code editor + test panel
│   │   ├── Topbar/         # Global navigation bar
│   │   └── UI/             # Shared UI primitives
│   ├── context/            # React context providers
│   ├── firebase/
│   │   ├── firebase.ts     # Client SDK init
│   │   └── firebaseAdmin.ts # Admin SDK init (server-side only)
│   ├── hooks/              # Custom React hooks
│   ├── pages/
│   │   ├── api/            # Next.js API routes (server-side)
│   │   │   ├── auth/       # provision, reset, change password
│   │   │   ├── admin/      # Protected admin endpoints
│   │   │   ├── contests/   # Contest management APIs
│   │   │   └── run.ts      # Code execution engine
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── contests/       # Contest detail pages
│   │   └── problems/       # Problem detail pages
│   ├── styles/
│   │   └── globals.css     # Design tokens + global styles
│   └── utils/              # Shared utility functions
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
├── apphosting.yaml         # Firebase App Hosting config
└── .env.example            # Environment variable template
```

---

## 🔑 Key Modules

### Code Execution (`/api/run.ts`)

The execution engine uses a **dual-path strategy**:
1. **Local execution** — runs code via child processes (`node`, `python3`, `g++`, `gcc`, `javac`) when the compiler is available on the server. Memory is monitored via `/proc/{pid}/statm`.
2. **Remote fallback** — when a local compiler is unavailable, code is submitted to the [Judge0](https://judge0.com/) public API with batch polling (up to 60 polls × 500ms = 30s timeout).

### Auth Provisioning (`/api/auth/provision.ts`)

A secure endpoint that creates a Firestore user document only after Firebase confirms email verification. This prevents unverified users from ever having a DB record, reducing attack surface.

### Contest System

Contests are stored in Firestore with computed status derived client-side from `startTime`, `endTime`, and `leaderboardFreeze` timestamps. Status is auto-synced back to Firestore when drift is detected, ensuring consistency across all clients.

### Admin Dashboard

A single-page application accessible only to admin users (verified via Firebase ID token on every API call). Built with query-based tab routing (`?tab=problems`) to preserve state across navigation.

---

## 🔒 Security

| Concern | Mitigation |
|---|---|
| API key exposure | All secrets in `.env.local` (git-ignored). Production uses Firebase Secret Manager. |
| Unauthorized API access | Every server route verifies Firebase ID token via Admin SDK |
| Email enumeration | Forgot-password endpoint returns success regardless of email existence |
| Brute-force | Rate-limiting on auth endpoints |
| IDOR on admin routes | `withAdminGuard` middleware checks admin claim on every request |
| Code injection | Execution in isolated subprocesses with TLE/MLE/OLE kill guards |
| Firestore rules | Strict per-collection rules; see `firestore.rules` |

> **⚠️ Reminder:** If you ever accidentally commit a `.env` file, immediately rotate all secrets in that file — even after purging git history.

---

## 🚢 Deployment

This project is configured for **Firebase App Hosting** (Cloud Run).

```bash
# Install Firebase CLI
npx -y firebase-tools@latest login

# Deploy to Firebase App Hosting
npx firebase-tools apphosting:backends:create

# Or deploy all Firebase resources (rules, indexes, hosting)
npx firebase-tools deploy
```

For production secrets, use **Firebase Secret Manager** instead of plain `value:` in `apphosting.yaml`:

```yaml
# apphosting.yaml
- variable: FIREBASE_PRIVATE_KEY
  secret: firebase_private_key   # ← references a Secret Manager secret
  availability:
    - RUNTIME
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please make sure your code:
- Passes `npm run lint`
- Does not introduce any new secrets or hardcoded credentials
- Follows the existing TypeScript conventions

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

---

<div align="center">

Built with ❤️ by [luongjuan123](https://github.com/luongjuan123)

</div>
