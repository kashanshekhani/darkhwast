# DarKhwast Design Brief

Companion to `prd.md`. Covers the citizen complaint flow, the public tracking page, and the government dashboard. Written for a 5-day build: every component here must be buildable with plain HTML/CSS and one frontend framework, no design tooling required.

Design context in one paragraph: DarKhwast serves two audiences with opposite needs. Citizens are Urdu-dominant, mobile-first Android users with low tolerance for forms and low trust that complaining achieves anything. Officials are desktop users who want density and speed. The citizen side borrows from government service design (one question at a time, plain language, formal artifacts); the dashboard side borrows from operations tooling (tables, filters, status controls). The unifying visual idea is the **case file**: in Pakistan, a "darkhwast" is a written petition, typed on paper, stamped, and receipted. The product's moment of value is the stamped receipt with a tracking number. The UI is built around that artifact.

---

## 1. Design principles

**Rule 1: One screen, one decision.**
The citizen never faces a dashboard, a multi-field form, or a choice about jurisdiction. Each screen asks exactly one thing: describe the problem, confirm the classification, approve the letter, take your receipt. The AI does the work; the citizen only confirms. This is the GOV.UK "one thing per page" pattern, chosen because our persona (Farhan) has 10 minutes and no patience for forms, and because confirmation steps double as demo moments where judges see the AI think.

**Rule 2: Urdu is the primary experience, not a translation toggle.**
Default UI language is Urdu with RTL layout; English is the toggle. Input accepts Urdu, Roman Urdu, and English identically, with zero UI commentary about it. Nastaliq script is treated as a first-class typeface with its own size and line-height rules, not a font swap. This is deliberate: products that treat Urdu as an afterthought signal to users that they are an afterthought.

**Rule 3: The record is the product.**
Every screen reinforces proof of action: what was sent, to whom, when, and what happens next. The success screen is a screenshot-able receipt; the tracking page shows a timestamped trail; even the review screen shows the actual letter artifact. DarKhwast cannot force a department to respond, so the durable value it delivers is the accountability record. The UI treats that record as the hero, not a footer detail.

---

## 2. Visual direction

**Mood:** calm institutional authority with the warmth of paper. Think of the quiet dignity of a properly filed, properly stamped petition, not the anxiety of a hotline hold queue. The emotional job of the interface is to make a skeptical citizen believe "this will actually reach someone."

**The central metaphor: the case file.**
- Cream paper backgrounds instead of stark white portals.
- The drafted complaint renders as a document card: serif type, formal salutation, a "DarKhwast" seal mark in the header.
- The success screen is a receipt: dashed-border box, mono tracking ID, stamp-style "SENT" mark.
- Status milestones on the tracking page render as stamped marks rather than generic dots.

**References:**
- **GOV.UK design system:** one-question pages, plain language, error summary pattern, focused institutional typography. The best civic-complaint UX ever shipped; we steal its structure.
- **Stripe receipts:** the artifact you can screenshot and keep. Our tracking ID box is modeled on this.
- **WhatsApp's composer simplicity:** the intake textarea should feel as low-effort as typing a message to a friend. Familiarity lowers the barrier for the voice-first user (and sets up v2 voice input in the same slot).
- **Physical Pakistani officialdom:** khaki file covers, rubber-stamp green ink, petition letterheads. Abstracted, never literal (no scanned paper textures, no skeuomorphic stamps that look clip-art).

**What to avoid, and why:**
- **Flag clichés:** flag green with crescent-and-star motifs reads as campaign signage, not service design, and green is politically color-coded in Pakistan. Our green is stamp ink, not flag green.
- **Stock photos:** handshakes, children in parks, Parliament at dusk. Instantly signals government ad, kills trust.
- **Chat-app bubble aesthetic:** bubbles promise a live conversation with a responsive counterpart. The department will not reply in real time; the UI must not imply it will.
- **Gradients, glassmorphism, confetti, gamification badges:** delight is wrong register for a sewage complaint. Confidence is the emotion we design for.
- **Dark mode in v1:** officials work in offices, citizens on phones in daylight; free-tier time is better spent on RTL correctness than a second palette.
- **Bureaucratic jargon in UI:** no "lodge a grievance", "escalate ticket", "stakeholder". The formal register exists only inside the outbound letter.

---

## 3. Design tokens

All values as CSS custom properties, ready to paste. Single light theme.

### Color

