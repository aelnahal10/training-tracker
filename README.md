# Training Tracker

A mobile-first tendon-rehab & progressive-loading training tracker. Built with
**Next.js 15 (App Router) + TypeScript + Tailwind CSS**. Charts are hand-drawn
inline SVG — no chart libraries, no UI libraries.

Everything runs **100% in the browser**: all data lives in `localStorage`. There
is no backend, no auth, and no external API. It deploys as a fully static site to
**GitHub Pages**.

## Features

- **Dashboard** — phase status, today's iso toggle, last-7-days strip, body-weight
  sparkline, pain trend, weekly check-in prompt and an alerts engine.
- **Log** — session type, pain sliders, per-exercise sets with conditional
  weight/reps/duration inputs, and a Phase-2 lock warning modal.
- **History** — filterable, expandable list of every session.
- **Progress** — KPI tiles + inline-SVG charts (weight, muscle mass, body fat, pain, per-exercise progress
  with plateau detection, per-session volume, weekly muscle-group split, and a
  60-day ISO streak calendar heatmap).
- **Metrics / Check-in / Phases** — full CRUD, all persisted locally.

The app seeds two phases (Tendon Foundation, Progressive Loading) and a full
preset exercise catalogue on first launch.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000  (dev runs at the root — no sub-path)
```

> The GitHub Pages base path (`/repo-name`) is applied **only to production
> builds**, so local dev is always served from `http://localhost:3000`.

## Deploy to GitHub Pages

GitHub Pages serves a project site from `https://<user>.github.io/<repo-name>/`,
so the app must be built with that sub-path as its base path.

### 1. Set your repo name

Open **`next.config.ts`** and replace `repo-name` with the **exact** name of your
GitHub repository:

```ts
const repoName = "repo-name"; // ← change to e.g. "training-tracker"
```

> Deploying to a user/organization page (`https://<user>.github.io` with no
> sub-path)? Set `const repoName = "";` instead.

### 2. Install dependencies

```bash
npm install
```

### 3a. Deploy with the built-in script (uses the `gh-pages` package)

```bash
npm run deploy
```

This runs `next build` (which, because of `output: 'export'`, writes a static
site to `./out`), ensures `out/.nojekyll` exists, and pushes `./out` to the
`gh-pages` branch.

> **Windows note:** the `deploy` script uses the Unix `touch` command. On Windows
> run it from **Git Bash** (or WSL). A `.nojekyll` file is already included in
> `public/` and is copied into `out/` automatically, so if `touch` is unavailable
> you can simply run `npm run build` then `npx gh-pages -d out`.

### 3b. Or deploy via GitHub Actions

Push to `main` with a workflow that runs `npm ci && npm run build`, then uploads
`./out` with `actions/upload-pages-artifact` and deploys with
`actions/deploy-pages`.

### 4. Enable Pages

In your repo: **Settings → Pages → Build and deployment → Source → Deploy from a
branch**, then pick the **`gh-pages`** branch and **`/ (root)`** folder. Your app
appears at `https://<user>.github.io/<repo-name>/` within a minute or two.

## Why the `.nojekyll` file?

GitHub Pages runs Jekyll by default, which ignores files/folders that start with
an underscore — including Next.js's `_next/` asset directory. The empty
`public/.nojekyll` file disables Jekyll so those assets load correctly.

## Data & privacy

All data is stored only in your browser via `localStorage`. Clearing site data
(or using **More → Reset all data**) restores the seeded phases and wipes logs.
Nothing is ever sent anywhere.
