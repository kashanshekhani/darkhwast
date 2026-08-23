# PRD: DarKhwast - AI Complaint Router for Local Government, Pakistan

**Context:** Bano Qabil x Alibaba Cloud Launch AI Hackathon 2026. 5-day build. Free-tier budget. Alibaba Cloud stack. Web only.
**Decisions locked from clarifications:** Pan-Pakistan routing via dynamic lookup. Government dashboard is a must-have. "Done" = live end-to-end demo with no mock data in the critical path.

**One flagged tension before anything else:** outbound sending was not selected as must-have, but "live end-to-end demo" was selected as the definition of done. An end-to-end demo without real sending is not end-to-end. Opinionated call: **email sending stays in the MVP critical path** (SMTP via free tier is trivial and reliable); WhatsApp/SMS drop to v2. Voice input also drops to v2: it is the riskiest integration and was not marked must-have. If you disagree, this is the line to redraw.

---

## 1. Problem statement - who hurts and why

**Citizens** in Pakistani cities experience civic failures daily: uncollected garbage, dead streetlights, water shortages, overflowing sewage, potholes. Most never file complaints because:

- **They don't know who owns the problem.** Responsibility is fragmented across municipal corporations, development authorities (LDA, CDA, KDA), cantonment boards, provincial boards (Water Board, SSWMB), and utilities (K-Electric, WASA). A citizen with a broken streetlight in Lahore typically doesn't know whether it belongs to LDA, Lahore Waste Management Company, or the union council.
- **The complaint process is hostile.** It assumes literacy in formal Urdu or English, knowledge of departmental formats, and the confidence to write an "official" letter. Voice-first, low-literacy users are effectively excluded.
- **Follow-up is impossible.** No tracking number, no status, no accountability loop. People conclude complaining is pointless, so departments under-report civic failures and citizens normalize dysfunction.

**Government departments** hurt from the other side: they receive complaints through fragmented, lossy channels (phone calls, walk-ins, random emails, social media tags), in inconsistent formats, often misrouted, with no aggregate view of issue volume by area. That aggregate view is exactly the data they need to allocate crews and budgets.

**The gap:** no layer exists that translates a citizen's raw, spoken-or-typed, vernacular description into a classified, well-formatted complaint delivered to the correct authority, with a trackable record. That translation layer is an AI problem, and that is what DarKhwast builds.

---

## 2. Target users + personas

### Persona 1: "Farhan, 34, shopkeeper, Faisalabad" (primary - complaint filer)
Mobile-first Android user, Urdu-dominant, moderate English reading. Broken sewer water pooling outside his shop for a week. He called the union council office twice; nobody picked up. He doesn't know WASA exists or what it handles. He has 10 minutes, a phone, and low tolerance for forms. **Success for Farhan:** he types or dictates one messy sentence in Roman Urdu, and a formal complaint is on its way to the right office with a tracking ID he can screenshot.

### Persona 2: "Assistant Director Sana, 41, municipal services, a district administration" (secondary - complaint receiver)
Runs a small team handling public grievances. Today complaints arrive via calls, WhatsApp forwards, and a dusty suggestion box. She cannot answer "how many garbage complaints came from Union Council X this month?" **Success for Sana:** a dashboard where every complaint arrives pre-classified, with location, urgency, and citizen contact (or anonymous flag), where her team can update status and citizens can see it.

---

## 3. Goals and non-goals

### Goals (hackathon horizon - 5 days)
1. A live web app where any Pakistani citizen submits a civic complaint as free text (Urdu, English, or Roman Urdu) plus city and area.
2. AI classifies the issue (category + severity), extracts structured facts (location, duration, affected population), and drafts a formal complaint in English (and Urdu for display).
3. The system determines the responsible authority for that city + category via an AI-assisted routing lookup against a curated department knowledge base, and **actually emails the complaint** to that authority.
4. A government dashboard where a logged-in official sees the complaint queue, filters by category/status/city, and updates status (New to Acknowledged to In Progress to Resolved).
5. The citizen gets a public tracking page and can see status changes.
6. The whole flow (submit, classify, draft, route, send, dashboard, status, tracking page) runs live on real data during the demo.

