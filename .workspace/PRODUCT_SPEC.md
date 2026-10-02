# Product Specification: YouTube Watch Later Smart Purger & Organizer

> **Internal Codename:** `YT-WL-Gardener`  
> **Target Platform:** Google Chrome Extension (Manifest V3)  
> **Core Premise:** Transform an unmanageable, thousands-deep YouTube "Watch Later" playlist into an intelligent, categorized, and safely cleanable media library.

---

## 1. Product Overview & Problem Statement

### 1.1 The Core Pain Point
Every active YouTube user treats "Watch Later" as a temporary bookmarking inbox. Over months and years, this inbox metastasizes into an overwhelming backlog of 500–5,000 videos. 

Users face three specific barriers when trying to clean it:
1. **Dead / Unavailable Clutter:** Deleted, private, or region-blocked videos remain as unplayable ghost placeholders with no batch removal option.
2. **Zombie Watched Videos:** Videos already completed (red progress bar at 100%) still sit in the list because YouTube does not reliably auto-remove them across all clients.
3. **The "All-or-Nothing" Dilemma:** Existing cleaner extensions are blunt instruments—they offer a single "Delete Everything" macro button. Users hesitate to run them because buried inside those 1,000 videos are 20–30 high-value tutorials or talks they genuinely intend to watch.
4. **DOM & Virtualization Bottlenecks:** YouTube lazy-loads playlist items dynamically. Simple DOM clickers freeze, lose sync, or crash when attempting to process long playlists.

### 1.2 The Solution
A Chrome Extension that introduces an **intermediate state** between viewing and deleting:
1. Smoothly scans and indexes the playlist into a local structured metadata array (`Map<VideoID, VideoMeta>`).
2. Provides instant algorithmic pruning (dead videos, 100% watched videos, channel grouping).
3. Offers optional AI-driven semantic clustering (grouping videos by topic, mood, or custom intent).
4. Gives the user an interactive review dashboard before initiating an automated, background-throttled deletion sequence with zero data loss (auto-export to CSV/Markdown).

---

## 2. Technical Architecture & How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                       YOUTUBE DOM                           │
│                (youtube.com/playlist?list=WL)               │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 1. Virtual Scroll & Inspect   │ 5. Sequenced Click Execution
               ▼                              │    (Throttled 400-600ms)
┌──────────────────────────────────────────────┴──────────────┐
│                    CONTENT SCRIPT ENGINE                    │
│  - Virtual scroll down trigger                              │
│  - Metadata extraction: Title, Channel, Duration, Progress  │
│  - Availability status check (Private / Deleted)            │
└──────────────┬──────────────────────────────────────────────┘
               │ 2. Extracted In-Memory Array
               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PRUNING & FILTERING LAYER                   │
│                                                             │
│  [Stage 1: Local Algorithmic Filters] (Instant, 0 API Cost) │
│    - Dead / Unavailable / Deleted flag                      │
│    - Watched % calculation (progress bar width check)       │
│    - Duration bucketing (<5m, 5-20m, >1h)                   │
│    - Channel aggregation & count                            │
│                                                             │
│  [Stage 2: Semantic AI Clustering] (Batch Payload)          │
│    - Compact JSON payload (Titles + Channels only)          │
│    - Clustered via lightweight LLM (Gemini Flash)           │
│    - Custom user query matching                             │
└──────────────┬──────────────────────────────────────────────┘
               │ 3. Hydrated Categorized State
               ▼
┌─────────────────────────────────────────────────────────────┐
│                EXTENSION UI (SIDE PANEL / MODAL)            │
│  - Categorized selection chips & count                      │
│  - Search & custom prompt filter                            │
│  - "Export Backup" (CSV / Markdown)                         │
│  - Deletion Queue Review & Confirmation                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Metadata Extraction Pipeline
The extension scans playlist elements (`ytd-playlist-video-renderer`):
* **Video ID:** Extracted from anchor `href` (`v=XXXXXX`).
* **Title:** Cleaned string from `#video-title`.
* **Channel Name:** From `#channel-name a`.
* **Watch Progress:** Calculated from `#progress` style width percentage (`0%` to `100%`).
* **Duration:** Cleaned timestamp string from badge metadata.
* **Dead / Unavailable Flag:** Detected by checking for specific placeholder text (`[Private video]`, `[Deleted video]`) or disabled anchor states.

### 2.2 Execution & Safe Deletion Engine
To eliminate race conditions and DOM displacement errors:
1. **Safe Throttling:** Simulates user interaction on the video's menu button (`yt-icon-button`), waits for popup registration (`tp-yt-iron-dropdown`), executes the "Remove from Watch Later" action, and pauses for `450ms–600ms`.
2. **Dynamic In-View Re-anchoring:** If an item in the deletion queue is off-screen due to virtualization, the content script scrolls that item into view before executing.
3. **Fail-Safe Abort:** The user can pause or cancel the deletion queue at any moment with an instant-stop switch.

---

## 3. Tier Limitations & Feature Matrix

To prevent the "one-and-done" churn trap, functionality is divided between fast instant utility and advanced batch automation.

