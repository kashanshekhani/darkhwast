# DarKhwast

**درخواست** · An AI complaint router for local government in Pakistan.

A citizen describes a civic problem — uncollected garbage, a broken streetlight, a water shortage, overflowing sewage, a damaged road — in their own words, in Urdu, Roman Urdu, or English. DarKhwast classifies the issue, drafts a formal complaint letter, finds the government department responsible for their city, and emails the complaint on the citizen's behalf. The citizen can stay anonymous and still track the complaint on a public page; departments receive and manage everything through an official dashboard.

Built for the **Bano Qabil × Alibaba Cloud Launch AI Hackathon 2026**.

| Documentation | |
|---|---|
| [`PRD.md`](./PRD.md) | Product requirements: scope, personas, functional specs, edge cases, metrics |
| [`DESIGN.md`](./DESIGN.md) | Design brief: principles, tokens, screens, components, accessibility |

---

## How it works

```
Citizen                    DarKhwast                                Department
------                    ---------                                ----------
Describe problem   ──►    Classify (Qwen / offline rules)
in own words              Draft formal letter
                          Route to department        ──►         Official dashboard
                          Email on citizen's behalf                (queue + status)
Track on public    ◄──────────────  status updates with notes  ──────────────
page, no login
```

Four screens from problem to receipt — that count is the product's pitch line.

## Quick start

