# DEADFOLIO MVP

Build a production ready MVP called **Deadfolio**.

Deadfolio is a public home for abandoned, failed and unfinished technology projects.

The central idea is:

**Dead projects belong in your portfolio too.**

People spend weeks, months or years building products that eventually fail, lose traction, become obsolete or are abandoned.

Those projects still contain useful code, lessons, designs, experiments and stories.

Deadfolio allows creators to document those projects publicly, explain what happened and optionally make them available for collaboration, open source, adoption or acquisition.

This is NOT initially a social network.

This is NOT initially a startup marketplace.

This is NOT initially a project management tool.

The primary object is a **project postmortem**.

The MVP must feel polished, memorable and shareable while remaining technically simple.

# 1. Product Goal

We are testing one primary hypothesis:

> Are people willing to publicly share failed or abandoned technology projects and explain why they died?

The most important conversion is:

**Submit a project**

The second most important signal is:

**Someone is interested in giving a project a second life.**

Do not optimize for accounts, engagement loops or social networking yet.

# 2. Product Language

The entire product must be in English.

Do not implement internationalization.

All navigation, metadata, forms, validation messages and AI generated content must use English.

# 3. Technology Stack

Use:

Next.js latest stable version

App Router

TypeScript

React

Tailwind CSS

shadcn/ui only where useful

Lucide icons

Zod

Vercel

Vercel Blob for persistence

Vercel AI SDK

Gemini 2.5 Flash Lite as the initial AI provider

The AI integration must be optional.

The site must continue working if no AI API key exists.

Do not add:

PostgreSQL

Supabase

Firebase

Prisma

Drizzle

MongoDB

Clerk

Auth0

Redis

A separate backend

A separate database

The MVP should remain a single Next.js application.

# 4. Engineering Principles

Keep the architecture intentionally small.

Do not overengineer.

Prefer Server Components.

Use Client Components only where interaction requires them.

Use Server Actions for normal mutations where appropriate.

Use Route Handlers only where they make architectural sense, especially for AI processing.

All persistent access must go through a repository abstraction so that Vercel Blob can later be replaced by Postgres without rewriting the application.

Example:

```ts
interface ProjectRepository {
  findAll(): Promise<Project[]>
  findPublished(): Promise<Project[]>
  findBySlug(slug: string): Promise<Project | null>
  createSubmission(input: ProjectSubmission): Promise<Project>
  update(id: string, input: Partial<Project>): Promise<Project>
  approve(id: string): Promise<Project>
}
```

The UI must never directly access Vercel Blob.

# 5. Brand

Product name:

**Deadfolio**

Primary tagline:

**Dead projects belong in your portfolio too.**

Alternative supporting message:

**Every failed project has a story worth keeping.**

The brand should feel:

Editorial

Technical

Premium

Slightly irreverent

Minimal

Dark

Memorable

Avoid making the design look like:

Halloween

A gaming website

A crypto product

A generic SaaS dashboard

A Tailwind starter template

Do not overuse skull illustrations.

The concept of death should mostly appear through language, typography and subtle visual references.

# 6. Visual Direction

Use a dark visual system.

Recommended base:

Background: near black, not pure black

Surface: graphite

Primary text: warm off white

Secondary text: muted gray

Primary accent: acid green or electric chartreuse

Danger accent: restrained red or orange

Borders: subtle gray

Use strong typography.

Recommended:

Geist Sans

Geist Mono

Use monospace typography for:

Status

Technology

Metrics

Metadata

Cause of death

Dates

Use large typography on editorial sections.

Use generous spacing.

Cards should feel more like case study previews than standard SaaS cards.

Animations should be subtle.

Use transitions for hover, reveal and state changes.

Do not add unnecessary page animations.

# 7. Main Navigation

Desktop:

Deadfolio logo

Graveyard

About

Bury a Project

Mobile:

Logo

Menu

Bury a Project CTA

Primary button:

**Bury a Project**

# 8. Homepage

Route:

`/`

The homepage must tell the entire concept within seconds.

## Hero

Small eyebrow:

`THE PORTFOLIO OF THINGS THAT DIDN'T MAKE IT`

Main headline:

**Good projects die.**

Second line:

**Their work doesn't have to.**

Supporting copy:

**Deadfolio is where developers and makers document abandoned projects, share what went wrong and preserve what was worth building.**

Primary CTA:

**Bury a Project**

Secondary CTA:

**Explore the Graveyard**

Include a subtle visual element suggesting:

project records

terminal logs

archive cards

case files

Do not use a huge skull graphic.

## Social proof area

Only show real metrics when data exists.

Possible metrics:

Projects buried

Hours invested

Projects looking for a second life

Projects revived

Do not hardcode fake social proof.

If there is insufficient real data, hide this section.

## Graveyard section

Title:

**The Graveyard**

Subtitle:

**Projects ended. Lessons didn't.**

Render the latest published projects.

Each project card should contain:

Project name

Tagline

Status

Category

Cause of death

Development duration if available

Technology tags

Cover image if available

Current fate

CTA:

**Read the autopsy**

Example:

```text
FINTAL

Personal finance software that made money management beautiful
but couldn't overcome the friction of manual imports.

💀 DEAD

CAUSE OF DEATH
USER FRICTION

11 MONTHS
COMPLETE MVP

Next.js
NestJS
Supabase

Looking for a second life

Read the autopsy →
```

## Final CTA

Large editorial section near the bottom.

Headline:

**Got one buried in your GitHub?**

Supporting copy:

**You already built it. You already learned from it. Don't let the story disappear with the repository.**

Button:

**Bury your project**

# 9. Graveyard Page

Route:

`/graveyard`

Display every published project.

The page should contain simple filters.

Filters:

Status

Cause of death

Category

Technologies

Do not implement complex backend search.

Client side filtering is acceptable for the MVP.

Possible statuses:

Dead

Frozen

Looking for a second life

Revived

Possible causes:

No market

Distribution

Competition

User friction

Technical complexity

Costs

Timing

Lost interest

Team issues

Regulation

Other

Possible categories:

SaaS

Developer Tool

AI

Mobile App

Web App

Browser Extension

Open Source

Marketplace

Other

# 10. Project Detail Page

Route:

`/projects/[slug]`

The page should look like a combination of:

Technical case study

Product postmortem

Digital obituary

## Header

Show:

Project name

Tagline

Creator

Cover image

Status

Category

Development period

Estimated time invested

Stage reached

Technology stack

External links

Possible links:

Website

GitHub

Demo

Creator profile

LinkedIn

X

## Section: The Idea

Heading:

**The Idea**

Explain:

What problem was being solved?

Who was it for?

Why did the creator think it could work?

## Section: What Was Built

Heading:

**What Was Built**

Show structured features and screenshots when available.

## Section: Cause of Death

This should be the most visually distinctive part of the page.

Heading:

**Cause of Death**

Show one primary cause prominently.

Example:

```text
CAUSE OF DEATH

USER FRICTION
```

Then show the creator's explanation.

The failure must not be hidden or softened.

This is the core content.

## Section: What Went Wrong

Heading:

**What I Got Wrong**

Show mistakes, invalid assumptions and problems.

## Section: What Worked

Heading:

**What Actually Worked**

Failures usually contain successful components.

Highlight them.

## Section: Lessons

Heading:

**What I Learned**

Render meaningful lessons.

Do not turn them into motivational quotes.

## Section: What Survived

Heading:

**What Survived**

Possible assets:

Frontend

Backend

Design system

Mobile app

Domain

Dataset

Users

Documentation

Infrastructure

API integrations

Brand assets

Repository

## Section: What's Next

Heading:

**What Happens Now?**

Possible project intentions:

Let it rest

Looking for collaborator

Available for adoption

Happy to open source

Open to offers

The creator can select multiple options except where logically contradictory.

If the creator allows contact, show:

**I'm interested in this project**

For the MVP, this button can reveal the creator's public contact link or open an email/contact action.

Do not implement internal messaging.

# 11. Submission Experience

Route:

`/bury`

This is one of the most important experiences.

