# BeastCode Platform Technical Documentation
## Section 03: Database Architecture & Security Rules

### 3.1 Firestore Collection Schemas

BeastCode utilizes Google Cloud Firestore in Native Mode. Below is the comprehensive schema documentation for the system's core collections:

#### A. Users Collection (`/users/{uid}`)
Contains user identity, achievements, solves, and gamified progress stats.
*   **`uid`** `string`: Unique Firebase Auth ID.
*   **`username`** `string`: Unique, normalized username handle.
*   **`displayName`** `string`: User's profile display name.
*   **`email`** `string`: Primary email address.
*   **`avatarUrl`** `string`: URL to user's uploaded avatar image.
*   **`solvedProblems`** `array[string]`: Array of solved problem IDs.
*   **`easyCount`** `number`: Count of solved Easy problems.
*   **`mediumCount`** `number`: Count of solved Medium problems.
*   **`hardCount`** `number`: Count of solved Hard problems.
*   **`mlCount`** `number`: Count of solved Machine Learning problems.
*   **`xp`** `number`: Accumulated experience points.
*   **`experienceLevel`** `string`: Rank tier name (e.g., "Beginner", "Mythic").
*   **`contestParticipation`** `number`: Count of registered contests joined.
*   **`contestWins`** `number`: Count of contests finished in 1st place.
*   **`isAdmin`** `boolean`: Super-admin flag (alternative to email check).
*   **`role`** `string`: Role designation ("user" | "moderator" | "admin").
*   **`notificationPreferences`** `map`: Preference settings for notifications.
    *   **`marketing`** `boolean | map`: In-app/email options.
    *   **`contest`** `boolean | map`: In-app/email options.
    *   **`security`** `boolean | map`: In-app/email options.

#### B. Problems Collection (`/problems/{problemId}`)
Contains problem definitions, constraints, test suites, and grading logic.
*   **`title`** `string`: Problem name.
*   **`problemStatement`** `string`: Markdown problem statement.
*   **`difficulty`** `string`: "Easy" | "Medium" | "Hard" | "ML".
*   **`points`** `number`: Solve score (default: 100).
*   **`constraints`** `string`: Markdown constraints statement.
*   **`starterCode`** `string`: Initial template code provided to the user.
*   **`handlerFunction`** `string`: Verification function code or string wrapper.
*   **`starterFunctionName`** `string`: Name of the entry function.
*   **`inputFormat`** `string`: Formatting statement for stdin parameters.
*   **`outputFormat`** `string`: Formatting statement for stdout values.
*   **`examples`** `array[map]`: Test cases array.
    *   **`inputText`** `string`: Stdin input parameter string.
    *   **`outputText`** `string`: Expected stdout output string.
*   **`customChecker`** `map | null`: Verdict evaluation rules.
    *   **`type`** `string`: "exact" | "whitespace" | "float_tolerance" | "special_judge".
    *   **`epsilon`** `number | null`: Precision offset for float checks.
    *   **`scriptLanguage`** `string | null`: "python" | "cpp".
    *   **`scriptCode`** `string | null`: Source script code for Special Judge evaluation.

#### C. Submissions Collection (`/submissions/{submissionId}`)
Logs global solution attempts and sandboxed compilation metrics.
*   **`uid`** `string`: Author's user ID.
*   **`username`** `string`: Author's handle.
*   **`problemId`** `string`: Target problem ID.
*   **`problemTitle`** `string`: Target problem name.
*   **`code`** `string`: User submitted source code.
*   **`language`** `string`: Submission compiler target (e.g., "cpp", "python3").
*   **`status`** `string`: Execution stage ("pending" | "passed" | "failed" | "queued").
*   **`verdict`** `string`: Grading verdict ("Accepted" | "Wrong Answer" | "Compilation Error" | "Time Limit Exceeded" | "Memory Limit Exceeded").
*   **`score`** `number`: Points awarded (scaled based on passed test cases ratio).
*   **`runtime`** `number`: Execution time in milliseconds.
*   **`memory`** `number`: RAM usage in kilobytes.
*   **`timestamp`** `number`: Creation date millisecond epoch.
*   **`testResults`** `array[map]`: Summary of each tested input case.

