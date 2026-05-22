# MASTER DOCUMENTATION — Studio Color
> **Living Document.** Update this file after every completed task.  
> Last Updated: 2026-05-11

---

## 0. How to Use This Document (For AI Models)

If you are an AI model (Gemini, Claude, GPT, etc.) picked up to work on this project, **read this entire document before touching any code**. It contains:

- What this product IS and WHO it is for
- The exact technology stack and why those choices were made
- The complete current architecture with file-by-file explanations
- Established patterns — follow them, do NOT reinvent
- Known pitfalls and bugs that have already been solved
- What has been done and what is yet to do
- How to approach any new task the user gives

Do not ask the user to explain the project. This document is the source of truth.

---

## 1. Product Vision

**Studio Color** is a production-grade mobile coloring application designed for publication on the **Google Play Store** and **Apple App Store** via **Bubblewrap / TWA (Trusted Web Activity)** packaging.

### Who Uses It
- **End Users (Players):** Open the app, pick a "set" from the gallery, then **swipe their finger** across the screen to magically reveal a hidden colored image underneath a black-and-white line art overlay. At 95% revealed, audio plays and the full image unfades. At 100%, a corresponding video plays.
- **The Owner (Admin):** Navigates directly to `/admin` (URL-only, no visible link from the app), uploads sets of 4 assets each (line art, colored image, audio, video).

### Core Mechanic — "Magic Reveal"
The user draws on the screen with no color selected. Their finger **erases** a line art canvas layer sitting on top of a colored image. The colored image shines through wherever they draw — creating the illusion of "magic color appearing" when in reality the monochrome overlay is dissolving.

### Core Philosophy
- **Mobile-first, native-feeling.** No scrollbars, no browser UI bleed-through.
- **Offline-capable.** No external database, no mandatory API calls at runtime.
- **Production grade.** Zero console errors, smooth animations, stable across sessions.

---

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16.2.4** (Turbopack) | SSR + file-system API routes |
| Game Engine | **Phaser 4** (`^4.0.0`) | Canvas rendering, input handling, texture management |
| State Management | **Zustand 5** | Lightweight global store bridging React ↔ Phaser |
| Styling | **Tailwind CSS 4** | Utility-first |
| Language | **TypeScript** | Full type safety |
| Database | **JSON file** (`/data/sets.json`) | No external service, works offline in TWA |
| Asset Storage | **Local disk** (`/public/uploads/sets/[id]/`) | Served as static files by Next.js |

> ⚠️ **Critical Rule:** This project uses **Next.js 16**, not 14 or 15. Always read `/node_modules/next/dist/docs/` before using any unfamiliar Next.js API.

---

## 3. Project Structure

```
PhaserDev/
├── data/
│   └── sets.json             ← JSON "database" of uploaded sets
├── public/
│   ├── assets/               ← Static assets (old lineart.png kept for reference)
│   └── uploads/
│       └── sets/             ← Admin-uploaded sets, each in own [id]/ subfolder
│           └── [id]/
│               ├── lineart.png
│               ├── colored.png
│               ├── audio.mp3
│               └── video.mp4
├── src/
│   ├── app/
│   │   ├── layout.tsx        ← Root HTML, metadata, PWA viewport config
│   │   ├── page.tsx          ← Root page: phone-frame shell + PhaserGame
│   │   ├── globals.css       ← Global styles: scrollbar hiding, body lock
│   │   ├── admin/
│   │   │   ├── layout.tsx    ← Admin route layout (enables scrolling)
│   │   │   └── page.tsx      ← Admin Control Panel — URL-only, no link from app
│   │   └── api/
│   │       ├── proxy/
│   │       │   └── route.ts  ← CORS proxy for external image URLs
│   │       └── sets/
│   │           ├── route.ts  ← GET: list sets | POST: upload 4-asset set
│   │           └── [id]/
│   │               └── route.ts ← DELETE: remove set folder + DB entry
│   ├── components/
│   │   ├── Gallery.tsx       ← Player gallery: shows coloredArt thumbnails
│   │   └── PhaserGame.tsx    ← Editor UI overlay + Phaser canvas host
│   ├── game/
│   │   ├── EventBus.ts       ← Phaser Events emitter for React↔Phaser comms
│   │   ├── game.ts           ← Phaser.Game config + scene registration
│   │   └── scenes/
│   │       ├── Boot.ts       ← Initial load scene
│   │       ├── Preloader.ts  ← Asset preloading
│   │       └── MainGame.ts   ← Magic Reveal engine (all drawing logic)
│   └── store/
│       └── useGameStore.ts   ← Zustand store (all shared state)
├── MASTER_DOCS.md            ← This file
├── AGENTS.md                 ← AI agent rules (always read this)
├── next.config.ts            ← Next.js config
└── package.json
```

