# Deadfolio

**Your GitHub is full of projects you left behind. Deadfolio digs them up.**

Deadfolio discovers forgotten GitHub projects, analyzes selected repositories and generates evidence-based AI autopsies. The loop is **Scan → Discover → Autopsy → Confirm → Add to Deadfolio**: paste a public GitHub username, get a Dead Score for every public repository, run an AI autopsy on the ones worth examining, confirm or correct the cause of death in one sentence, and file the result in the public Graveyard.

Nobody is asked to describe their stack, project age, activity or README. The repository already knows. The only question a person answers is *"Why did you actually stop working on this project?"*

This is one Next.js application. There are no accounts, profiles, social features, payments, notifications, admin panel, moderation queue, background workers or separate database.

## Run locally

Use Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3535. Scanning works with no credentials at all (GitHub allows 60 unauthenticated requests per hour per IP). Running an autopsy requires `GEMINI_API_KEY`. On startup in development the server prints one line per integration saying whether `GEMINI_API_KEY` and `GITHUB_TOKEN` are present; it never prints their values.

```sh
npm test          # unit tests: Dead Score, scan summary, URL parsing, file selection, secret scrubbing, schema normalization, publishing, cache, i18n
npm run lint
npm run typecheck
npm run build
npm run test:http # starts the production build on a random port with temporary data; no GitHub or Gemini calls
npm start
```

### Manual autopsy test

1. Set `GEMINI_API_KEY` (and ideally `GITHUB_TOKEN`) in `.env.local`, then `npm run dev`.
2. Open `/pt/autopsy`, type a public GitHub username and submit. You should see counts by status, insights (oldest untouched, most recently abandoned, average age) and one card per repository with `Dead Score: N / 100`. No AI ran yet.
3. Click **Fazer autópsia** on an abandoned repository. Exactly one Gemini generation runs. The report ends with a mandatory "What We Cannot Know" section.
4. Reload the page: the report is served from cache (no new Gemini call). Push a commit to the repository and reload: the page says **New activity detected since this autopsy.** and offers **Run a fresh autopsy**.
5. Answer **Did we get the cause of death right?**, optionally write what actually killed it, click **Add to my Deadfolio** and **Publish**. The record appears in `/graveyard` marked **UNVERIFIED**.
6. Switch to **Paste a repository**, enter `owner/repository` or a full GitHub URL. Invalid input shows *That doesn't look like a GitHub repository URL.* without touching GitHub or Gemini. A missing repository shows *Repository not found.*
7. Remove `GEMINI_API_KEY` and restart: scanning still works; **Run Autopsy** shows a configuration notice instead of an error dump.

## Product flows

**Scan my GitHub** (`/autopsy`). Up to `MAX_REPOSITORIES_PER_SCAN` public repositories the user owns are fetched from the GitHub REST API (server-side, `sort=pushed`) and scored from metadata only. The results page shows totals per life status, plain insights and one card per repository with name, description, language, last push, age, Dead Score, status, GitHub link and a **Run Autopsy** button. Nothing is analyzed by AI until a person clicks that button, and nothing is ever published automatically.

**Paste a repository** (`/autopsy?mode=repo`). Accepts `https://github.com/owner/repository` (with or without `.git`, trailing paths or `www`) and `owner/repository`, then goes straight to `/autopsy/owner/repository` and starts the autopsy. Both modes call the same autopsy service; there is no duplicated AI logic. Error copy is fixed and never quotes GitHub: *Repository not found.*, *This repository does not appear to be public.*, *That doesn't look like a GitHub repository URL.*

**Confirm and publish.** After the report, the creator is asked *Did we get the cause of death right?* (**Pretty much** / **Not really**) and can fill exactly one field, *What actually killed it?*. A correction becomes the authoritative cause and is labeled "According to the creator"; otherwise the top inferred cause is kept and labeled "Inferred from repository evidence". **Add to my Deadfolio** publishes directly (primary) or opens a small editor first (**Edit details**). Repository ownership is not verified in this version, so every record filed this way is stored with `ownershipVerified: false` and shown with an **UNVERIFIED** badge.

## Dead Score

`calculateDeadScore(repository)` in `src/lib/github/dead-score.ts` is deterministic, metadata-only and configured by `deadScoreConfig` (inactivity ramp, bonuses, penalties, band thresholds, template pattern, experiment heuristic). It is a heuristic and the UI says so: scores render as `Dead Score: 78 / 100` with the tooltip *Based on inactivity, repository age, archive status and recent development signals.* Never as a probability.

