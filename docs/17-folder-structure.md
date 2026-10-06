# BeastCode Platform Technical Documentation
## Section 17: Folder Structure & Codebase Map

### 17.1 Codebase Structure

This directory map outlines the organization of the BeastCode codebase:

```
leetcode-clone-youtube/
├── apphosting.yaml             # Firebase App Hosting config file
├── firestore.rules             # Cloud Firestore Security Rules
├── package.json                # Project dependencies and script runner config
├── tailwind.config.js          # Tailwind CSS style variables (if active)
├── tsconfig.json               # TypeScript compiler config
├── docs/                       # Technical System Documentation
│   ├── 01-overview.md
│   ├── 02-architecture.md
│   └── ...
├── public/                     # Static assets (images, icons, logos)
└── src/                        # Main Application Codebase
    ├── atoms/                  # Recoil state atom definitions
    │   ├── authModalAtom.ts
    │   └── ...
    ├── components/             # Reusable UI React Components
    │   ├── Admin/              # Admin dashboard panels
    │   ├── Auth/               # Login, Sign Up, and Reset Modals
    │   ├── Markdown/           # Rich description parsers
    │   ├── Problems/           # Problem lists and filters
    │   ├── Threads/            # Forum Composer, Polls, and Thread Cards
    │   ├── Topbar/             # Global sticky header
    │   ├── UI/                 # Custom Modals, Buttons, and Select Menus
    │   └── Workspace/          # Code split-pane editor workspace
    ├── firebase/               # Firebase initialization singletons
    │   ├── firebase.ts         # Client Web SDK instance proxy
    │   └── firebaseAdmin.ts    # Server SDK with local mocks
    ├── hooks/                  # Custom React Hooks
    │   ├── useHasMounted.ts
    │   └── ...
    ├── pages/                  # Next.js Pages Routing System
    │   ├── _app.tsx            # Global context wrapper
    │   ├── account-appeal.tsx  # Suspension appeal entry page
    │   ├── admin.tsx           # Admin Dashboard SPA page
    │   ├── contests.tsx        # Contests dashboard portal
    │   ├── index.tsx           # Home problem directory page
    │   ├── notifications.tsx   # User notifications inbox
    │   ├── profile.tsx         # User Profile Achievements page
    │   ├── reset-password.tsx  # Custom reset password validation page
    │   ├── settings.tsx        # User preferences panel
    │   ├── suspended.tsx       # Ban intercept landing page
    │   ├── unsubscribe.tsx     # Email opt-out redirect page
    │   ├── api/                # Next.js API Routes (Backend Endpoints)
    │   │   ├── admin/          # Admin action routes (ban, delete, logs)
    │   │   ├── auth/           # Forgot-password helper API
    │   │   ├── moderation/     # Appeal, reports APIs
    │   │   ├── notifications/  # Dispatcher, process queue cron APIs
    │   │   ├── run.ts          # Core code execution runner
    │   │   └── submit.ts       # Core submissions evaluator
    │   └── contests/           # Contest dynamic workspace paths
    ├── styles/                 # Styling setups
    │   └── globals.css         # Theme styles variables
    └── utils/                  # Core Business Logic & Helpers
        ├── clientNotificationService.ts  # Client push dispatcher
        ├── emailService.ts               # Nodemailer queue executor
        ├── experienceConfig.ts           # XP levels thresholds
        ├── notificationDispatcher.ts     # Server dispatcher router
        ├── notificationTemplates.ts      # HTML transactional email templates
        └── types.ts                      # Common TypeScript interfaces
```

---

### 17.2 Core Directory Responsibilities

*   **`src/atoms/`**: Manages global application states using Recoil. These state atoms act as a centralized store, preventing prop drilling.
*   **`src/components/`**: Organized by feature domain. Components are designed to be reusable and handle their own layout logic.
*   **`src/pages/`**: Uses file-system-based routing. Files in this directory define pages, and files in `pages/api` map directly to serverless API endpoints.
*   **`src/utils/`**: Contains utility helpers, validation logic, and configuration files. Keeping this logic separate makes it easier to write unit tests for core helper functions.
