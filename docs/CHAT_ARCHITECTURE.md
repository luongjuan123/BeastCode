# BeastCode Production Real-Time Chat & Messaging Architecture

## 1. Architectural Overview & System Design

BeastCode's Real-Time Messaging System provides a Telegram / Messenger-class communication platform natively integrated into the BeastCode competitive programming and organization ecosystem. It supports 1-to-1 direct messaging (DM) and multi-tenant organization channels with role-based access control (RBAC), optimistic updates, scalable unread handling, typing presence, rich media, and security.

```
                                +---------------------------+
                                |  BeastCode Web Browser    |
                                +-------------+-------------+
                                              |
                     +------------------------+------------------------+
                     |                        |                        |
                     v                        v                        v
             Firebase Auth Token    Firestore Realtime SDK      Next.js Chat APIs
             (JWT / Session)         (Snapshot Listeners)        (/api/chat/*)
                     |                        |                        |
                     |                        |                        v
                     |                        |             withAuthAndModeration
                     |                        |                        |
                     v                        v                        v
            Firebase Auth Service    Firestore Database       Admin Firestore / Storage
            (Identity Authority)   - conversations/{cid}     - Atomic validation
                                   - messages/{mid}          - Rate limiting (Redis/FS)
                                   - members/{uid}           - Ephemeral typing
                                   - typing/{uid}            - GCS media upload
                                                               - Notification Dispatcher
```

---

## 2. Core Collections & Firestore Schema

### 2.1 `conversations/{conversationId}`
Represents a direct message thread or an organization channel.
- **Direct Message ID**: Deterministic canonical key `dm_${[uidA, uidB].sort().join("_")}`. This guarantees that User A and User B always share exactly ONE conversation.
- **Organization Channel ID**: `org_${orgId}_${channelSlug}` or generated UUID.

```typescript
interface Conversation {
  id: string; // e.g. "dm_abc_xyz" or "org_123_general"
  type: "direct" | "organization_channel";
  title: string; // e.g. "Dũng" (for DMs, resolved client-side if needed) or "General"
  description?: string; // Channel topic / description
  organizationId?: string; // Org ID if type === "organization_channel"
  organizationSlug?: string; // Org slug for navigation
  channelType?: "general" | "announcements" | "team" | "course" | "private";
  participantUids: string[]; // For DMs (2 users) and private channels
  participantDetails?: Record<string, {
    displayName: string;
    username: string;
    avatarUrl?: string;
  }>;
  lastActivityAt: number; // Server timestamp (ms) of the latest message
  lastMessagePreview: string; // Truncated excerpt or media indicator (e.g. "📷 Photo")
  lastMessageSenderId: string;
  lastMessageSenderName: string;
  lastMessageType: "text" | "code" | "image" | "file" | "voice" | "system";
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
}
```

### 2.2 `conversations/{conversationId}/messages/{messageId}`
Individual message records in a subcollection. Subcollections isolate permissions, prevent parent document size explosion, and allow efficient backward cursor pagination.

```typescript
interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  senderRole?: string; // e.g. "owner", "admin", "coach", "member"
  type: "text" | "code" | "image" | "file" | "voice" | "system";
  text: string;
  code?: {
    language: string; // "cpp", "python", "javascript", "java", etc.
    content: string;
  };
  attachments?: ChatAttachment[];
  hasAttachments?: boolean;
  replyTo?: {
    messageId: string;
    senderDisplayName: string;
    textPreview: string;
    type: string;
  };
  reactions?: Record<string, string[]>; // emoji -> array of UIDs
  isEdited?: boolean;
  editedAt?: number;
  isDeleted?: boolean; // Soft delete
  deletedAt?: number;
  deletedBy?: string;
  isPinned?: boolean;
  pinnedAt?: number;
  pinnedBy?: string;
  clientMessageId: string; // Client idempotency UUID
  createdAt: number; // Authoritative server timestamp (ms)
  mentions?: string[]; // Array of mentioned user UIDs
}
```

### 2.3 `userConversationMeta/{uid}_{conversationId}`
Per-user metadata storing read state, unread markers, mute preferences, and archive status.

```typescript
interface UserConversationMeta {
  id: string; // `${uid}_${conversationId}`
  uid: string;
  conversationId: string;
  lastReadAt: number; // Timestamp of latest read message
  lastReadMessageId?: string;
  mutedUntil?: number; // 0 = unmuted, -1 = forever, >0 = timestamp
  isArchived?: boolean;
  isPinned?: boolean;
  draftText?: string;
  updatedAt: number;
}
```

### 2.4 Ephemeral Subcollections
- **`conversations/{cid}/typing/{uid}`**:
  - `uid`: string
  - `displayName`: string
  - `expiresAt`: number (timestamp in ms, typically `now + 4000`)
- **`userBlocks/{blockerUid}_{blockedUid}`**:
  - `blockerUid`: string
  - `blockedUid`: string
  - `createdAt`: number

---

## 3. Large-Organization Unread Scalability Architecture

### The Problem
In an organization with 1,000 to 10,000+ members, a naive approach of updating every member's document on every message would require 10,000 Firestore writes per message, causing write throttling, quota exhaustion, and immense costs.

### BeastCode Scalable Design
1. **On Message Send**:
   - Write 1 message document in `conversations/{cid}/messages/{mid}`.
   - Update `conversations/{cid}` with `lastActivityAt = now`, `lastMessagePreview = text`, `lastMessageSenderId = senderUid`.
   - Total database writes: **2 writes total**, regardless of whether the channel has 5 or 50,000 members. **O(1) write cost.**