Requires [Node.js](https://nodejs.org) 18 or later.

```bash
git clone https://github.com/kashanshekhani/darkhwast.git
cd darkhwast
npm install
npm start
```

Open **http://localhost:3000** — the citizen flow is on the landing page, and the official dashboard is at `/login.html`.

Run the unit test suite (classifier accuracy set, letter builder, utils) with `npm test`.

On Windows you can also double-click `run.bat`, which starts the server using Node from your `PATH`.

**No API keys or database needed.** Out of the box, DarKhwast runs in demo-safe mode:

- classification uses a built-in offline rule engine (Urdu / Roman Urdu / English keywords), and
- outbound email is **simulated** — logged to the server console and recorded in the dispatch log, with nothing leaving the machine.

Add credentials to switch either layer to production mode (see below).

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Operator (full access) | `demo@darkhwast.pk` | `darkhwast2026` |
| Viewer (read-only) | `viewer@darkhwast.pk` | `darkhwast2026` |

On first run the database is seeded with four sample complaints (visible in the dashboard, tagged `sample`) so the queue is never empty.

## Configuration

Copy `.env.example` to `.env` and fill in what you need. Everything is optional.

| Variable | Effect |
|---|---|
| `DASHSCOPE_API_KEY` | Enables **Qwen via Alibaba Cloud DashScope** for classification, routing, and Urdu/English summaries. Without it, the offline rules engine runs. |
| `LLM_MODEL` | Model to use; defaults to `qwen-plus`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Enables **real outbound email** (Alibaba Cloud DirectMail or any SMTP provider). Without `SMTP_HOST`, dispatch stays simulated. |
| `MAIL_FROM` | Sender address for outbound complaints. |
| `PUBLIC_BASE_URL` | Base URL used in tracking links inside letters. |
| `SEED_SAMPLES` | Set `false` to start with an empty database. |
| `TRUST_PROXY` | Set `true` only behind a trusted reverse proxy, so rate limiting reads the real client IP from `X-Forwarded-For`. Keep `false` otherwise. |
| `SESSION_TTL_HOURS` | Lifetime of official login sessions; defaults to `168` (7 days). |

Reset to a clean demo state at any time:

```bash
npm run reset
```

## A 60-second tour

1. Open the site on a phone-sized window: Urdu and right-to-left by default, English via the header toggle. Click **File a complaint**.
2. Type something messy in Roman Urdu — *"Gulshan block 5 mein kachra 10 din se nahi utha"* — pick Karachi, submit. Watch the staged progress: reading, finding the office, drafting.
3. Review screen: the issue is classified (with one-tap correction if the AI is unsure), the formal letter is shown in full, the responsible department (here: SSWMB) is named. Anonymous is on by default. Press **Send** and confirm.
4. Receipt: `SENT` stamp, tracking ID in a dashed box, destination, next steps. Copy the ID.
5. Sign in to the dashboard (`demo@darkhwast.pk`). Your complaint sits on top of the queue; seeded rows are tagged `sample`.
6. Open it, set status **Acknowledged** with a note, update.
7. Open the tracking page with the ID — the citizen now sees the acknowledgement and the department's note. Loop closed, live, no mock data in the critical path.

## Features

**For citizens**

- Free-text complaint in Urdu, Roman Urdu, or English — no forms, no jargon, no login
- AI classification with severity, English + Urdu summaries, and a confidence score; below the confidence threshold the citizen confirms the category (human-in-the-loop), nothing is auto-sent
- Formal complaint letter generated from the extracted facts, fully editable before sending
- Anonymous by default; contact details attached only if the citizen opts in
- Public tracking page with a timestamped status trail — zero personal data, no account
- Draft text persists locally, so a dropped mobile connection never loses a half-written complaint

**For departments**

- Sidebar-driven dashboard: live counts, deep-linkable status filters, full-text search
- Complaint detail with the exact letter that was sent, AI facts and routing rationale, dispatch log, and citizen contact (or anonymity notice)
- One-click status updates whose notes publish straight to the citizen's tracking page
- Read-only viewer role for staff who should not change state

**Under the hood**

- Routing is **selection, not invention**: the LLM may only choose from a curated department knowledge base (15 entries across Karachi, Lahore, Islamabad, Faisalabad, plus cantonment/national coverage); invalid picks fall back to a deterministic resolver
- Rate limiting on every public action (3 complaints/hour per IP, plus sends, logins, and public reads) and a profanity screen before anything is sent in the product's name
- Graceful degradation everywhere: no API key → rules engine; no SMTP → simulated dispatch; delivery failure → one automatic retry, then `send_failed` state surfaced to operators, never silently dropped
- Uploaded evidence images are served from a flat, validated namespace; the public complaint API only answers to unguessable record IDs — tracking IDs unlock the PII-free tracking view only

## Architecture

Zero-build vanilla web app + a small Express API + a JSON-file datastore. No bundler, no database server, no native dependencies — deployable anywhere Node runs (fits an Alibaba Cloud ECS free tier; static assets can move to OSS + CDN later).

```
server.js                 Express app: routes, auth, rate limits
lib/
  classify.js             Qwen (DashScope) classifier + offline fallback + dept resolver
  letter.js               Formal complaint letter builder
  mail.js                 Nodemailer dispatch (real SMTP or simulated mode)
  db.js                   JSON-file datastore (data/db.json), atomic writes, auto-seed
  seed.js                 Department knowledge base, demo officials, sample complaints
  util.js                 IDs, hashing, rate limiter, validation, profanity screen
public/
  index · file · review · sent · track.html     Citizen flow (Urdu/English, RTL)
  login · dashboard · complaint.html            Official dashboard (English)
  css/styles.css          Design tokens + components (see DESIGN.md)
  js/                     i18n, shared helpers, one module per page
  js/constants.js         Single source of city/category lists for the UI
test/                    node:test suite: classifier accuracy, letter builder, utils
```

The datastore lives in `data/db.json` (gitignored): it is created and seeded automatically on first run and written atomically on every mutation.

### API

| Method & path | Purpose |
|---|---|
| `POST /api/complaints` | Create, classify, route, and draft the letter |
| `GET /api/complaints/:id` | Citizen view of own complaint |
| `PATCH /api/complaints/:id/category` | Citizen category correction (re-routes, re-drafts) |
| `POST /api/complaints/:id/send` | Finalize identity, dispatch email, set status |
| `GET /api/track/:tid` | Public tracking data (no PII) |
| `POST /api/official/login` · `logout` · `GET /api/official/me` | Official auth (bearer token) |
| `GET /api/official/complaints` | Full queue for the dashboard |
| `GET /api/official/complaints/:id` | Detail incl. contact, dispatch log, history |
| `PATCH /api/official/complaints/:id/status` | Status update with citizen-visible note |
| `GET /api/meta/cities` | Supported cities and their departments |
| `GET /api/health` | Service status |

## Design system

The UI is built on a "case file" metaphor — in Pakistan a *darkhwast* is a typed, stamped, receipted petition, so the product's moment of value is the stamped receipt with a tracking number:

- **Palette:** ink navy `#1B2B44` for institutional authority, stamp green `#0E6B5C` (approving rubber-stamp ink, deliberately not flag green), warm paper `#FAF7F1` backgrounds
- **Type:** Public Sans (UI) · Noto Naskh Arabic (Urdu) · Source Serif 4 (formal letters only) · IBM Plex Mono (tracking IDs)
- **Urdu-first:** RTL by default via logical CSS properties, language toggle, Naskh at standard UI sizes
- **Accessibility:** WCAG AA contrast throughout, visible focus rings, keyboard-navigable controls, ARIA live regions for async status, severity never encoded by color alone, reduced-motion support

Full rationale, tokens, and per-screen specs: [`DESIGN.md`](./DESIGN.md).

## Roadmap

Not in the prototype, framed as future work in the pitch:

- Voice input with Urdu speech-to-text
- WhatsApp and SMS outbound + inbound status replies
- Photo attachments with AI issue assessment, geolocation and map views
- Auto-escalation when departments do not acknowledge within N days
- Integration with official portals (Citizen Portal APIs)

## Known limitations

Honest boundaries, stated so the demo stays credible:

- Department emails in `lib/seed.js` are public-directory placeholders marked `verified: false` — verify each one before enabling real outbound sending, and confirm with the hackathon organizers that sending to real offices on citizens' behalf is permitted
- The offline classifier is keyword-based; the Qwen path (via `DASHSCOPE_API_KEY`) is both the production mode and the hackathon's Alibaba Cloud story
- Auth is prototype-grade (bearer tokens with expiry, scrypt-hashed passwords with a legacy-hash migration path) — fine for the demo, not production
- Citizen-facing system event notes are English-only in this version