---

## 4. Architecture Deep-Dive

### 4.1 App Shell (`src/app/page.tsx`)

The root page renders a **phone-frame shell** for desktop preview. On mobile TWA, it collapses to full viewport.

### 4.2 Global State (`src/store/useGameStore.ts`)

```typescript
interface ColorSet {
    id: string;
    name: string;
    lineArtUrl: string;
    coloredArtUrl: string;
    audioUrl: string;
    videoUrl: string;
    createdAt: string;
}

interface GameStore {
    gameState: 'BOOT' | 'GALLERY' | 'PLAYING' | 'COMPLETE';
    selectedSet: ColorSet | null;    // Full set object (not just URL)
    brushSize: number;               // 10–80px erase brush radius
    isAssetLoading: boolean;
    setGameState, setSelectedSet, setBrushSize, setIsAssetLoading
}
```

**Removed from store:** `selectedColor`, `activeTool`, `selectedLineArt` — no longer needed.

### 4.3 React ↔ Phaser Communication

| React Emits | Phaser Listens | Purpose |
|---|---|---|
| `ui-brush-size` | `MainGame.setupUIListeners` | Slider → erase brush size |

| Phaser Emits | React Listens | Purpose |
|---|---|---|
| `reveal-progress` | `PhaserGame.tsx` | Updates progress bar (0.0–1.0) |
| `reveal-95` | `PhaserGame.tsx` | Triggers audio playback |
| `reveal-complete` | `PhaserGame.tsx` | Shows video overlay |

### 4.4 PhaserGame Component (`src/components/PhaserGame.tsx`)

- When `gameState === 'GALLERY'`: renders `<Gallery />`, hides canvas
- When `gameState === 'PLAYING'`: shows canvas + minimal top bar + bottom dock
- When `isComplete` is true: renders full-screen `<video>` overlay
- Contains: hidden `<audio ref={audioRef}>` element, `revealPct` state, `isComplete` state
- Uses `prevSetIdRef` (same pattern as old `prevArtRef`) to prevent double scene restarts

**Bottom dock contains ONLY:**
- Animated progress bar (indigo → orange-red at 95%)
- Brush size slider with small/large circle icons
- "Swipe to reveal ✨" hint text

**Removed from UI:**
- Color palette (18 color dots)
- Tool buttons (Brush / Fill / Eraser)
- Undo / Redo buttons

### 4.5 MainGame Scene (`src/game/scenes/MainGame.ts`) — Magic Reveal Engine

#### Rendering Architecture (Two-Layer System)

```
Layer 1 (bottom, z=0): coloredImage    — Full colored artwork. Static. Always visible.
Layer 2 (top, z=1):    maskImage       — Off-screen canvas showing line art. Gets ERASED.
```

The `maskCanvas` (HTMLCanvasElement) starts filled with the line art image at full opacity.  
The `maskImage` is a Phaser Image displaying this canvas as a live texture.  
Brush strokes use `destination-out` composite operation to erase the mask canvas.  
The colored image shines through wherever the mask is erased.

#### Asset Loading