| Token | Hex | Usage | Contrast notes |
|---|---|---|---|
| `--color-ink` | `#1B2B44` | Headings, body text, table text, timeline | 12.9:1 on Paper, 13.6:1 on White |
| `--color-ink-muted` | `#4A5A6A` | Secondary text, helper copy, timestamps | 6.6:1 on Paper |
| `--color-paper` | `#FAF7F1` | App background (citizen flow) | base |
| `--color-surface` | `#FFFFFF` | Cards, letter document, inputs, dashboard canvas | base |
| `--color-stamp` | `#0E6B5C` | Primary buttons, links, focus ring, "sent" states, current step | 6.0:1 on Paper as text; 6.4:1 for white text on it |
| `--color-stamp-hover` | `#0A564A` | Primary button hover/active | darkens, stays >= 7:1 for white text |
| `--color-stamp-tint` | `#E4EFEA` | Selected chips, "resolved" status fill, timeline current ring | decorative fill, ink text on top |
| `--color-severity-low` | `#4A5A6A` | Low severity badge (slate) | text-safe |
| `--color-severity-med` | `#92400E` | Medium severity text/icon | 6.6:1 on Paper |
| `--color-severity-high` | `#B3261E` | High severity, errors, destructive | 6.1:1 on Paper |
| `--color-severity-high-tint` | `#FBEAE7` | High severity badge fill | ink text on top |
| `--color-border` | `#E3DCCE` | Card and divider borders (warm) | decorative |
| `--color-border-strong` | `#665F52` | Input borders | ~4.8:1 on Paper, passes 3:1 UI requirement |