2. **Unread Evaluation**:
   - A channel is considered unread for `uid` if:
     `conversation.lastActivityAt > (userMeta.lastReadAt || 0) && conversation.lastMessageSenderId !== uid`.
3. **On Message View**:
   - When the user focuses the conversation and views the newest messages, the client issues a single debounced update to `userConversationMeta/{uid}_{cid}`: `lastReadAt = now`.
   - Total database writes: **1 write total**. **O(1) read acknowledgment.**

---

## 4. Real-time Message Flows

### 4.1 Optimistic Send Flow
```
User types text and presses Enter
   │
   ├──> 1. Client generates UUID `clientMessageId` and temporary message object
   ├──> 2. Optimistic message appended immediately to UI state (status: "sending")
   ├──> 3. Composer clears input, resets draft
   │
   ▼
POST /api/chat/conversations/[cid]/messages
   │
   ├──> Authenticate token via `withAuthAndModeration` (checks BANNED/PENDING_DELETION)
   ├──> Verify conversation membership / org channel permissions
   ├──> Check block status (for DMs)
   ├──> Rate-limiting check (max 30 msgs/minute)
   ├──> Sanitize text, validate attachments & length (<= 15,000 chars)
   ├──> Write message to Firestore (`conversations/{cid}/messages`)
   ├──> Update conversation `lastActivityAt`, `lastMessagePreview`
   ├──> Trigger `NotificationDispatcher` (in-app + web push where applicable)
   │
   ▼
Response 200 OK
   │
   ├──> Confirmed message received via Firestore `onSnapshot` listener
   └──> Optimistic message reconciled seamlessly without flicker
```

### 4.2 Error Recovery & Retry
If the network disconnects or the request fails:
- Optimistic message changes status to `"failed"`.
- A subtle inline retry icon ("Failed to send. Click to retry") appears.
- Clicking retry re-submits with the same `clientMessageId`, preventing server-side duplication.

---

## 5. Security & Access Control Model

### 5.1 Direct Message (DM) Authorization
- Only participants in `participantUids` can query or listen to the conversation and its messages.
- Non-participants receive `403 Forbidden` from API and Firestore Security Rules.
- If User A blocks User B, User B cannot send messages to User A.

### 5.2 Organization Channel RBAC
- Organization channels inherit workspace permissions from `orgEngine.ts`.
- **Public-to-Org Channels (`general`, `discussion`)**: Any active member of the organization can read and write.
- **Announcement Channels (`announcements`)**: All org members can read; only members with `organization.publishAnnouncement` or roles (`owner`, `admin`, `coach`, `instructor`) can post.
- **Private Channels**: Restricted strictly to members listed in `participantUids`.
- **Organization Membership Revocation**: When a member is suspended or removed from an organization, their access is immediately rejected by `checkOrgPermission` and security rules.

### 5.3 Attachment & Media Security
- Files are saved with randomized non-enumerable paths in GCS / protected storage: `chat/{cid}/{randomUuid}.{ext}`.
- All media downloads route through authenticated endpoint `/api/chat/attachment?id=...` which validates that the requesting user is a legitimate participant in the conversation or organization.
- Magic bytes verification enforces permitted MIME types (JPEG, PNG, WebP, GIF, PDF, TXT, WEBM, MP3) and rejects executables or scripts.
- Raw HTML is never rendered; markdown code blocks are sanitized and display-only.

---

## 6. Presence & Typing Architecture

### 6.1 Online Presence
- Reuses BeastCode's active session tracking (`activeSessions` collection) where clients heartbeat every 120s.
- Presence status is derived without redundant Firestore writes:
  - **Online**: `lastActive` within the last 180 seconds.
  - **Last seen**: Formatted relative time (e.g., "Last seen 15m ago", "Last seen yesterday").
- Privacy: No IP address, device ID, or user agent is ever exposed to chat participants.

### 6.2 Ephemeral Typing Indicators
- When typing begins, the client debounces and writes to `conversations/{cid}/typing/{uid}` with `{ displayName, expiresAt: now + 4000 }`.
- Consecutive keystrokes are throttled to at most one write every 3 seconds.
- On message send or conversation switch, the typing record is deleted immediately.
- The active conversation listens only to `conversations/{cid}/typing` and filters out entries where `expiresAt < Date.now()`.

---

## 7. Responsive UI Specification

### 7.1 Desktop Layout
- **Left Panel (320px–380px)**: Header ("Messages"), search input, tab filters (All, Direct, Organizations, Unread), conversation list with active selection indicator, unread badges, and typing indicators.
- **Center Area (Flexible)**:
  - Chat Header with participant identity, presence dot, search toggle, details toggle.
  - Virtualized / scroll-anchored message stream with date separators, consecutive message grouping, message reactions, and reply references.
  - Sticky composer with multiline auto-expand, emoji picker, code snippet modal, file attachment dropzone, and send button.
- **Right Panel (Collapsible, 280px)**: Conversation details, shared media gallery, pinned messages, mute/archive/block actions.

### 7.2 Mobile Layout
- Seamless master-detail drill-down:
  - Mobile view 1: Conversation list.
  - Mobile view 2: Full-screen conversation with back button in the header.
- Safe-area inset padding ensuring composer sits neatly above the virtual keyboard without being hidden by browser chrome.

---

## 8. Database Indexes Required
1. `conversations`: `participantUids` (ARRAY_CONTAINS) + `lastActivityAt` (DESC)
2. `conversations`: `organizationId` (ASC) + `lastActivityAt` (DESC)
3. `messages` subcollection: `createdAt` (ASC / DESC)
4. `messages` subcollection: `isPinned` (ASC) + `pinnedAt` (DESC)
5. `userConversationMeta`: `uid` (ASC) + `updatedAt` (DESC)