1. `setIsAssetLoading(true)` → spinner shown
2. Both `lineArt` and `coloredArt` URLs are loaded via `this.load.image()`
3. External URLs proxied through `/api/proxy`
4. On `complete`: colored image placed at back, line art drawn onto `maskCanvas`, texture refreshed
5. `setIsAssetLoading(false)` → user can draw

#### Erase Mechanic

```
eraseAt(fromX, fromY, toX, toY):
  Interpolate positions along path (step size = brushRadius * 0.4 for no gaps)
  For each point:
    ctx.globalCompositeOperation = 'destination-out'
    Draw radial gradient: rgba(0,0,0,1) center → rgba(0,0,0,0) edge
    Creates soft "magic brush" erase effect
  Refresh Phaser texture
```

#### Completion Detection

```
checkRevealProgress() — called on every pointerup:
  Sample maskCanvas alpha channel (every 4th pixel for performance)
  transparent pixels / totalPixels = revealPercent
  EventBus.emit('reveal-progress', revealPercent)
  if revealPercent >= 0.95 AND not yet triggered:
    triggered95 = true
    EventBus.emit('reveal-95')
    Tween: maskImage.alpha → 0 over 2.2 seconds (Sine.easeInOut)
    On tween complete: EventBus.emit('reveal-complete')
```

#### Removed from MainGame
- `collisionMap`, `generateCollisionMap()`
- BFS flood fill engine
- `historyStack`, `redoStack`, undo/redo
- `currentColorHex`, tool switching

### 4.6 Gallery (`src/components/Gallery.tsx`)

- Fetches from `/api/sets`
- Shows `coloredArtUrl` as tile thumbnail (vibrant preview)
- Faint `lineArtUrl` overlay at `opacity-30 mix-blend-multiply` — teases the mechanic, fades on hover
- Empty state: "No coloring pages yet. Ask the admin to add some!"
- `handleSelect`: `setSelectedSet(set)` then `setGameState('PLAYING')`
- **No link to `/admin` anywhere** — completely hidden from players

### 4.7 Admin Panel (`src/app/admin/page.tsx`)

- Accessed **only by typing `/admin` in the browser URL bar** — no player-facing link
- Dark mode (`#0a0a0f` background)
- Upload form: Set Name + 4 `FileDropZone` components (drag-and-drop or click-to-browse)
  - Line Art (image)
  - Colored Art (image)  
  - Audio (mp3/wav)
  - Video (mp4/webm)
- "Upload Set to Gallery" button: disabled until all 4 + name filled
- Gallery Library: grid showing all uploaded sets with 4 asset badges + delete (double-tap confirm)

### 4.8 API Routes

**`/api/sets` (GET | POST)**
- GET: reads `data/sets.json`, returns array of `ColorSet`
- POST: accepts `multipart/form-data` with `name`, `lineArt`, `coloredArt`, `audio`, `video`
  - Creates `/public/uploads/sets/[id]/` folder
  - Saves all 4 files (e.g. `lineart.png`, `colored.png`, `audio.mp3`, `video.mp4`)
  - Appends to `sets.json`

**`/api/sets/[id]` (DELETE)**
- Deletes entire `/public/uploads/sets/[id]/` folder with `fs.rmSync`
- Removes entry from `sets.json`

**`/api/proxy` (GET)**
- Unchanged from before — proxies external URLs server-side

---

## 5. Key CSS & Layout Rules

Same as before: `overflow: hidden`, `height: 100dvh`, `position: fixed` on body.  
Admin layout overrides with `overflow: auto` on its wrapper.

---

## 6. Data Flow for a Complete User Session