### Non-goals (explicitly out; say so in the pitch)
- **No native mobile app.** Responsive web only.
- **No guaranteed response from departments.** DarKhwast delivers and tracks; it cannot compel a reply. Frame honestly: we create the accountability *record*.
- **No integration with official government systems** (PM portal APIs, Sindh Citizen Portal). Future vision.
- **No WhatsApp/SMS outbound in MVP.** Free-tier WhatsApp Business API approval will not clear in 5 days; SMS costs money. v2.
- **No voice input in MVP.** v2: demo the ambition in the pitch deck, not the build.
- **No user accounts for citizens.** Anonymous or contact-optional by design; tracking via ID, not login.
- **No SLA enforcement, escalation, or legal follow-through.** Later vision.
- **No payment, monetization, or auth beyond a simple department login.**

---

## 4. User stories

**Citizen (Farhan):**
- As a citizen, I want to describe my problem in my own words (Urdu or English, messy is fine) so that I don't need to know official terminology or formats.
- As a citizen, I want to just enter my city and area and have the system figure out which department is responsible, so that I never have to research jurisdiction myself.
- As a citizen, I want to review and edit the AI-drafted formal complaint before it's sent, so that it accurately represents my issue and I trust what's being submitted in my name.
- As a citizen, I want to file anonymously, so that I fear no blowback from anyone.
- As a citizen, I want a tracking ID and a public status page, so that I can check progress without calling anyone.

**Government official (Sana):**
- As an official, I want complaints to arrive pre-classified and formatted consistently, so that my team doesn't waste time deciphering them.
- As an official, I want a filterable queue (category, city, severity, status), so that I can triage and assign work.
- As an official, I want to update complaint status with one click, so that citizens see progress and my team's throughput is visible.
- As an official, I want a simple count-by-category and count-by-area view, so that I can spot patterns for resource allocation.

**System/operator (the DarKhwast team):**
- As an operator, I want a curated knowledge base of department contacts per city, so that routing has a verified ground truth the AI selects from.
- As an operator, I want to see when routing confidence is low, so that misrouted complaints are caught before sending.

---

## 5. Feature list - MVP / v2 / later

### MVP (buildable in 5 days - the demo critical path)
1. Complaint intake form (text + city + area + optional contact + anonymity toggle)
2. AI classification + fact extraction (category, severity, location, summary)
3. AI formal complaint drafting (English draft + Urdu display)
4. AI-assisted routing: LLM picks the department from a **curated per-city department knowledge base** (the pragmatic version of "pan-Pakistan dynamic lookup"; see Open Questions)
5. Real email dispatch to the routed department
6. Citizen tracking page (public, by complaint ID)
7. Government dashboard: login, complaint queue, filters, status updates, basic counts
8. Routing knowledge base for a seed set of cities (Karachi, Lahore, Islamabad, Faisalabad minimum) with real, verified email addresses, expandable by the routing lookup pattern

### v2 (post-hackathon; in pitch as "roadmap")
- Voice input with Urdu speech-to-text
- WhatsApp + SMS outbound and inbound status replies
- Photo attachment with AI damage/issue assessment
- Geolocation auto-detect and map view
- WhatsApp bot frontend
- Escalation: auto re-route if no acknowledgment in N days
- Urdu/English toggle across the whole UI

### Later (vision framing for the pitch; never claim built)
- Integration with official portals (Citizen Portal APIs)
- Department SLA analytics and public leaderboards
- Predictive resource allocation (issue hotspots)
- Multi-channel case management with field-worker mobile assignment

---

## 6. Detailed functional requirements (MVP features)

