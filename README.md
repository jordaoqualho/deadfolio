# Deadfolio

**Dead projects belong in your portfolio too.**

Deadfolio is a public archive of abandoned technology projects. Its primary object is an honest postmortem: the idea, the work, the failure, the lessons, and what survived. The MVP tests whether makers will share these stories and whether anyone wants to give the work a second life.

This is one Next.js application. There are no visitor accounts, social features, internal messages, payments, or separate database.

## Run locally

Use Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3535. No service credentials are required. Short raw-story submissions, moderation, image processing, and persistence all work locally. To moderate, set a random `ADMIN_PASSWORD` of at least 16 characters in `.env.local`, restart the server, and visit `/admin`.

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:http
npm start
```

The test suite covers validation, the submission/moderation lifecycle, email privacy, persistent edits/deletion, seeding, and image decoding. `npm run test:http` starts an isolated production server with temporary data and exercises real HTTP submissions, uploads, protected admin actions, publication, editing and deletion. Run it after building. `npm start` serves the production build.

## Stack and structure

Next.js 16.3.5 (stable at implementation), App Router, React, strict TypeScript, Tailwind CSS, Geist Sans/Mono, Lucide, Zod, Sharp, Vercel Blob, and the Vercel AI SDK with the Google provider. Exact dependency versions and `package-lock.json` are checked in. Public pages use Server Components; client components are limited to navigation, filters, forms and interactive actions. Mutations use Server Actions; AI extraction and authorized image delivery use Route Handlers.

- `src/lib/schemas/project.ts`: server-validated domain and AI schemas.
- `src/lib/repositories/`: repository interface, filesystem and private Blob implementations. All persistent reads/writes go through this boundary.
- `src/lib/services/submit-project.ts`: reusable, UI-independent submission service. It validates input and always creates a submitted record, never a published one.
- `src/lib/services/media.ts`: image decoding, metadata stripping and compression.
- `src/lib/ai/extract-project.ts`: optional structured extraction.
- `src/lib/ai/autopsy.ts`, `src/lib/github/`, `src/lib/services/autopsy.ts`: Repository Autopsy (see below).
- `src/lib/repositories/kv-store.ts`: hashed-key JSON cache/quota store with local and private Blob backends.
- `src/components/submission/`: story entry, progressive editor and review.
- `src/components/autopsy/`: GitHub discovery, autopsy report, creator confirmation and publish panel.
- `src/data/seed-projects.ts`: editable sample projects.

Routes: `/`, `/graveyard`, `/projects/[slug]`, `/bury`, `/autopsy`, `/autopsy/[owner]/[repo]`, `/about`, `/admin`. Admin previews and editors are nested under `/admin/[id]`. Private media is served through `/media/[id]/[name]`; internal Blob URLs are never project navigation URLs. `/api/autopsy` runs a repository autopsy.

## Configuration

See `.env.example` for the complete starting configuration.

- `PROJECT_REPOSITORY`: `local` for development or `blob` for Vercel. Defaults to local outside Vercel and Blob on Vercel. Filesystem mode fails closed on Vercel rather than silently losing submissions.
- `LOCAL_DATA_DIR`: local storage directory, default `.data`.
- `SEED_DEMOS`: enables sample records on the first local development initialization. Production never auto-seeds and filters all `isDemo` records from public pages and media, even if they already exist. It does not delete stored samples.
- `BLOB_READ_WRITE_TOKEN`: optional static token for a **private** Vercel Blob store. On Vercel, connecting the store is enough: the SDK uses `BLOB_STORE_ID` with OIDC. The token is still needed to seed from your machine.
- `ADMIN_PASSWORD`: random server-side secret, minimum 16 characters. Empty or short values disable administration. Rotating it invalidates existing sessions.
- `NEXT_PUBLIC_APP_URL`: canonical origin, without a trailing slash; use the real HTTPS domain in production.
- `GEMINI_API_KEY`: optional server-only Google Gemini API key. Its presence enables the formatting CTA and Repository Autopsy. The former `AI_ENABLED` flag is no longer used.
- `GITHUB_TOKEN`: optional server-only GitHub token for Repository Autopsy. Use a fine-grained token with read-only access to public repositories. It is never sent to the browser. Without it, GitHub allows 60 unauthenticated requests per hour per IP, which is enough for local testing but not for production.
- `MAX_REPOSITORIES_PER_SCAN` (100), `MAX_AUTOPSIES_PER_IP_PER_DAY` (3), `MAX_CONCURRENT_AUTOPSIES_PER_IP` (1), `MAX_AUTOPSY_FILES` (12), `MAX_AUTOPSY_INPUT_TOKENS` (30000), `MAX_AUTOPSY_OUTPUT_TOKENS` (2000): hard limits for Repository Autopsy, read at request time.
- `NEXT_PUBLIC_ANALYTICS_ENABLED`: defaults to `false`. Set `true` only after opting into Vercel Web Analytics. It is a build-time public flag; rebuild after changing it.

Never commit `.env.local` or credentials. No infrastructure is provisioned by the application.

## Local persistence

Records are stored as `.data/projects/<id>.json`; image files live under `.data/media/<id>/`. JSON writes use a temporary file plus atomic rename. The `.data/.initialized` marker prevents deleted seed projects from reappearing. The directory is ignored by Git. Back it up if you want to retain local submissions; removing it resets local data. Do not expose this directory as a public static directory.

Stored JSON includes the private creator email. Public reads use an explicit Zod projection that excludes it. Submissions and their images remain inaccessible to public routes until published. There is no public submission-status lookup; the confirmation includes a reference identifier.

## Vercel Blob and deployment

1. Create/import this repository in Vercel and use the Next.js framework preset. Use Node.js 22 or newer. Build command: `npm run build`.
2. Create a **private** Blob store in the Vercel project and connect it to Production and Preview. The dashboard should add `BLOB_STORE_ID`. A public store is unsuitable because submitted records include private email addresses. Redeploy after connecting.
3. Set `PROJECT_REPOSITORY=blob`, a strong `ADMIN_PASSWORD`, and `NEXT_PUBLIC_APP_URL=https://your-domain`. Leave AI and analytics disabled unless you explicitly want them.
4. Deploy. No migrations or separate backend are required.
5. Visit `/admin/new` and add at least two genuine founder projects. Save each, review it, and publish explicitly from `/admin`. Do not relabel fictional sample content as real.
6. Check the launch-readiness notice in `/admin`: it highlights an empty real archive and counts published founder projects against the minimum of two. Launch only after those records are ready.