```
1.  App opens → gameState = 'GALLERY'
2.  Gallery fetches /api/sets → shows coloredArt thumbnails
3.  User taps a tile
4.  Gallery: setSelectedSet(fullSetObject) → setGameState('PLAYING')
5.  PhaserGame: detects gameState='PLAYING' and new selectedSet.id
6.  PhaserGame: prevSetIdRef check → scene.start('MainGame')
7.  MainGame.create(): loads both lineArtUrl + coloredArtUrl via Phaser loader
8.  On load complete: coloredImage placed (back), lineArt drawn to maskCanvas (front)
9.  isAssetLoading = false → user can draw
10. User finger drag → eraseAt() → maskCanvas destination-out erase → texture refresh
11. On pointerup → checkRevealProgress() → EventBus.emit('reveal-progress', pct)
12. At 95% revealed → EventBus.emit('reveal-95') → audio.play()
13. Tween maskImage.alpha → 0 over 2.2s → EventBus.emit('reveal-complete')
14. React sets isComplete=true → full-screen video overlay appears → video.play()
15. User taps X → dismissVideo() → handleBack() → gameState='GALLERY'
```

---

## 7. Completed Features (Changelog)

| Feature | Status | Notes |
|---|---|---|
| Magic Reveal engine | ✅ Done | `MainGame.ts` — destination-out erase mechanic |
| Soft brush erase (radial gradient) | ✅ Done | Smooth magic reveal effect |
| Reveal progress tracking | ✅ Done | EventBus → progress bar |
| 95% trigger → audio play | ✅ Done | Hidden `<audio>` element |
| Auto-fade remaining mask at 95% | ✅ Done | Phaser tween on maskImage.alpha |
| Full-screen video overlay | ✅ Done | `<video>` element in PhaserGame |
| Set-based database | ✅ Done | `/data/sets.json`, 4 assets per row |
| Admin 4-asset upload form | ✅ Done | `/admin/page.tsx` |
| Sets API (GET/POST/DELETE) | ✅ Done | `/api/sets`, `/api/sets/[id]` |
| Gallery with colored thumbnails | ✅ Done | `Gallery.tsx` |
| Line art hint overlay in gallery | ✅ Done | Fades on hover — teases mechanic |
| Admin URL-only access | ✅ Done | Zero links from player UI |
| No color palette | ✅ Done | Removed all color dots |
| No tool buttons | ✅ Done | Removed brush/fill/eraser UI |
| No undo/redo | ✅ Done | Simplified for reveal mechanic |
| Brush size slider | ✅ Done | 10–80px range |
| Admin sidebar (GCP-style) | ✅ Done | `/admin` layout + `AdminSidebar` component |
| Admin sub-routes | ✅ Done | `/admin` (overview), `/admin/gallery`, `/admin/devtools` |
| Config API | ✅ Done | `GET/POST /api/config` → `data/config.json` |
| DevTools / App Config page | ✅ Done | 5 live parameters: threshold, brush min/max/default, volume |
| Dynamic reveal threshold | ✅ Done | MainGame reads `appConfig.revealThreshold` from Zustand at runtime |
| Click-outside brush dismiss | ✅ Done | Invisible overlay z-[15] behind picker panel |
| Progress bar live update | ✅ Done | Throttled 300ms emit during stroke + artBounds sampling |
| Accurate reveal % (art bounds) | ✅ Done | Samples only the drawn art region, not entire canvas |
| Video pause/resume on tap | ✅ Done | `videoPaused` state |
| CORS proxy | ✅ Done | `/api/proxy` |
| Loading spinner overlay | ✅ Done | `isAssetLoading` in store |
| Viewport metadata fix | ✅ Done | `generateViewport` export in layout.tsx |

---

## 8. Known Limitations & Future Work

| Item | Priority | Notes |
|---|---|---|
| First set content needed | Critical | DB is empty — admin must upload at least one set before app is useful |
| Session persistence | High | User progress lost on reload — could use IndexedDB |
| TWA / Bubblewrap packaging | High | Run `bubblewrap init` + `bubblewrap build` |
| Brush pressure sensitivity | Low | `pointer.pressure` could vary erase radius on stylus |
| Particle/sparkle effect on reveal | Low | Visual polish: emit particles where user draws |
| Sound on brush stroke | Low | Soft swipe/whoosh sound while drawing |