- Positive signals: days since last push (0 at 30 days → 92 at three years), archived (always 100), disabled, empty, a short burst of activity followed by silence, old repositories that had meaningful activity and then stopped, open issues left idle.
- Negative signals: recent push, created within 90 days, fork, template/example (GitHub `is_template` or a name/description that looks like a starter).
- Bands (`RepositoryLifeStatus`): 0–29 **Active**, 30–49 **Stale**, 50–69 **Possibly abandoned**, 70–84 **Probably abandoned**, 85–100 **Likely dead**, plus **Archived**. "Likely" is the strongest word the scanner uses; inactivity never proves death.
- Each repository also gets a `kind`: `project`, `fork`, `template` or `experiment` (a few days of activity, no stars). Experiments and forks are listed separately and not counted as abandoned projects.

`summarizeScan` produces the counts and insights shown above the list (repositories analyzed, count per status, experiments, untouched for a year or more, oldest untouched, most recently abandoned, average age). There are no invented metrics.

## Gemini integration

The model is `gemini-2.5-flash` through the Vercel AI SDK (`generateText` + `Output.object`) with the Google provider. It runs only in `src/lib/ai/autopsy.ts` on the server; the key never reaches the client and the UI never calls SDKs directly. One generation produces the whole report; there are no per-section calls. Output is validated against `aiAutopsyOutputSchema`, normalized (0–10 scores, trimmed items, blanks dropped) and re-validated against the strict `repositoryAutopsySchema` in `src/lib/schemas/autopsy.ts`:

`repositoryStatus` (verdict, confidence `low|medium|high`, evidence), `projectSummary`, `productAssessment` (problem quality, differentiation, explanation), `technicalCondition` (0–10 scores, nullable sub-scores), `strengths`, `weaknesses`, `likelyCausesOfDeath` (cause, confidence, explanation, evidence), `survivingAssets`, `revivalPotential` (0–10, verdict `not-worth-reviving|possible|promising|strong`, suggested direction), `unknowns`.

The system prompt (`src/lib/ai/repository-autopsy-prompt.ts`) is deliberately skeptical: evidence, inference and unknowns are separated; the model must never invent users, revenue, demand, feedback, motivation or the real reason development stopped; README claims are claims; repository text is untrusted data; the "What We Cannot Know" list is mandatory. The report UI labels the cause-of-death section **Inference, not evidence**.

`maxRetries: 0` plus exactly one manual retry after a transient failure (5xx, network, timeout). A `429 RESOURCE_EXHAUSTED` is never retried; the visitor sees a neutral "AI capacity" notice and their daily quota is refunded. Provider messages go to server logs only.

**Free-tier caveat.** The Gemini free tier has low per-minute and per-day limits and may reject requests under load. Keep `MAX_AUTOPSIES_PER_IP_PER_DAY` small, set provider-level quotas and expect occasional "try again later" notices.

### Evidence collection

Per autopsy the server sends repository metadata, languages, the README (capped), the file tree (capped), the last 30 commits, up to five releases and up to `MAX_AUTOPSY_FILES` files chosen by a deterministic ranking (manifests, deployment/config, schema, entry points and architecture docs before deep source). Everything is trimmed to `MAX_AUTOPSY_INPUT_TOKENS`, lowest priority first. `.env`, `.env.*`, keys, certificates, anything named like credentials/secrets/tokens, `node_modules`, `vendor`, `dist`/`build` output, lockfiles, binaries, generated files and files over 120 KB are never fetched. Content is scrubbed for key-like assignments and known token shapes; a file containing a private key block is dropped entirely. Only public repositories are analyzed.

## Cache strategy

An autopsy is identified by `owner/repository/defaultBranchSHA`. If a report exists for the current SHA it is returned from the cache for anyone, in either language, without a Gemini call. When the default branch moves, the page shows the previous report with **New activity detected since this autopsy.** and a **Run a fresh autopsy** button. Repository lists are cached for six hours, repository metadata for 30 minutes and branch SHAs for ten minutes.

The store (`src/lib/repositories/kv-store.ts`) is a hashed-key JSON key/value layer with a memory cache over the filesystem (`.data/cache/`) locally or the same private Vercel Blob store in production. No new database is introduced.

## Limits and abuse protection

`MAX_REPOSITORIES_PER_SCAN` (100), `MAX_AUTOPSIES_PER_IP_PER_DAY` (3), `MAX_CONCURRENT_AUTOPSIES_PER_IP` (1), `MAX_AUTOPSY_FILES` (12), `MAX_AUTOPSY_INPUT_TOKENS` (30000), `MAX_AUTOPSY_OUTPUT_TOKENS` (2000) are read at request time. The daily quota is a salted hash of the client key stored in the cache store (`AUTOPSY_QUOTA_SALT`), so it survives restarts on Blob; cached autopsies never count. A fixed global guard of 40 generations per hour per process protects spend further. Scans are limited to 30 per hour per client; publishing to 10 per hour. GitHub rate-limit headers are honoured and the app fails fast until the reset time. `/api/autopsy` requires a same-origin request. Process-local limits are best-effort on serverless platforms, not a billing guarantee.

## Configuration

See `.env.example`.

