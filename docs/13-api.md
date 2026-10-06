# BeastCode Platform Technical Documentation
## Section 13: REST API Reference & Payload Specifications

### 13.1 Code Execution APIs

#### A. Run Test Cases
*   **Endpoint**: `POST /api/run`
*   **Access Control**: Authenticated Users.
*   **Payload Schema**:
    ```json
    {
      "code": "def twoSum(nums, target):\n    return [0, 1]",
      "language": "python3",
      "problemId": "two-sum"
    }
    ```
*   **Response Schema (Success)**:
    ```json
    {
      "success": true,
      "verdict": "Passed",
      "totalRuntimeMs": 85,
      "totalMemoryKb": 1240,
      "testResults": [
        {
          "testCaseIndex": 0,
          "status": "Accepted",
          "runtimeMs": 42,
          "memoryKb": 1240,
          "stdout": "[0, 1]",
          "expected": "[0, 1]"
        }
      ]
    }
    ```

#### B. Submit Code Solution
*   **Endpoint**: `POST /api/submit`
*   **Access Control**: Authenticated Users.
*   **Payload Schema**:
    ```json
    {
      "code": "def twoSum(nums, target):\n    return [0, 1]",
      "language": "python3",
      "problemId": "two-sum"
    }
    ```
*   **Response Schema (Success)**:
    ```json
    {
      "success": true,
      "verdict": "Accepted",
      "scoreAwarded": 100,
      "xpGained": 10,
      "levelUpgraded": false,
      "currentLevel": "Intermediate"
    }
    ```

---

### 13.2 Account Recovery & Preferences

#### A. Forgot Password Link Dispatch
*   **Endpoint**: `POST /api/forgot-password`
*   **Access Control**: Public.
*   **Payload Schema**:
    ```json
    {
      "email": "user@test.com"
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "message": "Reset link enqueued and sent to user email."
    }
    ```

#### B. Global Unsubscribe
*   **Endpoint**: `POST /api/unsubscribe`
*   **Access Control**: Public.
*   **Payload Schema**:
    ```json
    {
      "email": "user@test.com",
      "hash": "4f9712a83bc..."
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "message": "Email address unsubscribed from all platform communications."
    }
    ```

---

### 13.3 Trust & Safety / Moderation APIs

#### A. File a User Report
*   **Endpoint**: `POST /api/moderation/report`
*   **Access Control**: Authenticated Users (rate limited: 5 per day).
*   **Payload Schema**:
    ```json
    {
      "reportedUid": "user_id_123",
      "category": "spam",
      "description": "Spamming commercial links in thread forums.",
      "evidenceScreenshotUrl": "https://storage.googleapis.com/.../img.png"
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "caseId": "rep_987123912",
      "message": "Complaint logged. Moderation audit pending."
    }
    ```

#### B. Appeal a Suspension or Deletion
*   **Endpoint**: `POST /api/moderation/appeal`
*   **Access Control**: Suspended Users.
*   **Payload Schema**:
    ```json
    {
      "caseId": "rep_987123912",
      "appealText": "The posted links were reference docs, not spam. Requesting review."
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "message": "Appeal submitted. The deletion countdown is paused during review."
    }
    ```

#### C. Ban Action (Admin Only)
*   **Endpoint**: `POST /api/admin/moderation/ban`
*   **Access Control**: Admin Guard / Whitelist.
*   **Payload Schema**:
    ```json
    {
      "targetUid": "user_id_123",
      "action": "BAN_TEMPORARY",
      "durationDays": 7,
      "reason": "Repeated community guidelines infractions"
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "actionLoggedId": "log_897123912"
    }
    ```

#### D. Account Deletion Scheduling (Admin Only)
*   **Endpoint**: `POST /api/admin/moderation/delete`
*   **Access Control**: Admin Guard.
*   **Payload Schema**:
    ```json
    {
      "targetUid": "user_id_123",
      "forceImmediate": false
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "deletionGracePeriodActive": true,
      "deletedAt": 1782398412000
    }
    ```

---

### 13.4 Notifications & Background Queue APIs

#### A. Dispatch Notification Action
*   **Endpoint**: `POST /api/notifications/dispatch`
*   **Access Control**: Authenticated Users.
*   **Payload Schema**:
    ```json
    {
      "eventType": "THREAD_LIKE",
      "recipientUid": "recipient_id_abc",
      "placeholders": {
        "threadTitle": "Two Sum Explanation"
      },
      "ctaUrl": "/threads/thread_id_xyz",
      "metadata": {
        "threadId": "thread_id_xyz"
      }
    }
    ```
*   **Response Schema**:
    ```json
    {
      "success": true,
      "inAppAlertId": "alert_98712",
      "emailQueuedId": "mail_task_4821"
    }
    ```

#### B. Trigger Email Queue Execution
*   **Endpoint**: `POST /api/notifications/process-queue`
*   **Access Control**: Public (or protected via secure cron headers).
*   **Response Schema**:
    ```json
    {
      "success": true,
      "processedCount": 3,
      "totalDurationMs": 1450,
      "details": [
        {
          "id": "mail_task_4821",
          "recipient": "recipient@test.com",
          "status": "sent",
          "previewUrl": "https://ethereal.email/message/..."
        }
      ]
    }
    ```