#### D. Contests Collection (`/contests/{contestId}`)
Houses contest scheduling, security options, and custom parameters.
*   **`title`** `string`: Contest name.
*   **`description`** `string`: Markdown overview text.
*   **`banner`** `string`: URL to header banner image.
*   **`startTime`** `number`: Start millisecond epoch.
*   **`endTime`** `number`: End millisecond epoch.
*   **`duration`** `number`: Total solving duration in minutes.
*   **`visibility`** `string`: "public" | "private" | "password" | "university".
*   **`password`** `string | null`: Verification passcode for entry.
*   **`university`** `string | null`: Restrictive university email domain suffix.
*   **`securityLevel`** `string`: Anti-cheat level ("casual" | "standard" | "strict").
*   **`leaderboardFreeze`** `number`: Lead time prior to contest end to lock standings updates (minutes).
*   **`virtualEnabled`** `boolean`: Permits async virtual mock sessions.
*   **`penaltyRules`** `map`: Deductions configuration.
    *   **`minutesPerIncorrect`** `number`: Minutes penalty added per WA submit.

#### E. Contest Participants Collection (`/contest_participants/{contestId_uid}`)
Maintains specific participant registrations, session states, and warnings.
*   **`id`** `string`: Document ID key (`{contestId}_{uid}`).
*   **`contestId`** `string`: Reference to parent contest.
*   **`uid`** `string`: Reference to user.
*   **`username`** `string`: Normalized handle.
*   **`registeredAt`** `number`: Time of sign-up.
*   **`joinedAt`** `number | null`: Time of entering secure workspace.
*   **`status`** `string`: Access state ("registered" | "active" | "terminated").
*   **`isVirtual`** `boolean`: Virtual simulation indicator.
*   **`virtualStartTime`** `number | null`: Virtual simulation start epoch.
*   **`warningsCount`** `number`: Current anti-cheat violations logged (0 - 3).

---

### 3.2 Security Rules Specification (`firestore.rules`)

The `firestore.rules` configuration enforces data security. Below is a analysis of access policies:

#### 3.2.1 Core Helper Functions
```javascript
// Resolves if the requesting client is logged in
function signedIn() {
  return request.auth != null;
}

// Resolves if the requesting client's UID matches the target user document ID
function isOwner(userId) {
  return signedIn() && request.auth.uid == userId;
}

// Resolves if the user possesses administrator authorization.
// Verifies via: hardcoded email blacklist, isAdmin attribute in users collection, or role value.
function isAdmin() {
  return signedIn() && (
    request.auth.token.email in [
      "admin@leetcode.com", "juan@test.com", "admin@test.com", 
      "dungpubgame@gmail.com", "24110215@st.vju.ac.vn"
    ] ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"
  );
}
```

#### 3.2.2 Rule Policies Matrix

| Collection Path | Read Rules | Write Rules | Policy Details |
| :--- | :--- | :--- | :--- |
| `/users/{uid}` | `allow read: if true;` | `allow write: if isOwner(uid) \|\| isAdmin();` | Public read access for profile cards. Writes limited to owners or administrators. |
| `/problems/{pid}` | `allow read: if true;` | `allow write: if isAdmin();` | Public read access for challenge listings. Updates/creations restricted to admins. |
| `/submissions/{sub}`| `allow read: if signedIn();` | `allow create: if signedIn() && request.resource.data.uid == request.auth.uid; allow update, delete: if isAdmin();` | Users can query all submissions. Creation requires authentication matching user ID. Updates/deletions restricted to admins. |
| `/threads/{threadId}`| `allow read: if true;` | `allow create: if signedIn(); allow update: if signedIn() && (resource.data.uid == request.auth.uid \|\| isAdmin()); allow delete: if isAdmin();` | Public read access for forum listings. Authenticated users can create and update posts. Deletions restricted to admins. |
| `/contests/{cid}` | `allow read: if signedIn();` | `allow write: if isAdmin();` | Authed users can list contests. Configurations locked to administrators. |
| `/contest_participants/{id}` | `allow read: if signedIn();` | `allow write: if signedIn() && (request.resource.data.uid == request.auth.uid \|\| isAdmin());` | Authed users can view participant listings. Self-registration/updating status is permitted for matched users. |
| `/contest_integrity_events/{e}` | `allow read: if isAdmin();` | `allow create: if signedIn(); allow update, delete: if isAdmin();` | Users can write anti-cheat violations logs. Reading logs restricted to admins. |
| `/emailQueue/{task}` | `allow read, write: if isAdmin();` | `allow read, write: if isAdmin();` | Locked to backend servers / admins. |
| `/userModeration/{uid}` | `allow read: if isOwner(uid) \|\| isAdmin();` | `allow write: if isAdmin();` | Ban and suspension settings visible only to the owner or admins. Modifiable only by admins. |