Why this palette: navy ink is correspondence and institutional authority without party affiliation; stamp green evokes approving ink on documents, is distinct from flag green (#01411C) and from every major party's brand; warm paper background separates citizen screens from the cold-portal feel of every Pakistani government website while keeping near-white luminance for contrast safety. Severity is a warm ramp (slate to amber to red) and is always paired with an icon and label, never color alone.

### Typography

| Token | Value | Usage |
|---|---|---|
| `--font-ui` | `Public Sans` 400/500/600/700 | All Latin UI text |
| `--font-urdu` | `Noto Naskh Arabic` 400/500/700 | All Urdu UI text |
| `--font-letter` | `Source Serif 4` 400/600 | The drafted complaint letter only |
| `--font-mono` | `IBM Plex Mono` 500 | Tracking IDs, dispatch metadata |

Why each font:
- **Public Sans:** designed for US government digital services, optimized for small-size legibility, open source, and deliberately not Inter/Roboto. Institutional neutrality without anonymity.
- **Noto Naskh Arabic:** the Urdu face. Originally specified as Noto Nastaliq Urdu for authenticity; changed after first usability feedback because Nastaliq's cascade forces oversized type (18px+) and double line-height, which reads heavy in UI chrome and consumes vertical space. Naskh is the script of Urdu books and news, compact at standard UI sizes, and still unambiguously proper Urdu with full Urdu glyph support.
- **Source Serif 4:** the outbound letter must look like official correspondence. A serif face carries the register of a typed petition; the citizen sees the artifact as formal and therefore credible.
- **IBM Plex Mono:** tracking IDs must be unambiguous to read, type, and photograph (0/O, 1/I). Mono plus letter-spacing does that.

Urdu type rules (non-negotiable): same size scale as Latin (no artificial bump), line-height 1.9, no italics, no justified text, `text-align: start` only. Latin never sets Urdu text and vice versa; `[lang="ur"]` carries the font switch.

### Type scale

| Token | Size/line-height | Usage |
|---|---|---|
| `--text-display` | 32/40 | Landing hero only |
| `--text-h1` | 24/32 | Screen questions and page titles |
| `--text-h2` | 20/28 | Card titles, dashboard section heads |
| `--text-body` | 16/26 (Urdu: 16/30) | Body copy |
| `--text-sm` | 14/22 | Dashboard tables, meta rows |
| `--text-label` | 13/16 | Field labels, badges |
| `--text-mono-id` | 14/20, tracking 0.08em | Tracking IDs |

### Spacing, radius, shadow, elevation

| Token | Value |
|---|---|
| `--space-1` ... `--space-8` | 4, 8, 12, 16, 24, 32, 48, 64 px |
| `--radius-sm` | 6px (buttons, inputs) |
| `--radius-lg` | 12px (cards, letter document) |
| `--radius-full` | 999px (chips, badges) |
| `--shadow-card` | `0 1px 2px rgba(27,43,68,.06), 0 1px 3px rgba(27,43,68,.08)` |
| `--shadow-modal` | `0 8px 24px rgba(27,43,68,.18)` |
| `--control-height` | 48px (all interactive targets) |

Radius stays small and near-square: fully-rounded corners read consumer-playful; 6px reads institutional. One card shadow and one modal shadow, nothing else: cheap to render on low-end Android WebViews.

---

## 4. Screen inventory

Nine screens total. The citizen journey is deliberately four screens from problem to receipt; that count is a pitch line ("four steps from complaint to filed").

**Citizen (public, no login):**
1. **Landing:** explain the service in 5 seconds, route to "file" or "track". Urdu default with English toggle.
2. **Intake:** describe the problem in free text, city, area. The only "form" the citizen ever sees.
3. **Review and send:** confirm classification, read and edit the actual letter, choose anonymous or identified, send.
4. **Sent (receipt):** the payoff. Tracking ID, destination department, next steps. Screenshot artifact.
5. **Tracking page** (`/track/{id}`): public status timeline, no login, no PII.

**Official (dashboard):**
6. **Login:** email + password.
7. **Queue:** filterable table of complaints, stat cards, "needs review" preset filter.
8. **Complaint detail:** letter, extracted facts, contact or anonymity, status control, dispatch log, history.

**Shared:**
9. **Support / city-not-available state:** honest dead-end page for unsupported cities and invalid tracking IDs, with what to do instead.

---

## 5. User flows

### Flow A: File a complaint (happy path)
1. Citizen opens site (usually a shared WhatsApp link) on Android.
2. Landing: taps "شکایت درج کریں / File a complaint".
3. Intake: types problem in Roman Urdu, selects city from searchable dropdown, types area. Tap "Draft my complaint".
4. Staged loading (3-10s): status line cycles "Reading your complaint" then "Finding the responsible office".
5. Review: classification strip shows category, severity, summary. Letter document card shows the formal English draft with Urdu summary above it. Anonymous toggle is ON by default.
6. Citizen taps "Send my complaint". Confirm modal: destination department name + email.
7. Sent: receipt with tracking ID, copy button, "Sent to X at HH:MM". Citizen screenshots.
8. Optional: taps "Track it later" link, or files another.

### Flow B: Low-confidence correction
Same as A through step 4. At step 5 the classification strip shows "We're not sure" state with all six category chips exposed. Citizen taps the right chip (e.g., Sewage). Classification re-renders, letter re-drafts in about 3 seconds with the sewage department route. Continue at step 6. Nothing auto-sends on low confidence; the correction tap is the human-in-the-loop from FR-2.

### Flow C: Identity branch (during Flow A step 5)
Citizen toggles anonymity OFF. Name field appears (required), phone or email appears (one required). The letter's contact block updates live and the reply-to is set. Toggling back ON clears the fields client-side. Default ON because anonymity is a trust feature and a pitch point.

### Flow D: Track a complaint
1. Citizen opens `/track/{id}` from their screenshot, or enters the ID on Landing.
2. Page shows status stepper (Draft, Sent, Acknowledged, In Progress, Resolved), each with timestamp and actor note; department card; complaint summary; "last updated" line.
3. No actions available. This page is read-only by design.

### Flow E: Official handles a complaint
1. Official logs in (seeded credentials).
2. Queue loads with stat cards (total, open by category, open by city) and the table sorted newest-first.
3. Official filters: city = Faisalabad, category = Sewage, status = Sent.
4. Opens a row. Detail shows letter, facts, contact (or anonymous marker), routing rationale.
5. Sets status to "In Progress" with a note, taps Update.
6. The citizen's tracking page now shows the new step with timestamp. (This hand-off is the demo's closing beat.)

### Flow F: Send failure
At Flow A step 6 the email dispatch fails. The Sent screen renders in its failure variant: high-severity banner "We could not deliver your email yet. Your complaint is saved. We will retry automatically.", same tracking ID, destination shown with "delivery pending". The complaint appears in the dashboard queue under `send_failed`; an operator (admin role) sees it in the "Needs review" filter, fixes or re-sends, and the tracking page recovers without the citizen doing anything.

---

## 6. Per-screen layout

Mobile-first descriptions; desktop deltas in section 9.

