# DevMemory — Developer Assistant with Project Memory

A knowledge-graph-powered coding assistant that **remembers technical decisions,
project dependencies, previous bugs, and their resolutions** — and reasons across
them to answer new debugging questions.

Built for the challenge: *"Why did we change the authentication module, and could
that change be related to the current API error?"*

![schema](Project → Component → Dependency → Bug → Fix, plus Decision → Reason)

## What it does

- Models project memory as a **graph**: `Project → Component → Dependency → Bug → Fix`,
  alongside `Decision → Reason`.
- **Blast-radius reasoning**: anchor a question on a symptom, walk the graph outward
  (bounded BFS), and surface every implicated Decision / Dependency / Bug / Fix,
  ranked by connection strength (`1 / hop-distance`).
- **AI narration**: turns the structured graph trace into a plain-English verdict and
  causal chain.
- **3D neon visualization** (Three.js): glowing force-directed graph you can orbit,
  zoom, and click. The traced subgraph lights up when you ask a question.
- **Persistent + extendable**: add your own decisions, bugs, and fixes; they wire into
  the graph and are saved.

## Run it locally

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173). This starts the
Vite frontend and the API server together. The API listens on `127.0.0.1:3001`
and persists the project graph in `data/memory.json`.

## Notes on the runtime

This project was originally built as an **Amazon Quick app**, where persistence and AI
inference are provided by the platform library `@amzn/quick-pages-runtime-lib`
(server-side Page Storage + Bedrock Claude).

For standalone use, `src/runtime-shim.ts` connects to the local API server:

- **Persistence** → server-side JSON file (your memories survive browser and server restarts).
- **AI answer** → a built-in heuristic answer by default. To use an OpenAI-compatible
  provider, set `OPENAI_API_KEY`; optionally set `OPENAI_MODEL` and `OPENAI_BASE_URL`.
  The key stays on the server and is never sent to the browser.

Run the production API with `npm start`. Set `API_PORT`, `HOST`, or
`DEVMEMORY_DATA_FILE` to override its defaults.

The graph reasoning engine (`src/engine.ts`) is pure TypeScript and runs identically in
both environments.

## Project structure

```
src/
  App.tsx                 # Neon shell: layout, state, tabs
  types.ts                # Graph domain types + relation labels
  engine.ts               # Blast-radius BFS reasoning (pure, framework-free)
  seed.ts                 # Seed graph (auth/OAuth2→401 + checkout + dashboard scenarios)
  storage.ts              # Persistence + graph mutators
  ai.ts                   # Evidence builder + AI narration call
  theme.ts                # Neon/cyberpunk palette + glow helpers
  runtime-shim.ts         # Local stand-in for the Quick runtime library
  components/
    Graph3D.tsx           # Three.js 3D force-directed graph
    AskConsole.tsx        # Debugging console (verdict + ranked evidence)
    AddMemory.tsx         # Form to add decisions/bugs/fixes
```

## The demo scenario

Ask: *"Why did we change the authentication module, and could it be related to the
current API 401 error?"*

DevMemory traces: **Bug #412 (401s)** → occurs in **Auth Module** → changed by
**Decision: Migrate to short-lived OAuth2 tokens** (because: reduce token-theft blast
radius) → which **introduced** the 401 bug → **resolved by Fix: Allow 30s clock skew in
JWT verification**. The answer recommends checking that clock-skew fix.
