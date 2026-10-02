# YT-WL-Gardener: Project Guide & Architecture Documentation

> **Location:** `.workspace/ARCHITECTURE_AND_DEVELOPER_GUIDE.md`  
> **Target:** Google Chrome Extension (Manifest V3)  
> **Status:** Active Development (Stage 1 Scaffold)  

---

## 1. Executive Summary & Purpose

YouTube's native "Watch Later" playlist accumulates dead, private, and fully watched videos over time. Existing cleaners are blunt "delete all" macros that wipe out intended watchlists or crash due to DOM virtualization.

**YT-WL-Gardener** provides a safe, intelligent buffer:
1. **Harvester**: Incrementally scans the playlist through virtual scrolling and deduplicates metadata into an in-memory map.
2. **Classifier**: Instantly buckets dead/unavailable videos, 100% watched videos, channels, and durations with zero API cost.
3. **Safety Net**: Exports full playlist backups (CSV / JSON) before any destructive actions.
4. **Monotonic Deletion Engine**: Sequentially purges items top-to-bottom with 450ms–600ms throttling, dropdown state locks, and instant pause/abort switches.
5. **In-Page Floating Action Button (FAB) & Drawer**: A luxury black-and-gold, frosted-glass interface injected via **Shadow DOM** at the bottom-right of YouTube playlist pages.

---

## 2. Technical Stack & Tooling

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Manifest Version** | Manifest V3 | Mandatory standard for modern Chrome Extensions. |
| **Bundler & Build** | Vite 5 + `@crxjs/vite-plugin` + TypeScript | Fast builds, HMR support for extension contexts, typed contracts. |
| **UI Framework** | React 18 + Tailwind CSS | Component modularity, rich stateful tables, zero runtime CSS injection overhead. |
| **UI Isolation** | Web Components / Shadow DOM (`open`) | **Strictly mandatory**: Prevents Tailwind styles from bleeding into YouTube and shields extension UI from YouTube's Polymer stylesheets. |
| **Monetization** | ExtensionPay (`extpay`) | Frictionless Stripe payments without requiring custom backend servers or auth databases. |
| **Icons & Design** | Lucide React + Luxury Black/Gold theme | Frosted glass (`backdrop-filter: blur(16px)`), gold metallic gradients, dented shadow effects. |

---

## 3. YouTube Platform Quirks & Architectural Constraints

Anyone working on this codebase must understand YouTube's DOM idiosyncrasies:

### 3.1 Single Page Application (SPA) Lifecycle
YouTube does not perform standard multi-page browser navigations. 
* Navigating between Home, Search, and Watch Later dispatches internal window events: `yt-navigate-finish` and `yt-page-data-updated`.
* Do not rely on page reloads. The content script must listen to `yt-navigate-finish` and inspect `window.location.href` to mount/unmount the FAB.

### 3.2 List Virtualization (`ytd-playlist-video-list-renderer`)
YouTube renders only 20–50 video items in the DOM at any given moment, recycling elements as the user scrolls.
* **The Indexer** must scroll programmatically in controlled batches, harvesting items into a `Map<string, VideoItem>` keyed by unique `videoId`.
* **The Deletion Runner** must verify if a target video element exists in the DOM. If not, it scrolls down monotonically until the node mounts before clicking.

### 3.3 The Shared Dropdown Race Condition
The 3-dot action menu is **shared** across all video rows via a singleton dropdown element (`tp-yt-iron-dropdown` / `ytd-menu-popup-renderer`).
* Clicks must follow a strict sequential state lock:
  1. Click the specific video's `yt-icon-button#button`.
  2. Wait for `tp-yt-iron-dropdown` to reach visible state (`aria-hidden="false"`).
  3. Find the menu item with text matching "Remove from Watch Later".
  4. Click the action and wait for dropdown close + row detachment.
  5. Enforce a 450ms–600ms throttle delay to avoid YouTube dropping requests.

---

## 4. Directory Structure