### FR-1: Complaint intake
- Fields: complaint text (required, min 20 chars), city (dropdown, seeded cities), area/neighborhood (free text), optional name + phone/email, anonymity toggle (default ON).
- Accepts Urdu script, Roman Urdu, English, or mixed.
- On submit: create complaint record with status `draft`, generate unique public tracking ID (e.g., `DK-2026-XXXXXX`).
- Validation: unknown city rejected with a "coming soon" message; never silently misroute.

### FR-2: AI classification + extraction
- Input: raw text + city + area. Output (structured JSON): `category` (fixed enum: garbage/waste, streetlight/electricity, water supply, sewage/drainage, road damage, other), `severity` (low/medium/high; high = health or safety risk), `summary` (1-line English), `location_description` (normalized), `confidence` (0-1).
- Model: Qwen via Alibaba Cloud DashScope (satisfies the Alibaba constraint; no paid alternatives).
- If `confidence < 0.6` or category = `other`: route to a human-in-the-loop review state; do **not** auto-send. Show the citizen the classification for one-tap correction ("Not right? Pick the category") before sending. This doubles as demo insurance.

### FR-3: Formal complaint drafting
- Generate a formal complaint letter: reference ID, date, addressed to the routed department, category-appropriate subject line, body summarizing the issue with extracted facts, severity justification, citizen contact block or explicit anonymity statement.
- English for the outbound email; Urdu rendering shown to the citizen in the review screen.
- Citizen review screen: editable draft with "Send" and "Edit" actions. Nothing sends without explicit confirmation.

### FR-4: Routing (pan-Pakistan, pragmatic design)
- Ground truth: a `departments` knowledge base (see data model) seeded with verified entries for seed cities plus national-coverage entities (cantonment boards, WAPDA/LESCO/KE water and power where applicable).
- The LLM performs **selection, not invention**: given city + category, it returns the matching department record(s) from the knowledge base, with a routing rationale string. It may suggest a department for a non-seed city only if the department record is marked `national`; otherwise it returns `needs_operator_review`.
- Flag: "true dynamic AI lookup for every Pakistani city" is not honestly buildable in 5 days. The curated-base + AI-selection design is what the demo actually does. Frame the pitch as: "knowledge base covers major cities today, and scales by data entry, not code."

### FR-5: Email dispatch
- Send via Alibaba Cloud DirectMail or free SMTP through the app backend, from a product-owned address (e.g., `complaints@darkhwast.pk`), reply-to = citizen contact if not anonymous.
- Email includes: formal letter, tracking ID, and a link to the dashboard complaint detail (officials get a magic link; no forced login for the email recipient, login only for the queue view).
- On send: status becomes `sent`, log dispatch timestamp + message ID. On failure: status becomes `send_failed`, retry once, then surface to operator.

### FR-6: Citizen tracking page
- Public URL `/track/{trackingId}`, no login. Shows status timeline (draft, sent, acknowledged, in_progress, resolved), department name, and category. Never shows the citizen's contact info.

### FR-7: Government dashboard
- Login: simple email + password (seeded demo account; no SSO).
- Queue view: table of complaints with filters (city, category, severity, status) and search.
- Detail view: full complaint, citizen contact (if not anonymous), routing rationale, status update control (dropdown + note).
- Overview cards: total complaints, open by category, open by city. No charts library beyond simple bars; time-box it.
- Status changes here are what the tracking page displays.

---

## 7. Data model sketch

```
complaints
  id (pk), tracking_id (unique, public),
  raw_text, language_detected, city, area,
  category, severity, summary, location_description,
  ai_confidence, classification_raw (json),
  draft_english, draft_urdu,
  department_id (fk), routing_rationale,
  status: draft | needs_review | sent | send_failed | acknowledged | in_progress | resolved | rejected,
  is_anonymous, citizen_name, citizen_phone, citizen_email (nullable, cleared if anonymous),
  created_at, sent_at, resolved_at

departments
  id (pk), name, city (or 'national'), jurisdiction_notes,
  categories_covered (array), email, whatsapp (nullable, v2),
  coverage: seed | national, verified (bool), source (url for verification), updated_at

status_events
  id (pk), complaint_id (fk), from_status, to_status,
  actor: citizen | system | official, note, created_at

officials
  id (pk), email (unique), password_hash, name,
  department_id (fk, nullable), role: viewer | operator | admin
```