### S1 Landing
- **Sections:** top bar (wordmark "DarKhwast" + language toggle); hero (Urdu headline "مسکل بتائیں، درخواست پہنچیں گے" with English line "Tell us the problem. We'll take it to the right office."); trust row (three chips: No login, Anonymous by default, Free); explainer strip (three steps with category-style icons: Describe, We draft and route, You get a receipt); footer (disclaimer: DarKhwast sends and tracks, departments respond on their own).
- **Hierarchy:** headline, then primary CTA.
- **Primary action:** "File a complaint" (stamp green, full-width on mobile). **Secondary:** "Track a complaint" opens inline ID input.
- **Components:** Button, TrustChip, StepCard, LanguageToggle, Input (inline).

### S2 Intake
- **Sections:** progress label "Step 1 of 2"; question heading "What's the problem?"; textarea (autosizing to ~6 lines, helper text "Urdu, English, or Roman Urdu, however is easy"); city searchable select; area input; character counter; sticky bottom bar with primary button.
- **Hierarchy:** the textarea dominates; city and area are visually secondary (single column, 16px gaps).
- **Primary action:** "Draft my complaint" (disabled until 20 chars + city chosen; disabled state explains itself in helper text).
- **Components:** TextArea, Select (searchable), Input, Button, FieldError, CharacterCounter.

### S3 Review and send
- **Sections:** progress label "Step 2 of 2"; classification strip (category icon + name + severity badge + one-line summary, "Not right? Change it" affordance exposing category chips); Urdu summary block; letter document card (paper white, serif, seal mark, salutation to routed department); identity block (anonymous switch ON, expanding contact fields when OFF); send bar (primary + "Edit letter" secondary that swaps the document card into an editable textarea).
- **Hierarchy:** the letter document is the visual hero of the screen. The citizen should feel they are approving an official artifact.
- **Primary action:** "Send my complaint" (sticky bottom on mobile) opening a confirm modal showing destination department + email.
- **Components:** ClassificationStrip, CategoryChip, SeverityBadge, LetterCard, IdentityBlock, Switch, Button, Modal, FieldError.

### S4 Sent (receipt)
- **Sections:** stamp-style "SENT" mark; heading "Your complaint has been filed"; tracking ID in dashed-border mono box with copy button; destination card (department name, email, sent timestamp); "what happens next" mini-timeline (3 items); actions row.
- **Hierarchy:** the tracking ID box is the largest element on the page. It exists to be screenshotted.
- **Primary action:** "View tracking page". **Secondary:** "File another complaint".
- **Components:** TrackingIdBox, DepartmentCard, MiniTimeline, Button, Toast (copy confirmation).

### S5 Tracking page
- **Sections:** heading with tracking ID; status stepper (vertical, stamped marks, timestamps, actor notes); department card; complaint summary card; "last updated" footer; no PII anywhere.
- **Hierarchy:** current step is enlarged with a stamp-tint ring; completed steps are ink; future steps are muted outlines.
- **Primary action:** none, deliberately. Read-only page. (Refresh happens on load; polling is a v2 nicety.)
- **Components:** StatusStepper, DepartmentCard, SummaryCard.

### S6 Login
- **Sections:** wordmark; email + password; sign-in button; seeded-credentials hint (demo only, removed for real deployment).
- **Primary action:** "Sign in". **Components:** Input, Button, FieldError, ErrorBanner.

### S7 Queue (dashboard home)
- **Sections:** header bar (wordmark, official name, role, logout); stat card row (Total, Open by category top-3, Open by city top-3, Needs attention count); filter bar (search, city, category, severity, status, "Needs review" preset chip); table (columns: ID, Category, Area/City, Severity, Status, Age); pagination ("load more").
- **Hierarchy:** stat cards answer Sana's "how many from where" question above the fold; the table is the working surface.
- **Primary action:** row click opens detail. Rows are keyboard-focusable.
- **Components:** StatCard, FilterBar, DataTable, StatusChip, SeverityBadge, EmptyState.

### S8 Complaint detail
- **Sections:** header (tracking ID + status chip + back to queue); two-column body on desktop: left is the LetterCard (identical component to the citizen screen, reinforcing the shared artifact) plus status history; right rail is facts (category, severity, AI confidence, city/area, routing rationale, dispatch log with message ID) and contact block (or "Filed anonymously" marker); status control (select + note + Update button) pinned in the right rail.
- **Hierarchy:** the letter first, controls adjacent, metadata in the rail.
- **Primary action:** "Update status".
- **Components:** LetterCard, StatusChip, FactList, DispatchLog, ContactBlock, StatusControl, Button.