Storage layout: `deadfolio/projects/<id>.json` and `deadfolio/media/<id>/<random-id>.webp`. Moderation status lives inside each JSON record. Blob reads bypass the CDN cache for moderation correctness. Media responses are authorized against the current record and are not publicly cached, so rejecting a project also withdraws its images.

Use the available free tier, review the provider's current quotas, and set usage controls before enabling external services. The application does not subscribe to a paid plan or enable AI automatically. A real Vercel deployment requires your own project and store configuration; there is no deployed URL included with this source tree.

## Optional Gemini formatting

Create a Gemini API key in Google AI Studio. Set `GEMINI_API_KEY`, then restart/redeploy. The server uses `gemini-2.5-flash-lite` with AI SDK `generateText`, `Output.object`, and Zod validation. Structured extraction is instructed not to invent metrics, technologies, dates, development time, failure reasons or personal information. Unknown facts remain blank. The visitor reviews an editable preview; missing generated details may stay blank. The moderator completes required public fields before publishing.

The form explains that text is sent to Google. Never paste credentials or confidential material. With no key, the form silently offers **Submit my story**. If extraction fails or times out, all six inputs remain in the form and the same direct-submission CTA appears. Visitors never enter the long structured editor; it is reserved for moderation. The prompt reduces unsupported generation but cannot guarantee factual accuracy; human review remains essential.

The endpoint limits input to 15,000 characters, output to 5,000 tokens, uses no automatic retries, times out after 45 seconds, and has simple per-process per-client/global request limits. Those limits are best-effort on serverless deployments, not a distributed quota or spending guarantee. Set provider-level quotas before opting in.

## Repository Autopsy

`/autopsy` turns a public GitHub repository into an evidence-based postmortem without asking the creator to describe it first. The flow is: GitHub username → Deadfolio discovers forgotten repositories → the visitor picks one → **Run Autopsy** → report → the creator confirms or corrects the cause of death in one sentence → **Add to my Deadfolio** → **Publish** (or **Edit details**). Everything is moderated like any other submission.