---

## 8. Edge cases and failure states

| Case | Handling |
|---|---|
| Mixed or unclear complaint ("everything is broken here") | Low confidence: citizen-picked category + review state; never guess-send |
| Complaint about police/crime, not civic | Category `other`: out-of-scope message; do not route (legal exposure; flag: confirm with organizers) |
| City not in knowledge base | `needs_operator_review`; honest "we're expanding" message |
| Department email bounces | `send_failed`, operator alert, fallback secondary contact if present |
| Anonymous complaint needs department follow-up | Letter states "anonymous"; department replies to product address; log only |
| Duplicate or spam submissions | Rate-limit by IP/session (simple, e.g., 3/hour) |
| Citizen edits AI draft into gibberish or abusive text | Basic profanity filter before send; reject with message |
| Urdu-script input with weak model handling | Roman Urdu fallback prompt; test day 1. Real risk: verify Qwen Urdu quality early |
| Official marks resolved but citizen disagrees | Out of MVP scope; tracking page shows status only (flagged in Open Questions) |
| LLM API down mid-demo | Cache a recorded classification result set; keep the flow live with the pre-seeded department base (demo insurance, disclosed if used) |
| Tracking ID enumeration | Random, unguessable IDs; no PII on public page |

---

## 9. Success metrics

**Hackathon-demo metrics (what you measure during and for judging):**
- End-to-end flow completes live: submit to dashboard visible in under 60 seconds.
- Classification accuracy of at least 80% on a 30-case internal test set across Urdu/English/Roman Urdu (prepare this set by day 3).
- Routing accuracy 100% on seed cities (the curated base makes this achievable; that is the design's point).
- At least 1 real department email successfully delivered and (stretch) acknowledged during the hackathon window.

**Product metrics (for the pitch's impact slide; frame as targets, not results):**
- Complaints filed per week; percent completed without citizen correction of category
- Percent routed with confidence >= 0.6 (proxy for knowledge-base coverage)
- Department response rate; median time-to-acknowledge
- Percent anonymous filings (signals trust; also a story point)

---

## 10. Open questions

1. **Is a live email to real government offices legally/organizationally acceptable from a hackathon team?** DarKhwast sends correspondence "on behalf of" citizens, possibly anonymously. Recommend confirming with organizers; demo-mode sending to your own inbox may be required. This is the biggest unflagged risk in the whole plan.
2. **How does the department login get seeded credibly?** Will you demo with a fabricated account, or is there a friendly official? A real (even informal) department partner would win the hackathon.
3. **Who maintains the department knowledge base after the event?** Coverage is the product's whole value; 5 days seeds it, nothing sustains it. Answer belongs in the pitch's sustainability slide.
4. **Anonymous + no-reply departments = dead ends.** Should v2 auto-escalate or re-file? Product decision to make eventually; punt consciously.
5. **Urdu outbound?** MVP sends English formal letters (departments accept English universally). Should v2 send bilingual letters? Low cost, good optics; v2 candidate.
6. **Domain and sender address:** a real domain (e.g., `darkhwast.pk`) and a working sent-from address materially improve the demo's credibility. Decide day 1.

---

## Recommended 5-day build plan

- **Day 1:** Stack setup on Alibaba Cloud, knowledge base schema + seed data, test Qwen on 20 Urdu samples.
- **Day 2:** Intake + classification + drafting.
- **Day 3:** Routing + email dispatch + tracking page.
- **Day 4:** Dashboard.
- **Day 5:** End-to-end hardening, test set, demo rehearsal.

Voice and WhatsApp are slide-ware only.