### S9 Support / dead-end states
- **Sections:** plain-language heading ("We don't support {city} yet"), what we do cover, how to request the city (v2: notify me), and for invalid tracking IDs, help recovering (check the ID, it starts with DK-2026).
- **Primary action:** back to landing.
- **Components:** EmptyState, Button.

---

## 7. Component library

Fifteen components. Sized so one developer can build all of them in a day and a half.

| Component | Variants | States | Notes |
|---|---|---|
| **Button** | primary (stamp fill), secondary (outline ink), ghost (text), destructive (high fill) | default, hover, active, focus-visible, disabled, loading (spinner + label) | 48px height, radius-sm, label never truncates; Urdu and English labels both specified in code |
| **Input** | text, phone, email | default, focus, error (border + message + `aria-invalid`), disabled, readonly | Label above, helper below, 48px, RTL-aware via logical properties |
| **TextArea** | intake (autosizing), letter-edit (fixed, mono-spaced caret grid optional) | same as Input + character counter | The intake variant is the most important element in the product; it must feel like a messaging composer |
| **Select (searchable)** | city picker | default, open, focus, error, empty-results | Search matches English and Urdu city names; keyboard navigable |
| **Switch** | anonymous toggle | on, off, focus, disabled | Real checkbox underneath, not a div; label + description text always visible |
| **CategoryChip** | garbage, streetlight, water, sewage, road, other | unselected, selected, hover, focus | Each with its outline icon; used in correction flow and as filter chips on the dashboard |
| **SeverityBadge** | low, medium, high | static | Color + icon + word (never color alone); pill radius |
| **StatusChip** | draft, needs_review, sent, send_failed, acknowledged, in_progress, resolved, rejected | static | Used identically on dashboard and tracking page vocabulary |
| **LetterCard** | citizen (with Urdu summary), official (with dispatch log) | loading (skeleton lines), loaded | The shared artifact; serif type, seal mark, paper surface |
| **TrackingIdBox** | receipt variant, inline variant | default, copied | Mono, dashed border, copy button announces via live region |
| **StatusStepper** | vertical timeline | per-step: done, current, future | `ol` markup, `aria-current="step"` |
| **Modal** | confirm-send, generic | open, closing, focus-trapped | Esc closes, focus returns to trigger |
| **Toast** | success, error | auto-dismiss 4s | `role="status"` / `role="alert"` |
| **EmptyState** | queue-empty, invalid-id, unsupported-city | static | Icon + one sentence + one action; no illustrations that need a designer |
| **DataTable** | queue | loading (skeleton rows), empty, loaded, error | Semantic `table`, sticky header on desktop, becomes stacked cards under 768px |

Category icon set (outline, 24px grid, drawn once): trash bag, bulb with rays, droplet with slash, pipe with waves, pothole cross-section, question circle. Pictographs matter for low-literacy recognition; do not substitute text-only chips.

---

## 8. States

### Intake (S2)
- **Loading:** n/a (local only); button shows pressed state.
- **Error:** validation errors inline per field plus an error summary box at top (GOV.UK pattern) with anchor links; server unreachable shows a banner with Retry and "your text is kept on this page".
- **Empty:** submit disabled with counter showing "20 characters minimum".
- **Offline:** banner "You're offline. Keep writing; we'll send when you're back." Draft persists to `localStorage` on every keystroke; on reconnect a "Send now" affordance appears. Nothing is ever silently lost.

### Review (S3)
- **Loading (classification):** full-screen staged progress with live-region announcements cycling the two status lines. Never a bare spinner: LLM latency is 3-15 seconds and perceived progress prevents abandonment mid-flow, our most costly drop-off.
- **Error (LLM down):** banner "We couldn't process this right now" + Retry + "Save to this device" fallback; operator demo mode uses the cached result set (disclosed per PRD).
- **Low confidence:** the "not sure" classification strip with chips exposed; send blocked until a category is picked.
- **Offline:** blocked at send with the offline banner; letter stays editable.