**Discovery is deterministic.** Up to `MAX_REPOSITORIES_PER_SCAN` public repositories the user owns are fetched (`sort=pushed`) and scored from metadata only: days since the last push (piecewise ramp from 30 days to two years), archive/disabled status, fork status, empty size, a short activity span followed by long silence, age and abandoned open issues. Scores map to **Active** (<30), **Possibly stale** (30–59), **Likely dead** (≥60) and **Archived**. The strongest non-archived label is "likely dead": inactivity never proves death. No AI runs during discovery. Repository lists are cached for six hours, repository metadata for 30 minutes and default-branch SHAs for ten minutes; scans are limited to 30 per hour per client.

**One Gemini generation per repository version.** An autopsy is identified by `owner/repository/defaultBranchSHA`. If a report exists for the current SHA it is returned from the cache, regardless of who asks or in which language (the UI notes when a cached report was generated in the other locale). If the SHA moved since the last report, the page shows **New activity detected. Run a new autopsy?** with the previous report still available. The model is `gemini-2.5-flash` with structured output (`Output.object`), `MAX_AUTOPSY_OUTPUT_TOKENS` output tokens, `maxRetries: 0` and exactly one manual retry after a transient failure (5xx, network, timeout), never after a `429 RESOURCE_EXHAUSTED`. Provider errors are mapped to short codes; visitors see neutral copy, and provider failures refund the visitor's daily quota.

**Evidence collection** sends repository metadata, languages, the README (capped), the file tree (capped), the last 30 commits, up to five releases and up to `MAX_AUTOPSY_FILES` files chosen by a deterministic ranking that prefers manifests, deployment/config, schema, entry points and architecture docs over deep source files. The total is trimmed to `MAX_AUTOPSY_INPUT_TOKENS` by dropping the lowest-priority files first. Path rules exclude `.env*`, key/certificate material, anything named like credentials/secrets/tokens, `node_modules`, `vendor`, build output, lockfiles, binaries and files over 120 KB; content is additionally scrubbed for key-like assignments and known token shapes, and any file containing a private key block is dropped. Only public repositories are analyzed.

**Epistemics.** The system prompt requires the model to separate evidence (observable), inference (hedged with "likely"/"suggests"/"based on repository evidence") and unknowns, to never invent users, revenue, demand, feedback, motivation or the real reason development stopped, to treat README claims as claims and repository text as untrusted data, and to keep its verdict consistent with the deterministic classification unless evidence contradicts it. Output is normalized (scores clamped to 0–100, items trimmed, blanks dropped) before being validated against the strict `repositoryAutopsySchema` in `src/lib/schemas/autopsy.ts`.

**Publishing.** The report becomes the initial project content: summary, idea assessment, strengths → what worked, weaknesses → what went wrong, surviving assets, technologies, category and stage, development period/duration derived from GitHub dates, GitHub links, and status (`dead` for likely-dead/archived, `frozen` for stale). Lessons stay empty because the repository cannot know them. If the creator answers **Not really** and writes what actually killed it, that text becomes `causeExplanation` with category `other`; otherwise the top inferred cause is used, hedged. The creator's answer is kept in the browser and stored with the submission only, never written into the shared autopsy cache, so anonymous visitors cannot rewrite each other's reports. The default path asks only for creator name, private email and a next-step choice; **Edit details** opens the same editable preview used for story drafts.

**Limits.** `MAX_CONCURRENT_AUTOPSIES_PER_IP` is enforced in-process; `MAX_AUTOPSIES_PER_IP_PER_DAY` is a daily, salted-hash counter in the cache store, so it survives restarts on Blob; a fixed global guard of 40 generations per hour per process protects spend further. Cached autopsies never count. GitHub rate-limit headers (`x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`) are honoured: once exhausted, the app fails fast until the reset time and tells the visitor when to retry. AI or GitHub failures degrade to a notice; repository browsing keeps working.

## Moderation and privacy

`/admin` uses a password checked exclusively on the server and an expiring HMAC-signed, HttpOnly, SameSite=Strict cookie (Secure in production). Sessions last eight hours. Every admin mutation and private preview independently verifies the session. Login attempts and visitor submissions have lightweight in-process limits. Next.js Server Actions provide same-origin mutation protection; the AI route verifies its origin.

Pending, published, rejected and draft records are shown separately. The moderator can preview, edit, publish, reject, or permanently delete a record and its images. Deletion requires a confirmation. Changing a title preserves the existing public slug. Publishing revalidates the public archive and metadata.

