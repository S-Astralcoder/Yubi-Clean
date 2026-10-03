# Chrome Web Store Submission & Metadata Guide: YT-WL-Gardener

> **Extension Name:** YT-WL-Gardener - YouTube Watch Later Purger  
> **Manifest Version:** 3  
> **Target Audience:** YouTube users with cluttered "Watch Later" or custom playlists (500–5,000+ videos).

---

## 1. Store Listing Metadata

### 1.1 Item Details
* **Name:** `YT-WL-Gardener - YouTube Watch Later Purger`
* **Summary / Short Description (132 characters max):**  
  `Smart, categorizable, and safe YouTube Watch Later and playlist cleaner. Purge watched, private, or dead videos with zero data loss.`
* **Category:** `Productivity` > `Workflow & Planning`
* **Language:** `English`

---

### 1.2 Detailed Description (Formatted for Chrome Web Store)

```markdown
Turn your overwhelming YouTube "Watch Later" playlist into an organized, clean library.

Most playlist cleaners are blunt instruments—they offer a single "Delete Everything" button that wipes out videos you genuinely wanted to keep. Others crash when trying to scroll through playlists with hundreds of videos.

YT-WL-Gardener introduces a safe, intelligent review workflow between viewing and deleting.

═══════════════════════════════════════
✦ KEY FEATURES
═══════════════════════════════════════

1. ⚡ High-Speed Playlist Harvester
   • Indexes thousands of videos in seconds using a non-blocking virtual scroll engine.
   • Captures titles, channels, durations, watch progress percentages, and availability flags.

2. 🔍 Smart Local Categorization
   • Dead / Unavailable Filter: Instantly isolate and select deleted, private, or region-blocked videos.
   • 100% Watched Filter: Catch zombie videos with completed red playback bars that YouTube failed to auto-remove.
   • Shorts Filter: Filter out short-form clips (< 60s) from long-form content.
   • Search & Filter: Live filter by video title or channel name with real-time selection counters.

3. 🛡️ Safe Top-Down Deletion Engine
   • Monotonic top-down deletion queue: prevents YouTube virtual-list displacement bugs.
   • Dropdown automation with human-like throttling (600ms) to ensure YouTube network requests register reliably.
   • Non-blocking floating HUD: The cleaner collapses into a compact floating widget in the corner so you can visually watch YouTube remove items in real time.
   • Pause, resume, or abort cleanup at any time with zero risk.

4. 💾 Zero Data Loss Backup
   • Export your entire playlist or selected items to CSV or JSON with a single click before deleting.
   • Keep an offline archive of every video title, channel, duration, and URL.

5. 🎨 Native YouTube Experience
   • Seamlessly matches YouTube's Dark and Light modes using YouTube's exact design tokens.
   • Isolated Shadow DOM architecture guarantees zero styling conflicts with YouTube's Polymer elements.
   • Toggle the in-page button on or off instantly from the extension toolbar popup.

═══════════════════════════════════════
✦ PRIVACY & DATA SAFETY
═══════════════════════════════════════

• 100% Local: All scraping, filtering, and indexing occurs exclusively inside your browser's local memory.
• Zero Tracking: No analytics, no telemetry, and no third-party tracking scripts.
• No Account Access: Operates strictly by interacting with the YouTube interface in your active tab. Your Google credentials and passwords are never accessed.

═══════════════════════════════════════
✦ HOW TO USE
═══════════════════════════════════════

1. Open your YouTube Watch Later playlist (youtube.com/playlist?list=WL).
2. Click the floating "Gardener" button in the bottom-right corner.
3. Click "Scan Playlist" to index your videos.
4. Select bulk categories (Dead, Watched, Shorts) or pick individual items.
5. (Optional) Click "Export Backup" to save a local CSV file.
6. Click "Clean Selected" to run the automated pruning queue.
```

---

## 2. Permissions Justification (For Chrome Reviewers)

When submitting Manifest V3 extensions, Google requires strict justification for every declared permission:

| Permission | Justification for Chrome Web Store Review |
| :--- | :--- |
| `storage` | Required to persist user preferences (floating button toggle, scroll delay settings), cached metadata records, and quota balances locally via `chrome.storage.local`. No data is uploaded externally. |
| `tabs` | Required by the extension toolbar popup to detect whether the user's active tab is on a supported YouTube playlist URL (`youtube.com/playlist?list=...`) and provide a quick-navigation link to open Watch Later if not already open. |
| Host: `*://*.youtube.com/*` | Required to inject the content script on YouTube playlist pages (`/playlist?list=WL` and custom playlists) to extract DOM metadata for the user's playlist videos and automate the 3-dot action menu deletion sequence. |

---

## 3. Single Purpose Compliance Declaration

* **Chrome Web Store Single Purpose Statement:**  
  *"The single purpose of YT-WL-Gardener is to help users safely categorize, back up, and sequentially prune watched and unavailable videos from their YouTube playlists."*

---

## 4. Privacy Policy & Data Handling

### Data Collection & Usage Declaration
* **Personally Identifiable Information (PII):** NOT collected.
* **Health Information:** NOT collected.
* **Financial and Payment Information:** Handled externally by standard payment processors (e.g., ExtensionPay / Stripe). No credit card numbers or banking data ever touch the extension code.
* **Authentication Information:** NOT collected.
* **Personal Communications:** NOT collected.
* **Location:** NOT collected.
* **User Activity / Web History:** Scoped strictly to `youtube.com/playlist` URLs for playlist maintenance only. No browsing history across other domains is accessed, stored, or transmitted.
* **Website Content:** Video titles, channels, and watch progress are processed in browser memory and saved to `chrome.storage.local` solely for playlist management.

---

## 5. Asset Checklist for Chrome Web Store Developer Dashboard

Before publishing:
- [x] **16x16 Extension Icon** (`icons/icon16.png`)
- [x] **32x32 Extension Icon** (`icons/icon32.png`)
- [x] **48x48 Extension Icon** (`icons/icon48.png`)
- [x] **128x128 Extension Icon** (`icons/icon128.png`)
- [ ] **Store Marquee Screenshot 1 (1280x800):** Dashboard Overview with category filter chips and video table.
- [ ] **Store Marquee Screenshot 2 (1280x800):** Real-time scanning and points cost calculator.
- [ ] **Store Marquee Screenshot 3 (1280x800):** Non-blocking top-right floating progress HUD during deletion.
- [ ] **Small Promo Tile (440x280):** Extension logo with tagline *"Clean your Watch Later inbox in seconds."*
