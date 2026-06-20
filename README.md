# Project Netrunner

> Clone. Analyze. Jack In.

A Next.js application that clones GitHub repositories, analyzes their TypeScript architecture, and renders the codebase as an immersive 3D cyberpunk cityscape. Built for developers who want to *see* their architecture.

---

## What It Does

1. **Repository Cloning** — Drop any GitHub URL into the terminal and the app clones it server-side using `simple-git`.
2. **Architecture Analysis** — Parses `.ts` / `.tsx` files with Babel to extract imports, exports, and component structure.
3. **Cyberpunk Visualization** — Maps every file, component, service, and API route to a building in a real-time 3D city built with React Three Fiber.
4. **CLI Interface** — A fully interactive terminal on `/generate` with custom `netrn` commands, system stats, and lore easter eggs.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| 3D Engine | React Three Fiber + Three.js + Drei + Post-Processing |
| Animation | GSAP |
| Analysis | Babel parser + `ts-morph` + `dependency-cruiser` |
| Git | `simple-git` |
| Validation | Zod |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the dev server
pnpm dev
```

Open `http://localhost:3000`.

---

## Pages

### `/` — Landing Page

A cyberpunk-themed landing page featuring:
- Glitch-effect animated logo
- Typewriter-style hero text
- Feature cards explaining the "Neural Link" workflow
- Animated city backdrop

### `/generate` — Cyber Console

A full-screen terminal interface (80/20 split with a live system-stats sidebar).

**CLI Commands:**

| Command | Action |
|---------|--------|
| `netrn` | Display the Edgerunners lore easter egg |
| `netrn whoami` | Show current system & user stats |
| `netrn github` | Open the Project Netrunner GitHub repo |
| `netrn master` | Display the lead architect |
| `netrn analyze <url>` | Clone and analyze a GitHub repository |
| `<github-url>` | Direct analyze shortcut |
| `jackin` | Enter cyberspace (triggers the boot sequence) |
| `clear` | Clear terminal history |

**Sidebar:**
- Live IP address detection
- Platform / browser / resolution detection
- Simulated CPU temperature & uptime counter
- Auto-scrolling system logs (link stability, memory, CPU, ICE bypass, etc.)

### Cyberspace — Boot Sequence → 3D City

After typing `jackin` and accepting the neural-link warning, a dense red-themed terminal boot sequence plays across five columns of streaming data. Then the camera drops into a fully navigable 3D cyberpunk city where:
- **Towers** = API routes & services
- **Vaults** = Databases
- **Gates** = Authentication layers
- **Blocks** = UI components
- **Workshops** = Utilities

Click any building to inspect its file path, imports, exports, and dependencies in a floating HUD panel.

---

## Architecture Analyzer

The analyzer (`src/lib/analyzer/index.ts`) does the following for every cloned repo:

1. Clones with `--depth 1` into a temp workspace
2. Validates `package.json` and TypeScript source presence
3. Walks the file tree, skipping `node_modules`, `.next`, etc.
4. Parses each `.ts` / `.tsx` file with Babel to extract:
   - Named/default exports
   - Resolved import paths
   - React component detection (`jsx` / `tsx`)
5. Classifies files into architecture types: `database`, `authentication`, `middleware`, `api`, `service`, `component`, `utility`, `logger`, `agent`
6. Builds a graph of nodes and edges for the 3D renderer

---

## Visual Design

The UI follows a **Blackwall / Cyberpunk** aesthetic:
- **Primary accent:** Red (`#ff4444`) — replacing the original cyan for a harsher, more aggressive look
- **Terminal:** Red-amber monochrome with scanline overlay
- **Boot sequence:** Dense red text streams across five terminal columns
- **City:** Dark volumetric cuboid buildings with thin cyan linework, heavy fog, restrained bloom
- **Death transition:** Harsher glitch effects on blackwall failure

---

## Project Structure

```
app/
  api/analyze/route.ts    # POST endpoint that runs the analyzer
  generate/page.tsx        # Cyber console page
  page.tsx                 # Landing page
  layout.tsx               # Root layout
  globals.css              # Cyberpunk theme + custom animations

src/
  components/
    landing-page.tsx       # Landing page sections
    netrunner-console.tsx  # Console + boot sequence + 3D renderer
    console-layout.tsx     # Terminal CLI + sidebar logic
    city-scene.tsx         # React Three Fiber city scene
    inspection-panel.tsx   # Building inspection HUD
    glitch-logo.tsx        # Animated glitch logo
    text-type.tsx          # Typewriter text component
  lib/
    analyzer/index.ts      # Repository cloning + parsing engine
    city-layout.ts         # 3D node positioning algorithm
    mock-graph.ts          # Fallback architecture graph
  types/
    architecture.ts        # Graph, node, edge type definitions
```

---

## License

MIT

---

*Built by bhuvan-gs in Night City.*