Creator email is private by default and has no automatic public email action. A creator can explicitly provide a public HTTP(S) contact link; only then does the interest button appear. External URLs reject unsafe protocols and embedded credentials. User text is rendered as text, never raw HTML. JSON-LD escapes HTML delimiters.

Uploads accept JPEG, PNG and WebP only. The browser resizes/compresses files, then the server independently decodes and re-encodes them to WebP, stripping metadata and enforcing byte/pixel/count limits. One cover and up to five screenshots are supported, each with alt text. New uploads total at most 3 MB inside the 4 MB Server Action request limit.

## Seed content

Both seeds are marked **SAMPLE PROJECT**, excluded from homepage counts, and hidden entirely from the production public archive. They remain editable in admin for demonstration purposes. `npm run seed` only adds these clearly labeled samples and never overwrites existing records.

- **Fintal** contains only the product facts supplied in the specification. Unknown technologies, dates, hours and lessons are blank.
- **Tabula** is explicitly fictional demo content illustrating a fuller postmortem.

Edit `src/data/seed-projects.ts` before first seeding, or use the admin editor for existing records. Changes to the seed source do not overwrite stored content.

## SEO, sharing and analytics

Published pages are server rendered, with canonical URLs, individual titles/descriptions, Article JSON-LD, Open Graph images, Twitter cards, sitemap and robots rules. The reusable OG layout is also rendered with each project's title/status/cause. Private admin routes are noindex; drafts and rejected submissions return 404 on public project routes.

Optional Vercel Web Analytics tracks homepage visits, project views, bury clicks, submission starts, AI drafts, completed submissions and contact interest. Events contain no email, project text or contact URL. The product works with analytics disabled.

## Deliberate MVP limits

- Blob lists/loads JSON records rather than querying an index. Suitable for a small archive, not a large catalog. Concurrent admin edits are last-write-wins; there is no revision history or transactional multi-record update.
- Rate limits are process-local and reset on restart; they are not an anti-abuse service. Provider quotas are needed for firm AI spending controls.
- No visitor accounts or self-service edits after submission. Moderation handles corrections.
- The in-progress story is kept in browser memory. Closing or reloading the page clears it. Failed AI calls or saves do not clear it.
- No automated email, messaging, offers, payments or marketplace workflow. Interest opens the explicitly supplied public contact link.
- Real Blob/Gemini requests require configured credentials. Local automated tests do not incur provider usage.



Implementation references: [Next.js App Router](https://nextjs.org/docs/app), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [AI SDK structured output](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [Google provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai).

## First-launch submission flow and languages

English is the default at `/`; Brazilian Portuguese is at `/pt`. All public routes have a `/pt` equivalent, including project pages, About and submission. On the first visit, `src/proxy.ts` reads the browser `Accept-Language` header (the standard signal for OS/browser language preferences) and redirects Portuguese users to `/pt` without storing any personal data. A `deadfolio-locale` cookie remembers manual choices from the header language switcher. The switcher lives in the main navigation and uses a full document navigation so `<html lang>` and server copy stay consistent. Typed dictionaries live in `src/lib/i18n/dictionaries.ts`. Visitor stories and project facts stay in their original language; AI formats into the selected locale. Canonicals, language alternatives and sitemap entries cover both locales.

The submission form collects project name, raw story (50–15,000 characters), an optional URL/GitHub, one next-step choice, creator name and private email. It always accepts direct stories; Gemini is optional. Only project name and story are sent to Gemini, never the creator email or identity fields. The original text remains in memory after request failures and is stored privately with successful submissions.

Records have `submissionType: raw | structured`, private `rawStory` and `locale`, and an `isFounder` flag. Older records load as structured. Incomplete AI drafts are accepted as pending structured records. Public projection strips private story, email and submission metadata. Raw records cannot publish, even through a direct admin action. The moderator opens their original story in the existing editor, completes the public record and saves; this explicitly converts them to structured while keeping the original story private. Publication validates the full schema again. Unknown metrics remain null.

`/admin/new` creates genuine founder records, protected by the existing admin session. Visitors cannot set the founder flag. Nothing auto-publishes. No real founder facts are bundled into this patch: supply and approve at least two before the first launch. If none exist, the admin shows a prominent launch blocker rather than creating fake projects.