---

## 9. Critical Rules & Pitfalls (DO NOT VIOLATE)

1. **The magic reveal mechanic uses `destination-out` on the mask canvas** — do NOT use `source-over` or fill with color. The erase mechanic IS the feature.

2. **Never call `scene.start('MainGame')` without the `prevSetIdRef` guard** — causes double restart on every render.

3. **Both `lineArt` AND `coloredArt` must be loaded** before the scene is interactive. Missing either causes a black screen.

4. **`maskCanvas` dimensions = Phaser canvas dimensions** (1080×1920). The line art is drawn scaled-to-fit inside this full canvas.

5. **Never fetch external image URLs directly** — always proxy through `/api/proxy` to avoid CORS errors on `getImageData`.

6. **EventBus listeners must be cleaned up on scene shutdown** — register cleanup in `this.events.on('shutdown', ...)`.

7. **Do not add any link to `/admin` in the player-facing UI** — the admin panel is URL-only.

8. **`sets.json` must stay valid JSON** — API has try/catch but write operations should validate.

9. **The Gallery shows `coloredArtUrl` thumbnails** — not line art. The line art overlay is only a faint hint.

10. **`reveal-75` (formerly 95) event is one-shot** — `triggered95 = true` gate prevents re-triggering. Threshold is `0.75`, not 0.95 or 1.0.

11. **Completion is INSTANT** — no tween on mask alpha. `setAlpha(0)` fires immediately when 75% is hit, then `reveal-complete` fires to swap in the video.

---

## 10. Development Commands

```powershell
# Start dev server (from PhaserDev directory)
cmd /c "npm run dev"

# App runs at:
# http://localhost:3000        ← Player gallery + editor (Magic Reveal)
# http://localhost:3000/admin  ← Admin control panel (URL-only)

# Build for production
cmd /c "npm run build && npm run start"
```

### How to Add a New Set
1. Open `http://localhost:3000/admin`
2. Fill in Set Name
3. Drop: Line Art image, Colored Art image, Audio file, Video file
4. Click "Upload Set to Gallery"
5. Return to `http://localhost:3000` — set appears as a gallery tile

---

## 11. Update Log

