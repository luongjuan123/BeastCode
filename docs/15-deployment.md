# BeastCode Platform Technical Documentation
## Section 15: Deployment Pipeline & Hosting Infrastructure

### 15.1 Firebase App Hosting Configuration

BeastCode is deployed using **Firebase App Hosting**, Google's serverless hosting platform for modern web frameworks like Next.js.

The build process is configured using `apphosting.yaml` in the project root:

```yaml
# apphosting.yaml
headers:
  - glob: "/**/*.@(js|css|woff2)"
    headers:
      - key: Cache-Control
        value: "public, max-age=31536000, immutable"

settings:
  nodeVersion: 18
  concurrency: 80
  minInstances: 1
  maxInstances: 10
```

*   **Caching Policies**: static JS, CSS, and font files are cached on CDN edge locations with a max-age of 1 year.
*   **Scale Settings**: Keeps a minimum of 1 active instance to prevent cold starts, scaling up to 10 instances during peak traffic.

---

### 15.2 Environment Variables & Secrets

API keys are split into client-visible environment variables (prefixed with `NEXT_PUBLIC_`) and secure server-only secrets:

| Variable Name | Environment Scope | Secret / Public | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client & Server | Public | Client Web SDK API Key. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`| Client & Server | Public | Target Firebase Project identifier. |
| `FIREBASE_SERVICE_ACCOUNT` | Server Only | **Secret** | Google Service Account private key JSON. |
| `JUDGE0_API_URL` | Server Only | Public | Host URL for the Judge0 instance. |
| `JUDGE0_API_KEY` | Server Only | **Secret** | Access key for Judge0 APIs. |
| `SMTP_HOST` | Server Only | Public | SMTP Server host address. |
| `SMTP_PORT` | Server Only | Public | SMTP TLS / SSL Port. |
| `SMTP_USER` | Server Only | **Secret** | SMTP username credential. |
| `SMTP_PASS` | Server Only | **Secret** | SMTP password credential. |
| `GIPHY_API_KEY` | Client & Server | **Secret** | Access token for the GIF search widget. |

---

### 15.3 Database Indexes & Storage Configuration

#### A. Firestore Composite Indexes
To support complex queries, the following composite indexes must be configured in the Firebase Console:

1.  **Submissions Index**:
    *   Collection: `submissions`
    *   Fields: `problemId` (Ascending), `timestamp` (Descending)
2.  **Threads Index**:
    *   Collection: `threads`
    *   Fields: `parentThreadId` (Ascending), `createdAt` (Ascending)
3.  **Contest Leaderboard Index**:
    *   Collection: `contest_submissions`
    *   Fields: `contestId` (Ascending), `score` (Descending), `timestamp` (Ascending)

#### B. Storage Bucket Rules
Cloud Storage holds user avatars, problem illustrations, and comment attachments. The security rules protect these assets from unauthorized modifications:
```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /attachments/{allPaths=**} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
      allow delete: if request.auth != null && request.auth.token.role == "admin";
    }
  }
}
```

---

### 15.4 Cron Scheduler Setup for Email Queue

To trigger the email queue processing loop:
1.  **Google Cloud Scheduler**: Set up a Cloud Scheduler cron job to run once per minute.
2.  **Target Configuration**:
    *   **URL**: `https://<hosting-domain>/api/notifications/process-queue`
    *   **Method**: `POST`
    *   **Auth Header**: OIDC Token using a Service Account authorized to access the function.
3.  **Timeout Limits**: Set the timeout to 55 seconds to prevent execution overlaps.