```text
Yubi Clean/
├── .workspace/
│   ├── PRODUCT_SPEC.md                      # Original business and product spec
│   └── ARCHITECTURE_AND_DEVELOPER_GUIDE.md  # Engineering handbook (this file)
├── manifest.json                            # Manifest V3 configuration
├── package.json                             # Dependencies & scripts
├── tsconfig.json                            # TypeScript configuration
├── vite.config.ts                           # Vite + CRXJS plugin configuration
├── tailwind.config.js                       # Theme colors (Gold/Obsidian) & shadows
├── postcss.config.js                        # PostCSS Tailwind processing
├── dist/                                    # Built production extension output
└── src/
    ├── background/
    │   └── index.ts                         # Background service worker (storage init, alarms)
    ├── content/
    │   ├── index.ts                         # Content script entrypoint (SPA listener & host mount)
    │   ├── style.css                        # Tailwind & glassmorphism styles (injected into Shadow DOM)
    │   ├── harvester.ts                     # Virtual scroll & metadata harvesting engine
    │   └── pruner.ts                        # Monotonic throttled deletion runner
    ├── ui/
    │   ├── DrawerRoot.tsx                   # React root container for the in-page drawer & FAB
    │   ├── components/                      # UI cards, filter chips, selection tables, progress bars
    │   └── theme/                           # Luxury black & gold design tokens
    ├── types/
    │   ├── index.ts                         # VideoItem, HarvesterStatus, PrunerStatus, StorageSchema
    │   └── messages.ts                      # Runtime message schemas
    └── utils/
        ├── dom.ts                           # YouTube DOM selectors & async element polling
        ├── export.ts                        # CSV, JSON, and Markdown backup generation
        └── storage.ts                       # Type-safe chrome.storage.local abstractions
```

---

## 5. Sequenced Implementation Roadmap

```
[Stage 1: Toolchain Scaffolding & MV3 Baseline] (COMPLETED)
   ├── Vite 5 + CRXJS + TypeScript + Tailwind
   └── Clean build verification (tsc & vite build)

[Stage 2: URL Detection & Injected Black/Gold Floating FAB + Shadow DOM] (COMPLETED)
   ├── SPA navigation listener (`yt-navigate-finish`)
   ├── Mount/unmount on `/playlist?list=WL` and other playlists
   └── Shadow DOM isolation with native YouTube dark/light theme

[Stage 3: The Harvester (Infinite Scroll & Playlist Scraping Engine)] (COMPLETED)
   ├── DOM query extraction (ID, title, channel, duration, progress, dead tags)
   ├── Virtual scroll stepper with deduplicating Map
   └── Real-time indexing counter and scan/stop controls in UI

[Stage 4: Local Algorithmic Classification, Filters & CSV Export] (COMPLETED)
   ├── Filter chips: Dead/Private, Watched % slider, Channel breakdown
   ├── Interactive selection table with real-time points calculator
   └── Instant CSV / JSON export trigger

[Stage 5: Safe Sequential Top-Down Deletion Engine] (UPCOMING)
   ├── Monotonic top-down deletion queue
   ├── Dropdown interaction handler with 450-600ms throttle
   └── Live progress bar + Pause/Resume/Abort controls

[Stage 6: Settings Toggle & ExtensionPay Monetization Gate]
   ├── Extension popup setting to enable/disable floating icon
   └── ExtensionPay tier enforcement (>75 video limit)

[Stage 7: Production Build, Asset Generation & CWS Metadata Readiness]
   ├── Extension icons (16px, 48px, 128px)
   ├── CHROMEWEBSTORE.md metadata and permissions justification
   └── Distribution zip artifact
```

---

## 6. How to Develop, Build, and Test

### 6.1 Install Dependencies
```bash
npm install
```

### 6.2 Build the Extension
```bash
npm run build
```
This produces a compiled, ready-to-load extension in the `./dist` folder.

### 6.3 Loading the Extension in Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** in the top-left corner.
4. Select the `dist/` directory inside this project folder (`Yubi Clean/dist`).
5. Open [YouTube Watch Later](https://www.youtube.com/playlist?list=WL) to test.
