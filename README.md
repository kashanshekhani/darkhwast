# DarKhwast

**AI complaint router for local government, Pakistan.** A citizen describes a civic issue (garbage, broken streetlight, water shortage, sewage, road damage) in plain Urdu, Roman Urdu, or English. DarKhwast classifies the issue, drafts a formal complaint letter, routes it to the responsible department for their city, and emails it on the citizen's behalf. The citizen stays anonymous by default and gets a public tracking page; departments receive and manage complaints in an official dashboard.

Built for the **Bano Qabil x Alibaba Cloud Launch AI Hackathon 2026** (5-day scope).
Specs: [`PRD.md`](./PRD.md) | [`DESIGN.md`](./DESIGN.md)

---

## Quick start

Requires Node.js 18+. On Windows, double-click `run.bat`, or:

```bash
npm install
npm start
# DarKhwast running at http://localhost:3000
```

No API keys needed to run: without configuration the app uses a built-in offline rule-based classifier (Urdu/Roman Urdu/English keywords) and simulates email dispatch. Everything works out of the box in demo mode.

**Demo accounts (official dashboard at `/login.html`):**

| Role | Email | Password |
|---|---|---|
| Operator (admin) | `demo@darkhwast.pk` | `darkhwast2026` |
| Viewer (read-only) | `viewer@darkhwast.pk` | `darkhwast2026` |

**Reset to a clean demo state** (keeps the 4 seeded sample complaints):

```bash
npm run reset
```

## Configuration (optional, for real AI + real email)

Copy `.env.example` to `.env`:

| Variable | What it does |
|---|---|
| `DASHSCOPE_API_KEY` | Enables Qwen (Alibaba Cloud DashScope) for classification, routing, and Urdu/English summaries. Without it, the offline rules engine runs. |
| `LLM_MODEL` | Defaults to `qwen-plus`. |
| `SMTP_HOST` etc. | Enables real outbound email (Alibaba Cloud DirectMail or any SMTP). Without it, sends are **simulated**: logged to the server console and recorded as `simulated` in the dispatch log and UI. |
| `PUBLIC_BASE_URL` | Used in the tracking link inside outbound letters. |
| `SEED_SAMPLES` | `false` disables the sample complaints on first run. |

> **Before any real outbound sending:** the department emails in `lib/seed.js` are public-directory placeholders (`verified: false`). Verify each one, and confirm with hackathon organizers that sending to real offices on citizens' behalf is permitted (see PRD open question 1).

## The 60-second demo script (judges)

1. Open `http://localhost:3000` on a phone-sized window: Urdu RTL by default, English toggle in the header. File a complaint.
2. Type something messy in Roman Urdu: *"Gulshan block 5 mein kachra 10 din se nahi utha"*. Pick Karachi. Submit. Staged progress: reading, finding the office, drafting.
3. Review screen: classified as Garbage (one-tap correction available), the formal letter artifact, routed to SSWMB, anonymous toggle on. Press **Send**, confirm in the modal.
4. Receipt: `SENT` stamp, tracking ID, destination, next steps. Copy the ID.
5. Open `/login.html`, sign in as `demo@darkhwast.pk`. Dashboard: stats, filters, queue with your complaint on top (seeded rows are tagged `sample`).
6. Open it, set status **Acknowledged** with a note, hit update.
7. Back on the tracking page (`/track/DK-...`): the citizen now sees the acknowledgement and the department's note. Loop closed, live, no mock data in the critical path.

## What's implemented (MVP scope from PRD)

