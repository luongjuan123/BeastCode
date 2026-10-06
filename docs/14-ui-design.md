# BeastCode Platform Technical Documentation
## Section 14: UI Design System & Component Guidelines

### 14.1 Aesthetic Concept & Theme

BeastCode utilizes a modern dark theme with vibrant accents, glassmorphic overlays, and clean borders. 

#### A. Harmonious Colors Palette
Colors are configured using CSS variables:
*   `--bg-base`: `#0a0a0c` (Very dark grey/black background).
*   `--bg-surface`: `#121216` (Card and container backgrounds).
*   `--bg-dark-layer-1`: `#1a1a20` (Secondary cards).
*   `--bg-dark-layer-2`: `#22222a` (Inputs and borders).
*   `--brand-orange`: `#ff6f00` (Logo, hover, highlight states).
*   `--brand-orange-s`: `#e65c00` (Active states).
*   `--border-default`: `#2d2d37` (Default borders).
*   `--border-subtle`: `#1f1f26` (Subtle divider lines).
*   `--text-primary`: `#ffffff` (Primary body text).
*   `--text-secondary`: `#9ca3af` (Secondary text).
*   `--text-muted`: `#6b7280` (Disabled text).

#### B. Brand Accents & Gradients
*   **Primary Action Gradient**: `linear-gradient(to right, var(--brand-orange), #eab308)` (Orange to yellow).
*   **Glassmorphism Overlays**: `backdrop-filter: blur(12px) saturate(180%)`. Used on sticky navigation menus, popup modals, and sliding panels.
*   **Shadow Glows**: `box-shadow: 0 0 20px rgba(255, 111, 0, 0.15)` (Subtle brand orange glow).

---

### 14.2 Typography System

The platform uses Google Fonts:
*   **Headings**: `font-family: 'Outfit', sans-serif`. Heavy font weights (700, 800) create a modern look.
*   **Body Copy**: `font-family: 'Inter', sans-serif`. Optimized for readability, letter spacing, and line height.
*   **Code Workspaces**: `font-family: 'JetBrains Mono', 'Fira Code', monospace`. Monospace sizing ensures clean formatting inside the editor.

---

### 14.3 Core Layout Components

#### A. Topbar
*   **Sticky Header**: Implements backdrop filters (`blur(12px)`) and a subtle bottom border.
*   **User Hub**: Displays the user's avatar, level badges, and XP counters. Clicking opens a dropdown menu to navigate to settings or log out.

#### B. Workspace Split-Pane Layout
Used on the problem page to organize content:
*   **Left Pane (Problem Info)**: Displays tabs for description markdown, submissions history, and discussions.
*   **Right Pane (Code Workspace)**: Includes the editor controls, code editor, and run panel.
*   **Resizer Bar**: Drag handler to resize the left and right panels.

#### C. SecondaryNav
*   **Interactive Tabs**: Used on the admin panel, profiles, and contests to switch views without page reloads.
*   **Indicators**: Uses sliding highlights to show the active tab.

---

### 14.4 Mobile Responsive Adaptability

*   **Grid Layouts**: Layout columns collapse dynamically on smaller screens (e.g., `grid-cols-1 lg:grid-cols-12`).
*   **Mobile Topbar**: Menu options collapse into a hamburger menu drawer on screens smaller than 640px.
*   **Workspace Adaptation**: On mobile devices, the split-pane layout stacks vertically into single-scroll blocks.

---

### 14.5 Micro-Animations & State Transitions

*   **Interactive Hover Effects**: Buttons translate upward slightly on hover: `transition: all 0.2s ease; transform: translateY(-1px)`.
*   **Spinning Loaders**: Spinning animations (`animate-spin`) indicate loading states.
*   **Optimistic UI Updates**: Toggling buttons (e.g., likes, bookmarks) immediately updates their visual state on click while database requests are processed in the background.