| Date | Task | What Changed |
|---|---|---|
| 2026-05-21 | Bug Fix | Fixed all remaining strict TypeScript errors across codebase (Gallery ColorSet casting, /api/sets PATCH casts, MainGame texture refresh & null checks) |
| 2026-05-21 | Bug Fix | Fixed additional TypeScript type error during Vercel build in `/admin/devtools/page.tsx` (payload casting issue) |
| 2026-05-19 | Bug Fix | Fixed TypeScript type error during Vercel build in `/admin/devtools/page.tsx` (AppConfig overlap issue) |
| 2026-05-23 | Critical Bug Fix | **Second set can't be painted.** Root cause: Phaser restarts scenes via `scene.start()` which calls `create()` on the same class instance — constructor class-property defaults (triggered95=false, etc.) were NOT re-applied. `triggered95=true` from session 1 made eraseAt() return immediately on all strokes in session 2+. Fix: explicit reset of all per-session instance vars at top of `create()`. Secondary fix: added gamePhase/revealPhase guards to `onRevealThreshold`, `onRevealComplete`, and the FADING timer callback in PhaserGame to prevent stale async callbacks from session 1 corrupting session 2. |
| 2026-05-23 | UX Overhaul | WelcomeScreen (WELCOME phase), Genre tabs in Gallery (ColorSet.genre + useSetsStore.genres), 2-tab bottom nav (Discover/Credits), CreditWallet full screen, seamless image→video transition (imageDisplayRect pct emitted from MainGame → video positioned by PhaserGame), per-set videoMuted toggle (admin + playback), ToastContainer global feedback, completion tracking (completedSetIds). Admin: genre dropdown + videoMuted toggle + live MetadataField PATCH. Build: ✅ 0 TS errors. |
| 2026-05-22 | SSOT Architecture Refactor | New: useConfigStore (AppConfig), useSetsStore (catalog + blast-radius delete). Expanded: useGameStore (reveal phase state), useEconomyStore (purchase/earn actions + async lifecycle). PhaserGame/Gallery/MonetizationModal now pure store consumers. devtools middleware on all stores. Build: ✅ 0 TS errors. |
| 2026-05-19 | Critical Bug Fix + Next.js Upgrade | Fixed: game-container never unmounted; prevSetIdRef reset; all-CSS hiding. Next.js 16.2.6. |
| 2026-05-18 | Firebase F2P Economy Architecture | Anonymous Auth, Firestore ledger, earn/purchase APIs (server-authoritative), MonetizationModal (offer wall), 15s Ad countdown, gallery gateway flow, creditCost in admin/sets, Basic Auth middleware for /admin |
| 2026-05-18 | Bug Fix | Fixed JSX syntax error in `/admin/devtools/page.tsx` (Glitter toggle misplaced inside map block) |
| 2026-05-18 | Smooth Reveal + File Format Guide | Video preload at frame 0 (muted); canvas z-stack: video(10)<canvas(20)<glitter(30)<UI(40); CSS fade-out; glitter sweep CSS animation; 4 new DevTools timing params; GitHub push to Appsmash89/PhaserDev |
| 2026-05-11 | Admin Sidebar + DevTools | GCP-style sidebar, 3-page admin, config API, DevTools sliders, click-outside brush |
| 2026-05-11 | UX Overhaul | Brush picker → floating toggle; progress bar → top hairline; video in-place; threshold 0.75; instant reveal |
| 2026-05-11 | Individual Asset Mgmt | PATCH `/api/sets/[id]`; admin `AssetRow` + `Manage Assets` expand panel |
| 2026-05-11 | Progress Bar Fix | Samples `artBounds` region only (not full canvas), throttled 300ms live updates during stroke |
| 2026-05-11 | Set Database | `/data/sets.json` + `/public/uploads/sets/[id]/` folder structure |
| 2026-05-11 | Sets API | `/api/sets` (GET/POST) + `/api/sets/[id]` (DELETE) |
| 2026-05-11 | Store Rewrite | Removed color/tool state, added `ColorSet` interface + `selectedSet` |
| 2026-05-11 | MainGame Rewrite | Two-layer reveal: coloredImage (back) + maskCanvas (front, destination-out) |
| 2026-05-11 | PhaserGame Rewrite | Removed palette/tools, added progress bar + audio + video overlay |
| 2026-05-11 | Gallery Rewrite | Shows coloredArt thumbnails, no admin link |
| 2026-05-11 | Admin Rewrite | 4-asset upload form per set, gallery library |
| 2026-05-11 | Viewport Fix | Moved viewport from metadata to generateViewport export (Next.js 16) |
| 2026-05-11 | Admin Panel + DB Gallery | Created `/admin`, `/api/lineart`, rewrote `Gallery.tsx` |
| 2026-05-11 | CORS Proxy + Fetch Fix | Created `/api/proxy`, routed all external image loads through it |
| 2026-05-11 | Editor Polish | 18-color palette, compact dock, fixed double scene restart bug |
| 2026-05-11 | Watercolor Fill | BFS engine with per-frame alpha fade |
| 2026-05-11 | Tool Engine | Brush, Eraser, Flood Fill |
| 2026-05-11 | Undo/Redo | 20-step `ImageData` history stack |
| 2026-05-11 | Mobile Layout | `overflow:hidden`, `100dvh`, body scrollbar suppression |
| 2026-05-11 | Initial Build | Phaser 4 + Next.js 16 + Zustand boilerplate |

---

*This document must be updated at the end of every task. Append to Section 11 (Update Log), update Section 7 (Completed Features) and Section 8 (Known Limitations) as appropriate.*
