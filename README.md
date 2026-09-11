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

Open http://localhost:3535. No service credentials are required. Manual submissions, moderation, image processing, and persistence all work locally. To moderate, set a random `ADMIN_PASSWORD` of at least 16 characters in `.env.local`, restart the server, and visit `/admin`.

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
- `src/components/submission/`: story entry, progressive editor and review.
- `src/data/seed-projects.ts`: editable sample projects.

Routes: `/`, `/graveyard`, `/projects/[slug]`, `/bury`, `/about`, `/admin`. Admin previews and editors are nested under `/admin/[id]`. Private media is served through `/media/[id]/[name]`; internal Blob URLs are never project navigation URLs.

## Configuration

See `.env.example` for the complete starting configuration.

- `PROJECT_REPOSITORY`: `local` for development or `blob` for Vercel. Defaults to local outside Vercel and Blob on Vercel. Filesystem mode fails closed on Vercel rather than silently losing submissions.
- `LOCAL_DATA_DIR`: local storage directory, default `.data`.
- `SEED_DEMOS`: `true` seeds the filesystem repository on its first initialization. `false` starts empty. It does not remove existing records. Blob is seeded explicitly, below.
- `BLOB_READ_WRITE_TOKEN`: optional static token for a **private** Vercel Blob store. On Vercel, connecting the store is enough: the SDK uses `BLOB_STORE_ID` with OIDC. The token is still needed to seed from your machine.
- `ADMIN_PASSWORD`: random server-side secret, minimum 16 characters. Empty or short values disable administration. Rotating it invalidates existing sessions.
- `NEXT_PUBLIC_APP_URL`: canonical origin, without a trailing slash; use the real HTTPS domain in production.
- `AI_ENABLED`: defaults to `false`. Set `true` only to opt into AI provider usage.
- `GEMINI_API_KEY`: server-only Google Gemini API key. Both this key and `AI_ENABLED=true` are required.
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
5. To add the two example records to the Blob store, put its environment values in your local `.env.local` and run `npm run seed`. This explicitly writes demo records to the selected repository. Existing records with the same IDs are preserved. Deployments do not silently create or restore seeds.
6. Visit `/admin` to verify the archive and delete or replace sample records before promoting it publicly.

Storage layout: `deadfolio/projects/<id>.json` and `deadfolio/media/<id>/<random-id>.webp`. Moderation status lives inside each JSON record. Blob reads bypass the CDN cache for moderation correctness. Media responses are authorized against the current record and are not publicly cached, so rejecting a project also withdraws its images.

Use the available free tier, review the provider's current quotas, and set usage controls before enabling external services. The application does not subscribe to a paid plan or enable AI automatically. A real Vercel deployment requires your own project and store configuration; there is no deployed URL included with this source tree.

## Optional Gemini formatting

Create a Gemini API key in Google AI Studio. Set `GEMINI_API_KEY` and `AI_ENABLED=true`, then restart/redeploy. The server uses `gemini-2.5-flash-lite` with AI SDK `generateText`, `Output.object`, and Zod validation. Structured extraction is instructed not to invent metrics, technologies, dates, development time, failure reasons or personal information. Unknown facts remain blank. The user must review and complete the draft before submitting, and moderation still applies.

The form explains that text is sent to Google. Never paste credentials or confidential material. With no key, the assistant is visibly offline and manual entry remains available. If extraction fails or times out, the original story remains in the form and **Continue manually** opens the editor. The prompt reduces unsupported generation but cannot guarantee factual accuracy; human review remains essential.

The endpoint limits input to 15,000 characters, output to 5,000 tokens, uses no automatic retries, times out after 45 seconds, and has simple per-process per-client/global request limits. Those limits are best-effort on serverless deployments, not a distributed quota or spending guarantee. Set provider-level quotas before opting in.

## Moderation and privacy

`/admin` uses a password checked exclusively on the server and an expiring HMAC-signed, HttpOnly, SameSite=Strict cookie (Secure in production). Sessions last eight hours. Every admin mutation and private preview independently verifies the session. Login attempts and visitor submissions have lightweight in-process limits. Next.js Server Actions provide same-origin mutation protection; the AI route verifies its origin.

Pending, published, rejected and draft records are shown separately. The moderator can preview, edit, publish, reject, or permanently delete a record and its images. Deletion requires a confirmation. Changing a title preserves the existing public slug. Publishing revalidates the public archive and metadata.

Creator email is private by default and has no automatic public email action. A creator can explicitly provide a public HTTP(S) contact link; only then does the interest button appear. External URLs reject unsafe protocols and embedded credentials. User text is rendered as text, never raw HTML. JSON-LD escapes HTML delimiters.

Uploads accept JPEG, PNG and WebP only. The browser resizes/compresses files, then the server independently decodes and re-encodes them to WebP, stripping metadata and enforcing byte/pixel/count limits. One cover and up to five screenshots are supported, each with alt text. New uploads total at most 3 MB inside the 4 MB Server Action request limit.

## Seed content

Both seeds are marked **SAMPLE PROJECT** and excluded from homepage social-proof counts.

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

The future MCP entry point can call the same `ProjectSubmission` schema and `submitProject(input, repository)` service. No MCP server is implemented in this MVP.

Implementation references: [Next.js App Router](https://nextjs.org/docs/app), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [AI SDK structured output](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [Google provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai).
