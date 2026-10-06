# BeastCode Platform Technical Documentation
## Section 01: Project Overview

### 1.1 Executive Summary
**BeastCode** is an enterprise-grade, high-performance competitive programming and technical assessment platform. Designed as a modern, gamified, and highly secure alternative to traditional coding platforms, BeastCode offers a unified workspace for developers, students, educators, and enterprise clients. 

The platform integrates real-time sandboxed code execution, an active social discussion community, and a highly customizable contest system featuring military-grade anti-cheat algorithms. By blending high-speed execution feedback with interactive gamification mechanics (XP, tiers, milestones), BeastCode delivers an immersive and secure environment for coding practice, real-time contests, and professional skill audits.

---

### 1.2 Core Capabilities & Value Proposition

#### A. High-Concurrency Sandbox Code Execution
BeastCode features a dual-engine execution model:
*   **Local Execution**: Compiles and executes code directly on the host server using native compiler toolchains (`gcc`, `g++`, `python3`, `javac`) with real-time memory and CPU resource limits enforced at the process level.
*   **Remote Execution**: Integrates with remote Judge0 APIs, employing batch chunk processing (maximum size of 20 parallel executions) and concurrent polling to handle extreme load scenarios without request timeouts or rate-limiting failures.

#### B. Contest Security & Anti-Cheat Suite
To support official matches, class examinations, and recruitment assessments, BeastCode provides a multi-level secure exam environment:
*   **Browser Lock**: Fullscreen mode enforcement via the HTML5 Fullscreen API.
*   **Focus Tracking**: Visibility and blur listeners to capture tab switches, window resizing, or screen sharing.
*   **Automated Sanctions**: Scalable enforcement from warning triggers to immediate session termination and submission disqualification.
*   **Navigation Containment**: Event overrides that trap users within the workspace, preventing page exits or route changes while a secure contest is active.

#### C. Real-Time Leaderboards & Standings
The contest engine maintains real-time user metrics:
*   **Penalty Rules**: Custom penalty configurations (e.g., scoring time elapsed plus extra penalties for incorrect attempts).
*   **Leaderboard Freeze**: Supports hiding the scoreboard in the final minutes of a contest to build suspense and preserve matches' integrity.
*   **Virtual Mode**: Allows users to participate asynchronously in archived contests, binding the countdown timers, problems, and leaderboard rankings to the user's specific virtual session start time.

#### D. Discussion Engine & Social Threads
BeastCode features an integrated forum for problem-solving:
*   **Hierarchical Comments**: Recursive discussion trees utilizing nested comment models.
*   **Rich Media attachments**: Emojis, Gifs, Polls, and code snippets.
*   **Social Interactions**: Upvotes/likes, bookmarks, and reposts, backed by optimistic UI state updates.

#### E. Trust, Safety, & Moderation Lifecycle
A comprehensive safety suite ensures a professional community:
*   **Reports System**: Limits reports to 5 per user per day to prevent spam.
*   **Moderation Audits**: Features warning tracking, permanent/temporary suspensions, and session revocations.
*   **Account Deletion Grace Period**: Scheduled account deletion delays data purge for 14 days, allowing users to submit appeals while super-admins retain override capabilities to force immediate purges.

---

### 1.3 Intended Audience
This technical documentation is curated for:
*   **Senior Software Engineers & Maintainers**: For modifying, scaling, and maintaining the codebase.
*   **System Administrators & DevOps**: For hosting, scaling, and deployment.
*   **Enterprise Clients & Investors**: For auditing security, data handling, and architecture.
*   **Open-Source Contributors**: For understanding the data layers, coding standards, and components.
