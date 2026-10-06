# BeastCode Platform Technical Documentation
## Section 02: High-Level Architecture

### 2.1 System Architecture Overview

BeastCode is built on a hybrid serverless architecture leveraging Next.js (React-based Pages Router) for both the frontend and API routes, combined with Firebase as the primary backend-as-a-service (BaaS) and custom execution sandboxes.

The diagram below illustrates the flow of data and execution tasks across the system:

```mermaid
graph TD
    %% Clients
    subgraph ClientLayer ["Client Layer (React / Next.js)"]
        Browser["User Browser"]
        RecoilState["Recoil Global State"]
        FirebaseSDK["Firebase Client SDK (Auth, Firestore)"]
    end

    %% Routing
    subgraph APILayer ["Next.js Server API Layer"]
        AuthMiddleware["Auth & Moderation Middleware"]
        RunAPI["Code Runner API (/api/run)"]
        SubmitAPI["Submission API (/api/submit)"]
        ModAPI["Moderation API (/api/moderation/*)"]
        NotifAPI["Notification API (/api/notifications/*)"]
    end

    %% Database & BaaS
    subgraph FirebaseBaaS ["Firebase Cloud Services"]
        FireDB[("Cloud Firestore Database")]
        FireAuth["Firebase Auth Admin"]
        FireStorage["Cloud Storage (Attachments, Code)"]
    end

    %% Code Execution Engines
    subgraph ExecutionLayer ["Code Execution Sandboxes"]
        LocalSandbox["Local Compiler Spawner (gcc, g++, javac, python3)"]
        ProcMonitor["Process Monitor (/proc/[pid]/statm)"]
        Judge0Remote["Judge0 CE / Extra CE APIs"]
    end

    %% Notification Outbox
    subgraph EmailEngine ["Nodemailer SMTP Dispatch Engine"]
        QueueCron["Queue Processor (/api/notifications/process-queue)"]
        NodemailerSMTP["Nodemailer SMTP Transporter"]
        EtherealFallback["Ethereal Test SMTP Server"]
        MailFailsafe[("Backup 'mail' Collection")]
    end

    %% Connections
    Browser -->|Interacts| RecoilState
    Browser -->|Subscribes / Reads| FirebaseSDK
    FirebaseSDK -->|Real-time Sync (onSnapshot)| FireDB
    
    %% API Triggers
    Browser -->|HTTP POST Requests| APILayer
    AuthMiddleware -->|1. Validate JWT / Suspensions| FireAuth
    AuthMiddleware -->|2. Check User Status| FireDB
    
    RunAPI & SubmitAPI -->|Compile & Execute| ExecutionLayer
    LocalSandbox -->|RAM/CPU Limit Polling| ProcMonitor
    
    %% Storage & Database Actions
    SubmitAPI -->|Write Solutions & Results| FireDB
    ModAPI -->|Write Reports, Appeals, Suspensions| FireDB
    NotifAPI -->|Enqueue Outbox / Trace| FireDB
    
    %% Email Queue
    QueueCron -->|1. Poll Queue| FireDB
    QueueCron -->|2. Deliver Message| NodemailerSMTP
    NodemailerSMTP -->|Fallback Ethereal Preview| EtherealFallback
    NodemailerSMTP -->|Failure Failsafe| MailFailsafe
```

---

### 2.2 Core Architectural Layers

#### A. Frontend & State Management
*   **Next.js (React Pages Router)**: Services static pages alongside server-side rendered and client-side hydrated routing. 
*   **Recoil**: Manages global UI states, including authentication modals, sidebar navigation, user preferences, and code settings.
*   **Firebase Client SDK**: Directly reads and updates collections where security policies permit (e.g., discussions, announcements, profile reads).

#### B. API Gateway & Middlewares
*   **Unified Route Wrappers**: Next.js API endpoints are wrapped using utility handlers (`withApiErrorHandler` and `withAuthAndModeration`).
*   **Authentication Validation**: Decodes Firebase Auth JWT ID tokens using the `firebase-admin` SDK.
*   **Security & Suspensions Gatekeeper**: The middleware queries the `userModeration` collection for the sender's UID. If a user is banned, suspended, or flagged for deletion, requests are aborted with a `403 Forbidden` response.

#### C. Database Layer (Firestore)
*   **Real-time sync**: High-value UI components, like the contest standings leaderboard and discussion threads, utilize Firestore `onSnapshot` queries to implement instant collaborative feeds.
*   **Firebase Admin SDK**: Performs high-privilege writes, transaction rollbacks, recount calculations, and user moderation from API handlers, bypassing client-side security restrictions.

#### D. Execution Engines
*   **Local Process execution**: Uses Node.js `child_process.spawn` for compiling files inside `/tmp` directories. An in-memory polling engine queries `/proc/[pid]/statm` to track memory limits, while timers terminate slow operations.
*   **Remote Judge0 Execution**: Automatically runs code on remote nodes via REST APIs if local compilers are absent. Employs chunk-based queuing (20 solutions maximum) to ensure stability under heavy traffic.

#### E. SMTP Delivery & Email Engine
*   **Queue-Based System**: To prevent serverless timeouts and email duplicates, emails are logged in `emailQueue`.
*   **Nodemailer & Fallbacks**: The queue processor attempts to send mails via SMTP. If credentials are empty, it sets up an `Ethereal Email` mock for development. If the SMTP connection is down, it drops the email in the Firestore `mail` collection as a backup.