- **FR-1 Intake:** free-text complaint (min 20 chars), searchable city select (Karachi, Lahore, Islamabad, Faisalabad), area, profanity screen, 3/hour rate limit, local draft autosave.
- **FR-2 Classification:** Qwen via DashScope when configured; offline keyword rules otherwise. Category, severity, English + Urdu summaries, confidence. Below 0.6 confidence the citizen must pick the category (human-in-the-loop) before sending.
- **FR-3 Letter drafting:** formal English complaint letter assembled from extracted facts, editable by the citizen before sending.
- **FR-4 Routing:** the AI *selects* from a curated knowledge base (15 departments: 4 seed cities + cantonment/national coverage), never invents. Routing rationale stored and shown to officials.
- **FR-5 Dispatch:** real SMTP when configured; otherwise simulated with full logging. Failures land in `send_failed` and surface in the dashboard's "Needs attention" filter.
- **FR-6 Tracking:** public `/track/{id}` page, zero PII, timestamped status stepper with department notes. No login.
- **FR-7 Dashboard:** login, stat cards (totals, open, needs attention, category/city bars), searchable/filterable queue, complaint detail with letter, facts, contact, dispatch log, status control with citizen-visible notes.
- **Anonymity:** default on; identifying fields appear only when toggled off; contact is stripped from records when anonymous.
- **Bilingual RTL UI:** Urdu default with Nastaliq type rules (18px, line-height 2), English toggle, logical CSS properties throughout.

Not in the prototype (pitch as roadmap, per PRD): voice input, WhatsApp/SMS channel, photo attachment, geolocation, escalation, official-portal integrations.

## Architecture

Zero-build vanilla web app + tiny Express API + JSON file datastore. No native dependencies, no database server, deployable anywhere Node runs (fits Alibaba Cloud ECS free tier; static files can move to OSS + CDN later).

```
server.js            Express app: routes, auth, rate limits
lib/
  classify.js        Qwen (DashScope) classifier + offline rules fallback + dept resolver
  letter.js          Formal complaint letter template
  mail.js            Nodemailer dispatch (real SMTP or simulated mode)
  db.js              JSON-file datastore (data/db.json), atomic writes
  seed.js            Department knowledge base, officials, sample complaints
  util.js            IDs, hashing, rate limiter, validation, profanity screen
public/
  index/file/review/sent/track.html    Citizen flow (Urdu/English, RTL)
  login/dashboard/complaint.html       Official dashboard (English)
  css/styles.css    Design tokens + components from DESIGN.md
  js/               i18n, shared helpers, one script per page
data/db.json         Created at first run (gitignore-able)
```

### API map

| Method & path | Purpose |
|---|---|
| `POST /api/complaints` | Create + classify + route + draft letter |
| `GET /api/complaints/:id` | Citizen view of own complaint |
| `PATCH /api/complaints/:id/category` | Citizen category correction (re-routes, re-drafts) |
| `POST /api/complaints/:id/send` | Finalize identity, dispatch email, set status |
| `GET /api/track/:tid` | Public tracking data (no PII) |
| `POST /api/official/login` / `logout` / `me` | Official auth (bearer token) |
| `GET /api/official/complaints` | Full queue for the dashboard |
| `GET /api/official/complaints/:id` | Detail incl. contact, dispatch log, history |
| `PATCH /api/official/complaints/:id/status` | Status update with citizen-visible note |

## Design system (see DESIGN.md)

- **Case-file metaphor:** paper background, stamp green (#0E6B5C), ink navy, the letter as a sealed document artifact, the receipt as the screenshot moment.
- **Type:** Public Sans (UI), Noto Naskh Arabic (Urdu, compact UI-friendly register), Source Serif 4 (letters only), IBM Plex Mono (tracking IDs).
- **Desktop dashboard:** dark sidebar navigation (filter shortcuts with live counts), stat cards with icons, dense queue table with department column and deep links (`?status=`, `?attention=1`); collapses to top bar + stacked cards under 1024px.
- **Landing on desktop:** two-column hero with a stamped letter artifact mockup, per DESIGN.md.
- **Accessibility:** WCAG AA contrast throughout, visible focus rings, keyboard-navigable (combobox, table rows, modal), ARIA live regions for staged loading and toasts, severity never color-only, reduced-motion support.

## Known limitations (be honest in the pitch)

- Department emails are placeholders pending verification; simulated dispatch is the default demo mode.
- Offline rule classifier is keyword-based; Qwen (via DashScope key) is the real path and also the hackathon's Alibaba Cloud story.
- Citizen event notes ("Complaint approved and sent by citizen") are English-only in v1.
- No HTTPS/session expiry hardening: prototype-grade auth, fine for the demo, not production.
