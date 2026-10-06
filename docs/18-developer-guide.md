# BeastCode Platform Technical Documentation
## Section 18: Developer Onboarding & Contribution Guide

This guide is designed to help new team members get their local development environment set up quickly.

---

### 18.1 Quick Start Installation

Follow these steps to set up the project locally:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/luongjuan123/leetcode-clone-youtube.git
    cd leetcode-clone-youtube
    ```
2.  **Install Node Dependencies**:
    Make sure you are using Node.js version 18.x:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    The site will start at `http://localhost:3000`.

---

### 18.2 Configuration Template (`.env.local`)

Create a `.env.local` file in the root directory and configure the environment variables:

```ini
# Firebase Public Web SDK Credentials
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Private Key (For API routes)
# Leave blank to use Mock credentials in development
FIREBASE_SERVICE_ACCOUNT=

# Outbound SMTP Config (For notifications)
# Leave blank to use Ethereal mock email server in development
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="BeastCode Local Dev" <dev@beastcode.codes>

# Giphy API Access (For rich composer forum)
GIPHY_API_KEY=your_giphy_key_here

# Judge0 Code Execution Settings
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_API_KEY=your_judge0_key_here
```

---

### 18.3 Development Mode Features

#### A. Offline Firebase Mode
If `FIREBASE_SERVICE_ACCOUNT` is left blank in development (`process.env.NODE_ENV === "development"`):
*   API routes bypass live token validation.
*   The system uses an in-memory mocked user session (`{ uid: "mock_user", email: "juan@test.com" }`).
*   This allows developers to build and test API endpoints offline without configuring service account keys.

#### B. SMTP Local Capture
If SMTP credentials are left blank in development, Nodemailer uses the Ethereal testing service. Outgoing emails are captured and logged to the console:
`[EmailService] Sent direct Ethereal test message preview: https://ethereal.email/message/xyz...`
Developers can click the logged link to inspect the email formatting in a web browser.

---

### 18.4 Coding Standards & Guidelines

#### A. TypeScript Strictness
*   Enable strict type checks in your IDE.
*   Avoid using the `any` type. Define explicit interfaces for payloads and data models instead.
*   Make sure new interfaces are added to `src/utils/types.ts` to keep the codebase organized.

#### B. Defensive Programming Rules
*   **API Security**: Wrap all Next.js API route handlers using the `withApiErrorHandler` utility to handle errors gracefully.
*   **Null Checks**: Always run null checks on Firestore collection reads (e.g. check `doc.exists` before parsing `.data()`).
*   **Resource Cleanup**: When compiling files or spawning subprocesses, use `finally` blocks to close file descriptors and delete temporary files.

---

### 18.5 Troubleshooting Common Setup Issues

#### C++ compiler issues in local sandbox execution
*   **Symptom**: Local code execution fails on C/C++ submissions.
*   **Cause**: The host system is missing `g++` or `gcc` compiler tools.
*   **Resolution**: Install the build-essential compiler tools:
    ```bash
    sudo apt-get update
    sudo apt-get install build-essential
    ```