| Feature | Free Tier | Deep Clean Pass (\$4.99) | Lifetime / Pro (\$9.99) |
| :--- | :---: | :---: | :---: |
| **Max Videos Processed per Run** | Up to 75 videos | Up to 1,000 videos | Unlimited |
| **Dead & Unavailable Video Purge** | Unlimited | Unlimited | Unlimited |
| **100% Watched Video Purge** | Up to 75 videos | Unlimited | Unlimited |
| **Backup Export (CSV / Markdown)** | Full backup | Full backup | Full backup |
| **Channel / Duration Aggregation** | Basic | Advanced | Advanced |
| **AI Semantic Topic Clustering** | 1 sample run (30 items) | 5 runs | Unlimited (Fair Use) |
| **Natural Language Filter Prompt** | ❌ | ✅ | ✅ |
| **Background Auto-Gardener Mode** | ❌ | ❌ | Optional Recurring (\$2.99/mo) |

---

## 4. Monetization & Pricing Strategy

### 4.1 The Economics of Avoiding Subscriptions
* **Why Subscriptions Fail Here:** Users clean a playlist once every 2–4 months. Forcing a monthly subscription creates immediate friction, high cancellation rates, and negative reviews.
* **The Solution:** A high-converting one-time purchase with a low cognitive barrier:
  1. **Free Tier:** Builds trust, solves the immediate dead-video annoyance, proves the extension works.
  2. **\$4.99 "Deep Clean Pass":** Targeted at users with a single moderate backlog (up to 1,000 videos).
  3. **\$9.99 "Lifetime License":** Unlimited scans, lifetime access to updates, advanced AI grouping. Primary revenue driver.
  4. **\$2.99/mo "Auto-Gardener" (Optional Upsell):** Runs headless weekly sweeps to auto-purge 100% watched videos in the background.

### 4.2 Payment Infrastructure
* Implemented via **ExtensionPay** (or Stripe Checkout / Lemon Squeezy) directly inside the extension popup.
* Licensing tied to user email / Chrome sync account; requires zero dedicated authentication backend servers.

---

## 5. Product Development Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     STAGE 1     │────▶│     STAGE 2     │────▶│     STAGE 3     │────▶│     STAGE 4     │
│   DOM MVP &     │     │ UI Dashboard &  │     │  Payment Gate & │     │ Store Launch &  │
│ Scraper Engine  │     │ Backup Exporter │     │ AI Clustering   │     │  Distribution   │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Stage 1: DOM MVP & Core Extraction (Days 1–3)
- [ ] Initialize Chrome Extension Manifest V3 structure.
- [ ] Implement virtual scroll handler on `youtube.com/playlist?list=WL`.
- [ ] Extract DOM attributes into a typed JavaScript `VideoItem` array.
- [ ] Implement single-item and sequential multi-item deletion automation with resilient selector fallback.

### Stage 2: Pruning Logic & UI Dashboard (Days 4–7)
- [ ] Build side panel / popup UI (clean, dark-themed, zero clutter).
- [ ] Implement local filters:
  - Dead / Unavailable detector.
  - Watched percentage filter slider (`>50%`, `>90%`, `100%`).
  - Channel distribution counter.
- [ ] Build **Export to CSV / Markdown** feature (creates immediate trust before user deletes anything).
- [ ] Visual Deletion Queue with progress counter and pause/resume controls.

### Stage 3: AI Clustering & Monetization (Days 8–11)
- [ ] Integrate ExtensionPay for seamless license verification.
- [ ] Implement paywall triggers on video count (>75) and custom AI prompt filters.
- [ ] Implement batch semantic clustering using compact title/channel payload via Gemini Flash API.
- [ ] Add natural language prompt input: *"Select all podcasts longer than 45 minutes"* or *"Keep web dev tutorials, mark gaming clips for deletion."*

### Stage 4: Polish, Store Submission & Distribution (Days 12–15)
- [ ] Handle edge cases: DOM mutation changes, network timeouts, playlist re-indexing.
- [ ] Generate store assets: icon, 1280x800 showcase screenshots, privacy declaration.
- [ ] Submit to Chrome Web Store review.
- [ ] Launch outreach: short 30-second screen recordings on Reddit (`r/youtube`, `r/productivity`, `r/webdev`).

---

## 6. End-State Vision (The Final Product)

### 6.1 Look and Feel
* **Interface Form Factor:** Modern Chrome Side Panel (`chrome.sidePanel`), seamlessly docking beside the YouTube tab without obscuring the video viewport.
* **Theme:** Native dark-mode matching YouTube's design system (neutral dark background, rounded corners, clean monospace progress readouts).
* **Information Density:** High utility, low decoration.

### 6.2 The Ideal User Journey
1. User navigates to their YouTube Watch Later playlist with 1,240 videos.
2. Clicks the extension icon. Side panel slides open.
3. Clicks **"Scan Playlist"** → Extension scrolls and indexes all 1,240 videos in ~15 seconds.
4. Summary card displays:
   * **Dead / Private:** 38 videos `[Select All]`
   * **100% Watched:** 142 videos `[Select All]`
   * **Top Channels:** Fireship (18), Lex Fridman (9), Kurzgesagt (12)
5. User clicks **"Backup to CSV"** (saves list locally).
6. User clicks **"Prune 180 Selected Items"**.
7. Progress bar runs: `Deleting 42/180 (Est. 52s remaining)...`
8. Done. Zero stress, zero manual clicks, no valuable video lost.
