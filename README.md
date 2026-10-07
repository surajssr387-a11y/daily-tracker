# Winter Arc tracker

A private daily challenge tracker for **September 28–December 30, 2026** (94 days), built with React, TypeScript, Vinext, and Cloudflare D1.

## Daily goals

The five foundations run throughout the challenge:

- 8 hours of sleep
- Breakfast
- Lunch
- Snack
- Dinner

Six editable personal goals start on **October 7, 2026**:

- Solve 2 DSA questions
- Complete 2 hours of web development
- Complete 2 hours of self-study
- Take a daily shower
- Sleep by 11 PM
- Reach out to 5 potential website clients

You can add goals, rename them, and retire them while keeping previous days in your history. New goals count from their start date, so they do not lower earlier daily scores.

## Features

- Daily check-offs with saved progress
- Daily completion, overall challenge completion, and consistency through today
- Perfect-day streaks and complete-day counts
- Interactive calendar covering all 94 days
- Mobile layouts and keyboard-accessible controls
- Server-side input validation, future-date protection, and user-specific records
- ChatGPT sign-in and private access through Sites

Progress is stored in D1; browser storage is not the source of truth. Personal check-offs, accounts, database files, credentials, and dependency/build output are not included in this repository.

## Local setup

Requirements: Node.js **22.13 or newer** and pnpm (the version is specified in `package.json`).

```bash
pnpm install
pnpm run build
```

Initialize the local database once:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_volatile_phalanx.sql
```

Start development:

```bash
pnpm dev
```

Open the local address printed by the development server. On a local portable checkout, visit `/signin-with-chatgpt?return_to=/` to enable the development-only mock user. Hosted sign-in is provided by Sites; this mock is not part of production builds.

For additional framework and environment documentation, see [STARTER_SETUP.md](STARTER_SETUP.md).

## Project structure

| Path | Purpose |
| --- | --- |
| `app/tracker.tsx` | Interactive tracker and goal editor |
| `app/globals.css` | Styling and responsive layouts |
| `app/api/tracker/route.ts` | Authenticated load/save API |
| `lib/tracker.ts` | Challenge dates, default goals, and progress calculations |
| `db/schema.ts` | D1 schema |
| `db/tracker.ts` | Database access and initial goals |
| `drizzle/` | Database migrations |
| `.openai/hosting.json` | Existing Sites project identity and database binding |

## Deployment and privacy

The current application uses **private Sites hosting**. This repository contains source code; pushing code does not change the hosted site's access policy.

Production needs a Worker runtime, a D1 binding named `DB`, the included migrations, and Sites-provided authentication. A static-only deployment does not provide the saved tracking or private access required by this app. Preserve owner-only access when updating the existing Site. A separate Site should use its own registered project identity.

Never commit access tokens, `.env` files, local database state, or user tracking records.

## Validation

The deployed version passed TypeScript checks and 46 automated checks covering check/uncheck, goal changes, persistence after reload and Worker restart, date validation, user isolation, calendar navigation, and page rendering. Browser visual testing was unavailable in the authoring environment.