The product should avoid presenting a long intimidating form immediately.

The first screen should say:

**Bury a Project**

Supporting copy:

**Don't fill out a boring form. Just tell us what happened.**

Show one large textarea.

Placeholder:

**Tell us about your project like you're explaining it to a friend. What did you build? How far did you get? Why did you stop? What still exists?**

Secondary helper:

**You can also paste a README, old launch post, project notes or product description.**

Primary button:

**Build my postmortem**

Secondary action:

**I'd rather fill it out manually**

# 12. AI Assisted Submission

When AI configuration is available, clicking:

**Build my postmortem**

should send the raw text to a server side endpoint.

Use Vercel AI SDK.

Use Gemini 2.5 Flash Lite.

Use structured output validated with Zod.

The model must convert unstructured text into structured project information.

Do not let the AI invent factual information.

Explicitly instruct the model:

Never invent revenue.

Never invent user counts.

Never invent technologies.

Never invent dates.

Never invent development time.

Never invent reasons for failure.

Never infer sensitive personal information.

If something is unknown, return `null`, an empty string or an empty array.

The AI may improve grammar and structure while preserving meaning.

Use approximately this schema:

```ts
const ProjectDraftSchema = z.object({
  title: z.string().nullable(),
  tagline: z.string().nullable(),
  summary: z.string().nullable(),

  category: z.enum([
    "saas",
    "developer-tool",
    "ai",
    "mobile-app",
    "web-app",
    "browser-extension",
    "open-source",
    "marketplace",
    "other"
  ]).nullable(),

  stage: z.enum([
    "idea",
    "prototype",
    "mvp",
    "launched",
    "revenue",
    "other"
  ]).nullable(),

  primaryCauseOfDeath: z.enum([
    "no-market",
    "distribution",
    "competition",
    "user-friction",
    "technical-complexity",
    "costs",
    "timing",
    "lost-interest",
    "team",
    "regulation",
    "other"
  ]).nullable(),

  causeExplanation: z.string().nullable(),

  originalIdea: z.string().nullable(),

  whatWasBuilt: z.array(z.string()),

  whatWentWrong: z.array(z.string()),

  whatWorked: z.array(z.string()),

  lessons: z.array(z.string()),

  survivingAssets: z.array(z.string()),

  technologies: z.array(z.string()),

  desiredNextSteps: z.array(
    z.enum([
      "let-it-rest",
      "collaboration",
      "adoption",
      "open-source",
      "offers"
    ])
  )
})
```

# 13. AI Fallback

AI must NOT be required for submission.

If no API key exists, hide or disable AI formatting gracefully.

If AI fails:

Show:

**We couldn't format your story automatically. Nothing was lost.**

Button:

**Continue manually**

The user's text must remain available.

Never block submission because AI is unavailable.

# 14. Review Step

AI must never publish directly.

After extraction, show:

**Here's your project's autopsy.**

Display every generated field in an editable UI.

Users should be able to:

Edit text

Remove content

Add missing content

Change category

Change cause of death

Change technologies

Change project intention

Add links

Upload cover

Add screenshots

Then:

**Submit to Deadfolio**

# 15. Manual Submission Form

If the user chooses manual entry, organize the form into visually small sections.

Do not show twenty inputs on one screen.

Use progressive sections.

## Project

Project name

One sentence description

Category

Stage

Website

GitHub

## Story

What were you building?

Why did you build it?

How far did you get?

Why did you stop?

## Autopsy

Primary cause of death

What went wrong?

What actually worked?

What did you learn?

## Remains

What still exists?

Technologies

Development time

Estimated hours invested

## Future

What should happen to this project?

Let it rest

Find collaborators

Let someone adopt it

Open source it

Open to offers

## Creator

Display name

Email

Public profile URL

GitHub

LinkedIn

X

Email must never be publicly shown automatically.

# 16. Submission Moderation

Projects submitted by visitors must not publish automatically.

Project statuses:

```ts
type ModerationStatus =
  | "draft"
  | "submitted"
  | "published"
  | "rejected";
```

After submission show:

**Your project is waiting to be buried.**

Supporting text:

**We review submissions before they enter the Graveyard.**

Generate and show a submission identifier.

# 17. Admin

Route:

`/admin`

Do not build a complex admin system.

Protect it with a simple secret using environment configuration.

For example:

`ADMIN_PASSWORD`

or another secure server side mechanism.

Never expose the admin secret to the browser.

Admin must show:

Pending submissions

Project preview

Publish action

Reject action

Edit action

Delete action

Published projects

No role system is necessary.

# 18. Persistence

Use Vercel Blob.

Store structured JSON documents.

Suggested conceptual organization:

```text
deadfolio/

projects/
  project-id.json

submissions/
  submission-id.json

media/
  project-id/
    cover.webp
    screenshot-1.webp
```

Create a repository abstraction.

Example location:

```text
src/lib/repositories/project-repository.ts
```

Create a Vercel Blob implementation.

Also create a local development implementation.

For local development, allow filesystem or in memory seed data.

The application should work locally without needing Vercel Blob credentials.

# 19. Domain Models

Create strong TypeScript types.

Suggested Project model:

```ts
type ProjectStatus =
  | "dead"
  | "frozen"
  | "second-life"
  | "revived";

interface Project {
  id: string;
  slug: string;

  title: string;
  tagline: string;
  summary: string;

  category: ProjectCategory;
  stage: ProjectStage;
  status: ProjectStatus;

  primaryCauseOfDeath: CauseOfDeath;
  causeExplanation: string;

  originalIdea: string;

  whatWasBuilt: string[];
  whatWentWrong: string[];
  whatWorked: string[];
  lessons: string[];
  survivingAssets: string[];

  technologies: string[];

  developmentDuration?: string;
  estimatedHours?: number;

  desiredNextSteps: NextStep[];

  coverImage?: string;
  screenshots: string[];

  links: {
    website?: string;
    github?: string;
    demo?: string;
  };

  creator: {
    name: string;
    profileUrl?: string;
    github?: string;
    linkedin?: string;
    x?: string;
  };

  moderationStatus: ModerationStatus;

  createdAt: string;
  publishedAt?: string;
}
```

Use Zod schemas matching these types.

Do not trust client input.

Validate on the server.

# 20. URLs

Use human readable project slugs.

Example:

`/projects/fintal`

Do not expose Blob URLs for navigation.

Expected routes:

```text
/
/graveyard
/projects/[slug]
/bury
/about
/admin
```

Possible API route:

```text
/api/ai/project-draft
```

# 21. Images

Allow:

One cover image

Up to five screenshots

Compress images before or during upload where practical.

Do not build an image editor.

Provide good empty states when no images exist.

# 22. Sharing

Project pages must look excellent when shared.

Use Next.js Metadata API.

Generate dynamic:

Page title

Description

Open Graph metadata

Twitter card metadata

Canonical URL

Each project should eventually support an OG card concept like:

```text
FINTAL

DEAD AFTER 11 MONTHS

CAUSE OF DEATH

USER FRICTION

deadfolio
```

If automatic image generation adds too much complexity, create one reusable static OG layout for the MVP.

Do not make dynamic OG images a blocker for launch.

# 23. SEO

Create:

Metadata

Sitemap

robots.txt

Semantic headings

Canonical URLs

Project JSON where appropriate

Each published project must be server rendered and indexable.

Example title:

**Fintal: Why this personal finance project failed | Deadfolio**

Example description:

**Fintal was a personal finance app that reached a complete MVP before being abandoned because of user friction. Read the full postmortem on Deadfolio.**

# 24. Seed Data

The application must not launch empty.

Include at least two clearly editable seed projects.

One can be:

**Fintal**

Category:

SaaS

Status:

Dead

Stage:

Complete MVP

Primary cause:

User friction

Description:

A personal finance application that included transaction importing, categorization, dashboards, calendar functionality and notifications.

The key failure:

Manual statement importing created too much friction compared with modern financial apps connected directly to banking data.

Do not invent users, revenue or business metrics.

Create another sample project as clearly marked demo content that can easily be replaced before production.

Keep seed data isolated in:

```text
src/data/seed-projects.ts
```

# 25. About Page

Route:

`/about`

Keep it concise.

Suggested content:

**Most portfolios show what survived. Deadfolio shows what didn't.**

Then explain:

People build things that fail.

Failure doesn't erase engineering work.

Failure doesn't erase lessons.

Failure doesn't erase creativity.

Deadfolio preserves those stories.

Finish with:

**Built something that didn't make it? Bury it here.**

CTA:

**Bury a Project**

# 26. Empty States

Every empty state should reinforce the brand.

Examples:

No projects:

**Nothing buried here yet.**

No filter results:

**No projects died this way.**

No surviving assets:

**Nothing was left behind.**

No screenshots:

Do not show an empty gallery.

AI unavailable:

**The autopsy assistant is offline. You can still bury your project manually.**

# 27. Loading and Error States

Add proper:

Loading skeletons

Form submission loading

Image upload progress where useful

AI processing state

Error states

Success states

While AI processes:

**Examining the remains...**

Possible secondary copy:

**Turning your story into a project postmortem.**

Keep the tone subtle.

# 28. Mobile

Mobile experience is mandatory.

The majority of users arriving from LinkedIn and Reddit may open the site on mobile.

Ensure:

Hero works on narrow screens

Cards remain readable

Filter UI works

Submission textarea is comfortable

Forms do not feel overwhelming

Project pages retain hierarchy

Buttons are easy to tap

No horizontal overflow

# 29. Accessibility

Use semantic HTML.

Keyboard accessible navigation.

Visible focus states.

Correct form labels.

ARIA only where necessary.

Sufficient contrast.

Images should support alt text.

Do not sacrifice accessibility for the dark aesthetic.

# 30. Analytics

Do not add a paid analytics provider.

If Vercel Web Analytics can be enabled for free, prepare for it.

Track conceptually:

Homepage visit

Project viewed

Bury project clicked

Submission started

AI draft generated

Submission completed

Interest in project clicked

The product must still work without analytics.

# 31. Security

Sanitize and validate all user generated content.

Never render raw user HTML.

Validate URLs.

Validate uploads.

Limit upload sizes.

Rate limit AI endpoints if it can be implemented simply.

Never expose:

AI API keys

Blob credentials

Admin secret

User email

Do not add complex security infrastructure beyond what the MVP requires.

# 32. Cost Constraint

The project is being validated with effectively zero budget.

This is a hard product requirement.

Prefer free tiers.

Do not add infrastructure that requires payment to start.

AI must be optional.

Do not configure services that can unexpectedly generate meaningful charges without explicit opt in.

The MVP must remain functional without the AI provider.

# 33. Explicit Non Goals

DO NOT implement:

User authentication

User accounts

Public user profiles

Followers

Likes

Comments

Internal messaging

Notifications

Email sequences

Payments

Subscriptions

Marketplace transactions

Offers system

GitHub OAuth

Automatic GitHub repository analysis

MCP server

AI chatbot

AI agent

Recommendation engine

Algorithmic feed

Teams

Organizations

Internationalization

Mobile app

Real time features

Complex search

These are future possibilities, not MVP requirements.

# 34. Future Compatibility

Although MCP is NOT part of this version, architecture should allow it later.

Future flow:

```text
Claude / ChatGPT / AI Agent
        ↓
Deadfolio MCP
        ↓
ProjectSubmissionSchema
        ↓
submission service
        ↓
ProjectRepository
```

The web form and future MCP must eventually be capable of using the same application service.

Do not implement the MCP now.

Simply avoid coupling project creation logic directly to the form UI.

Suggested service:

```ts
submitProject(input: ProjectSubmission)
```

# 35. Suggested Project Structure

Use something close to:

```text
src/
  app/
    page.tsx

    graveyard/
      page.tsx

    projects/
      [slug]/
        page.tsx

    bury/
      page.tsx

    about/
      page.tsx

    admin/
      page.tsx

    api/
      ai/
        project-draft/
          route.ts

  components/
    deadfolio/
      hero.tsx
      project-card.tsx
      project-grid.tsx
      project-filters.tsx
      cause-of-death.tsx
      project-autopsy.tsx
      project-status.tsx

    submission/
      story-input.tsx
      project-editor.tsx
      manual-form.tsx
      submission-success.tsx

    ui/

  lib/
    ai/
      extract-project.ts

    repositories/
      project-repository.ts
      blob-project-repository.ts
      local-project-repository.ts

    services/
      submit-project.ts
      publish-project.ts

    schemas/
      project.ts
      submission.ts

    utils/

  data/
    seed-projects.ts

  types/
    project.ts
```

Adjust when necessary, but preserve separation between:

UI

Business logic

Persistence

AI

# 36. Environment Variables

Prepare an `.env.example`.

Example:

```env
GEMINI_API_KEY=

BLOB_READ_WRITE_TOKEN=

ADMIN_PASSWORD=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

AI key must be optional during local development.

Blob credentials must be optional when using local repository mode.

# 37. README

Create a useful README containing:

What Deadfolio is

Product hypothesis

Technology stack

How to install

How to run locally

Environment variables

How local persistence works

How to configure Vercel Blob

How to configure Gemini

How to deploy to Vercel

Where seed projects live

How to access admin

Current MVP limitations

Future MCP idea

Do not write a generic generated README.

# 38. Design Details

Add small brand touches throughout the application.

Possible microcopy:

Instead of:

Submit project

Use:

**Bury Project**

Instead of:

Project Details

Use:

**Autopsy**

Instead of:

Status: Failed

Use:

**Dead**

Instead of:

Reason for failure

Use:

**Cause of Death**

Instead of:

Remaining assets

Use:

**What Survived**

Instead of:

AI processing

Use:

**Examining the remains...**

Do not overdo this vocabulary.

Clarity always wins over jokes.

# 39. Homepage Quality Bar

The homepage must not look like a standard hackathon project.

Spend meaningful effort on:

Typography

Spacing

Hierarchy

Cards

Responsive design

Hover states

Visual identity

The hero should be screenshot worthy.

The project cards should be screenshot worthy.

The project detail page should be screenshot worthy.

The product will initially be marketed through LinkedIn, Reddit and similar communities.

Visual credibility matters.

# 40. Primary User Journey

The ideal first experience:

Someone sees a Deadfolio post on LinkedIn.

They open Deadfolio.

Within five seconds they understand:

This is a portfolio of abandoned projects.

They scroll through real projects.

They open Fintal.

They read why it failed.

They recognize a similar project in their own history.

They click:

**Bury a Project**

They paste a rough description or README.

Deadfolio turns it into a structured postmortem.

They edit the result.

They submit it.

That is the complete MVP loop.

Optimize around this journey.

# 41. Acceptance Criteria

The MVP is complete when:

The homepage clearly communicates the idea.

Published projects can be browsed.

Projects have individual indexable pages.

Projects can be filtered.

A visitor can submit a project without creating an account.

A visitor can choose between AI assisted and manual submission.

AI extraction works when configured.

Manual submission works without AI.

AI never publishes automatically.

Submissions enter moderation.

Admin can review submissions.

Admin can publish or reject submissions.

Published projects persist.

Images can be attached.

The UI works well on mobile.

The UI looks intentional and branded.

The application runs locally without paid external services.

The application can deploy on Vercel.

README explains the setup.

There are no unnecessary MVP features.

# 42. Final Implementation Instruction

Build the application, not just mockups.

Implement the entire happy path.

Do not stop after creating the UI.

Do not leave core functionality as TODO comments.

Do not invent additional product features unless required to make the existing flow work.

When forced to choose between:

more features

and

better execution of the core journey

always choose the core journey.

Prioritize in this order:

1. Product identity and homepage

2. Project browsing and project page

3. Submission flow

4. Manual submission

5. AI assisted structuring

6. Persistence

7. Moderation

8. Responsive polish

9. SEO and sharing

10. Secondary refinements

The finished MVP should feel small, deliberate and launchable.

The goal is not to build the final Deadfolio.

The goal is to discover whether Deadfolio deserves to exist.