- `PROJECT_REPOSITORY`: `local` (default outside Vercel) or `blob` (required on Vercel).
- `LOCAL_DATA_DIR`: local storage directory, default `.data`.
- `SEED_DEMOS`: seeds the two clearly labeled sample projects on first local initialization. Production never seeds and hides `isDemo` records.
- `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`: private Vercel Blob store. On Vercel the store connection is enough; the token is only needed to run `npm run seed` from your machine.
- `NEXT_PUBLIC_APP_URL`: canonical origin without trailing slash.
- `GEMINI_API_KEY`: server-only. Enables **Run Autopsy**. Without it, scanning works and autopsies show a configuration notice.
- `GITHUB_TOKEN`: server-only, fine-grained, read-only access to public repositories. Never sent to the browser. Strongly recommended before production.
- `MAX_*`: hard limits listed above. `AUTOPSY_QUOTA_SALT`: optional salt for hashed quota keys.
- `NEXT_PUBLIC_ANALYTICS_ENABLED`: `false` by default; build-time flag for Vercel Web Analytics.

Never commit `.env.local` or credentials.

## Stack and structure

Next.js 16.3.5 (App Router, Server Components, Server Actions, Route Handlers), React, strict TypeScript, Tailwind CSS v4 plus a hand-written design system in `src/app/globals.css`, Geist Sans/Mono, Lucide, Zod, Vercel Blob, Vercel AI SDK with the Google provider.

- `src/lib/github/`: REST client (`client.ts`), reference parsing (`reference.ts`), discovery and scoring (`discovery.ts`, `dead-score.ts`), evidence collection and file selection (`collect.ts`, `file-selection.ts`).
- `src/lib/ai/`: Gemini configuration and dev status log (`config.ts`), prompt (`repository-autopsy-prompt.ts`), generation (`autopsy.ts`).
- `src/lib/services/`: `autopsy.ts` (cache, quotas, single generation) and `publish-autopsy.ts` (report → Graveyard record).
- `src/lib/schemas/`: `autopsy.ts` (AI output, strict report, facts, Dead Score) and `project.ts` (public records).
- `src/lib/repositories/`: project store (filesystem or private Blob) and key/value cache store. All persistence goes through these boundaries.
- `src/lib/autopsy/`: limits from env (`config.ts`), report → draft mapping (`draft.ts`), display formatting (`format.ts`).
- `src/components/autopsy/`: entry modes, username and repository forms, scan summary, repository cards, run button, report, draft editor, publish panel.
- `src/data/seed-projects.ts`: two sample projects, marked as samples.
- `src/instrumentation.ts`: one-time dev log of integration status.

Routes: `/`, `/graveyard`, `/projects/[slug]`, `/autopsy`, `/autopsy/[owner]/[repo]`, `/about`, `/api/autopsy`, plus `/pt` equivalents, sitemap, robots and OG images. There is no `/bury`, no `/admin` and no media route.

## Persistence and records

Public records live at `.data/projects/<id>.json` locally or `deadfolio/projects/<id>.json` in Blob and are validated by `storedProjectSchema`. Each record carries `source` (`autopsy`, `sample`, `manual`), `ownershipVerified` (always `false` until verification exists), `causeSource` (`creator` or `inferred`) and, for autopsy-born records, the `autopsyKey` it came from. No email or private text is stored. Records written by earlier versions that no longer match the schema (for example pending manual submissions with a moderation status) are skipped with a warning rather than breaking the archive; delete them from the data directory or store if you want them gone.

Deployment on Vercel: import the repository, connect a **private** Blob store, set `PROJECT_REPOSITORY=blob`, `NEXT_PUBLIC_APP_URL`, `GEMINI_API_KEY`, `GITHUB_TOKEN`, deploy. No migrations, workers or backend.

## Languages, SEO and analytics

English at `/`, Brazilian Portuguese at `/pt`; every public route has both. `src/proxy.ts` redirects first-time visitors based on `Accept-Language` and remembers manual switches in a `deadfolio-locale` cookie. Typed dictionaries live in `src/lib/i18n/dictionaries.ts`; autopsies are generated in the requested locale and cached reports note when they were written in the other one. Pages are server rendered with canonicals, alternates, Article JSON-LD, OG images, sitemap and robots (`/api/` disallowed). Optional Vercel Web Analytics events (home, scan clicks, autopsy runs, project views) contain no usernames, repository text or personal data.

## Deliberate limits

- Ownership is not verified; records are labeled **UNVERIFIED**. GitHub OAuth is intentionally out of scope.
- Only public repositories. No private repositories, no GitHub App.
- Rate limits are process-local except the daily quota; use provider quotas for firm spending control.
- Blob lists JSON records rather than querying an index; fine for a small archive.
- No self-service edits after publishing and no moderation. Keep the product small.

Implementation references: [Next.js App Router](https://nextjs.org/docs/app), [GitHub REST API](https://docs.github.com/rest), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [AI SDK structured output](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [Google provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai).