### Sent (S4)
- **Success:** default receipt.
- **Failure:** receipt variant with high-severity delivery banner, "delivery pending" on the destination card, same tracking ID (Flow F).
- **Offline at send moment:** page shows the queued state: "Saved. Will send automatically when you're back online." Auto-dispatches on reconnect.

### Tracking (S5)
- **Loading:** skeleton stepper.
- **Empty/invalid ID:** EmptyState with ID format help.
- **Error:** banner with Retry.
- **Success:** any status is content, not an error; "rejected" status renders with a neutral explanation that the department declined, with no blame language.

### Login (S6)
- **Error:** single banner, no field-level hints about which credential failed (no account enumeration).
- **Loading:** button spinner.

### Queue (S7)
- **Loading:** six skeleton rows + stat card placeholders.
- **Empty:** "No complaints match these filters" + Clear filters action; differs from "no complaints at all", which shows the onboarding line "Complaints filed by citizens will appear here".
- **Error:** banner + Retry; table keeps last-loaded data visible.
- **Offline:** muted banner "Connection lost, showing last loaded complaints".

### Detail (S8)
- **Loading:** letter skeleton + rail skeleton.
- **Error on status update:** inline form error, status unchanged until confirmed.
- **Success:** StatusChip animates (respects reduced-motion), history list prepends the event.

---

## 9. Responsive behaviour

Breakpoints: `360px` floor, `768px` tablet, `1024px` desktop.

**Citizen flow (S1-S5):** single column at every width, content max-width `560px` centered. Rationale: forms wider than ~600px read as enterprise SaaS and slow scanning; GOV.UK converges on this width for the same reason. On desktop the landing page alone goes two-column (hero left, a static letter-artifact mockup right) to use the space for credibility rather than density. Everything else stays centered single-column even at 1440px; restraint is the choice.

**Tracking page:** single column, max-width `640px`, timeline grows vertically.

**Dashboard (S6-S8):** desktop-first, since officials sit at desks. Under 768px the table collapses into stacked cards (one card per complaint: ID + category icon, area/city, severity, status chip, tap to open); filters collapse behind a "Filters" button with an active-count badge. Detail page's two columns stack: letter, then facts, then status control.

**Touch and pointer:** all targets 48px at every breakpoint; hover styles are enhancement only, never the sole signal (matches the accessibility rules below).

---

## 10. Accessibility

**Contrast:** every text pair in the token table meets or exceeds 4.5:1 (ink 12.9, muted 6.6, stamp 6.0, severity-med 6.6, severity-high 6.1, all measured on Paper/Surface); UI borders meet 3:1. Re-verify with an automated audit (axe) at build time; the palette was chosen so nothing sits near the threshold.

**Focus:**
- Visible focus ring everywhere: 3px stamp green with 2px white offset gap, never removed, `:focus-visible` styled.
- Logical top-to-bottom focus order matching visual order; modal traps focus and returns it to the trigger on close.
- Skip-to-content link on every page.

**Keyboard:**
- The entire citizen flow is keyboard-complete: tab through fields, chips, toggle, send; Enter submits; Esc closes the modal and cancels send.
- Dashboard: table rows are focusable (`tabindex="0"`) with Enter to open detail; filter controls are native elements; status select and Update reachable in two tabs from detail header.

**ARIA and semantics:**
- Staged classification messages in an `aria-live="polite"` region; send success in `role="status"`; errors in `role="alert"`.
- Field errors: `aria-invalid` + `aria-describedby` linking to message text; error summary box links to fields.
- Stepper: ordered list with `aria-current="step"`; copy button announces "Tracking ID copied".
- Switch is a real checkbox with label; decorative icons `aria-hidden`; letter card carries an accessible summary label.
- Language toggle sets `lang="ur" dir="rtl"` (or `lang="en" dir="ltr"`) on the document root; all layout uses logical CSS properties (`margin-inline-start`, `text-align: start`) so RTL mirroring is free, not a retrofit.

**Language and script rules:** no italics or uppercase transforms for Urdu; standard type scale with line-height 1.9; mixed Urdu/Latin strings wrap per-script ( browsers handle this if fonts are correctly mapped per `lang` span).

**Other:**
- `prefers-reduced-motion`: skeletons and status animations render statically; content changes remain.
- Severity never encoded by color alone (icon + word always).
- Touch targets 48px minimum; no gesture-only interactions.
- Page titles per screen ("Track complaint DK-2026-4F7Q2K" or its Urdu equivalent) for screen-reader tab navigation.
