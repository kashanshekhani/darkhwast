# DarKhwast — Pitch Deck Full Specification

> **Hackathon:** Bano Qabil × Alibaba Cloud Launch AI Hackathon 2026
> **Format:** 16:9 widescreen (1920×1080px), 14 slides
> **Theme:** "The Digital Darkhwast" — a formal petition, modernized.

---

## DESIGN SYSTEM

### Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| **Primary (Teal)** | `#009688` | Brand, CTAs, accents, active states |
| **Primary Hover** | `#00796B` | Hover states |
| **Primary Tint** | `#E6F4F3` | Light backgrounds, card tints |
| **Primary Tint Strong** | `#CCE9E6` | Borders on tint, subtle emphasis |
| **Background** | `#F8FAFC` | Slide background (light slides) |
| **Surface** | `#FFFFFF` | Cards, panels |
| **Surface Muted** | `#F1F5F9` | Secondary panels, code blocks |
| **Ink (Dark)** | `#0F172A` | Primary text, dark slide backgrounds |
| **Ink Secondary** | `#1E293B` | Dark panel variant |
| **Text Primary** | `#0F172A` | Headings, body text |
| **Text Secondary** | `#64748B` | Subtitles, captions, metadata |
| **Text Tertiary** | `#94A3B8` | Faint labels, dividers |
| **Border** | `#E2E8F0` | Card borders, dividers |
| **Border Strong** | `#CBD5E1` | Emphasized borders |
| **Success** | `#0F766E` | Resolved status, positive metrics |
| **Warning** | `#B45309` | Pending, needs attention |
| **Error** | `#B91C1C` | Failed, rejected |
| **Accent (Violet)** | `#6D28D9` | AI badges, community features |
| **Accent Tint** | `#F3E0FE` | AI feature backgrounds |

### Typography

| Role | Font | Weight | Size (slide) | Size (Figma) |
|------|------|--------|-------------|--------------|
| **Display / Hero** | Inter | 800 (ExtraBold) | 72px | 72px |
| **H1 / Slide Title** | Inter | 700 (Bold) | 48px | 48px |
| **H2 / Section** | Inter | 600 (SemiBold) | 32px | 32px |
| **H3 / Card Title** | Inter | 600 (SemiBold) | 24px | 24px |
| **Body Large** | Inter | 400 (Regular) | 20px / 32px lh | 20px |
| **Body** | Inter | 400 (Regular) | 18px / 28px lh | 18px |
| **Caption** | Inter | 500 (Medium) | 14px / 22px lh | 14px |
| **Micro / Label** | Inter | 600 (SemiBold) | 11px, uppercase, letter-spacing 0.08em | 11px |
| **Mono / Tracking ID** | IBM Plex Mono | 600 (SemiBold) | 16px–24px | 16px |
| **Serif / Quote** | Source Serif 4 | 400 (Regular) | 24px italic | 24px |
| **Urdu / Nastaliq** | Noto Nastaliq Urdu | 400 | 24px–48px | 24px |

**Google Fonts import URL:**
```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Noto+Nastaliq+Urdu:wght@400&display=swap
```

### Spacing & Layout

- **Slide padding:** 80px top/bottom, 96px left/right
- **Card padding:** 32px
- **Card radius:** 20px (`--radius-lg`)
- **Small card radius:** 12px (`--radius-sm`)
- **Pill radius:** 999px
- **Card shadow:** `0 1px 3px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.04)`
- **Primary shadow:** `0 6px 18px rgba(0,150,136,.18)`
- **Grid:** 12-column, 24px gutter
- **Max content width:** 1728px (within 1920 slide)

### Logo

- Use the DarKhwast logo from `/public/assets/Logo.png`
- Place top-left on every slide, 32px height
- On dark slides, add a white circle backdrop (40px diameter, 50% opacity) behind the logo

---

## SLIDE-BY-SLIDE SPECIFICATION

---

### SLIDE 1 — Title / Cover

**Background:** Dark — `#0F172A` (Ink)
**Layout:** Centered, full-bleed

**Elements:**
1. **Logo** — Top-left, 40px height, white version on dark bg
2. **Eyebrow text** — Inter 600, 14px, uppercase, `#009688` (teal), letter-spacing 0.12em
   - Text: "BANO QABIL × ALIBABA CLOUD LAUNCH AI HACKATHON 2026"
3. **Main title** — Inter 800, 80px, white `#FFFFFF`
   - Line 1: "DarKhwast"
   - Line 2 (Inter 400, 32px, `rgba(255,255,255,.72)`): "AI Complaint Router for Local Government"
4. **Urdu title** — Noto Nastaliq Urdu, 48px, `#009688` (teal)
   - Text: "درخواست — ہر شہری کے لیے"
   - Translation: "A petition — for every citizen"
5. **Tagline** — Source Serif 4 italic, 24px, `rgba(255,255,255,.72)`
   - Text: "Describe the problem. We'll take it to the right office."
6. **Bottom bar** — Thin teal line `#009688`, 2px, full width with 96px margin
7. **Team name** — Inter 500, 16px, `rgba(255,255,255,.72)`, bottom-center
   - Text: "Team Darkhwast Ali Baba"

**Image spec:** No photo. Pure typographic cover. The dark background with teal accent is the visual.

---

### SLIDE 2 — The Problem

**Background:** Light — `#F8FAFC`
**Layout:** Left 60% text, right 40% illustration

**Elements:**
1. **Slide number** — Top-right, Inter 600, 11px, `#94A3B8`, "02 / 14"
2. **Section label** — Inter 600, 11px uppercase, `#009688`, "THE PROBLEM"
3. **Headline** — Inter 700, 48px, `#0F172A`
   - "Citizens don't know which department to call."
4. **Sub-headline** — Inter 400, 24px, `#64748B`, line-height 36px
   - "A broken streetlight could be K-Electric, the Cantonment Board, or the Metropolitan Corporation. Most people give up. The ones who don't, write to the wrong office and wait forever."
5. **Three pain-point cards** (stacked, right side):
   - Card 1: Icon (confused person), Title "Wrong department", Text "Complaints land at the wrong office and bounce between departments for weeks."
   - Card 2: Icon (paper stack), Title "Fragmented records", Text "Phone calls, in-person visits, paper forms — no single trackable record."
   - Card 3: Icon (clock), Title "No accountability", Text "Citizens have no proof of submission and no way to follow up."
   - Card style: white bg, 12px radius, 1px border `#E2E8F0`, 24px padding, icon in teal circle `#E6F4F3` bg

**Image spec:** Three small custom icons (40×40px) in teal circles: (1) a person with question mark, (2) scattered papers, (3) a clock with exclamation. Flat line style, 2px stroke, `#009688`.

---

### SLIDE 3 — The Solution (One-liner)

**Background:** Dark — `#0F172A`
**Layout:** Centered

**Elements:**
1. **Slide number** — Top-right, white 60% opacity
2. **Section label** — Inter 600, 11px uppercase, `#009688`, "THE SOLUTION"
3. **Big statement** — Inter 700, 56px, white, centered, max-width 1200px
   - "DarKhwast turns one sentence into a formal, routed, trackable complaint."
4. **Supporting line** — Inter 400, 24px, `rgba(255,255,255,.72)`, centered
   - "No login. No forms. No knowing which department. Just describe the problem in Urdu or English."
5. **Flow diagram** (horizontal, centered, below text):
   - 5 pills connected by teal arrows:
     - Pill 1: "Describe" (icon: microphone)
     - Arrow →
     - Pill 2: "AI Classifies" (icon: brain/sparkle, violet `#6D28D9`)
     - Arrow →
     - Pill 3: "Letter Drafted" (icon: document)
     - Arrow →
     - Pill 4: "Routed" (icon: envelope)
     - Arrow →
     - Pill 5: "Tracked" (icon: checkmark)
   - Pills: `#1E293B` bg, 1px border `#009688`, 12px radius, 16px padding, white text 16px
   - Arrows: `#009688`, 24px

**Image spec:** 5 flat line icons (24×24px) inside the pills. Colors: pills 1,3,4,5 use `#009688`; pill 2 (AI) uses `#6D28D9`.

---

### SLIDE 4 — How It Works (Citizen Flow)

**Background:** Light — `#F8FAFC`
**Layout:** 4-step horizontal flow, full width

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "HOW IT WORKS"
3. **Headline** — Inter 700, 48px, "From a few sentences to a stamped complaint — in under two minutes."
4. **4 step cards** (horizontal, equal width, 24px gap):
   - **Step 1 — "Describe"**
     - Number badge: teal circle, 40px, white "1"
     - Icon: microphone (24px, teal)
     - Title: Inter 600, 20px, "Describe"
     - Text: Inter 400, 16px, `#64748B`, "Tell us about the problem in Urdu, Roman Urdu, or English. Speak or type — your choice."
     - Card: white, 20px radius, 1px border, 32px padding, shadow
   - **Step 2 — "AI Classifies & Routes"**
     - Number badge: violet circle `#6D28D9`, white "2"
     - Icon: sparkle/brain (24px, violet)
     - Title: "AI Classifies & Routes"
     - Text: "Qwen LLM identifies the category, severity, and responsible department from a curated knowledge base of 16 departments across 4 cities."
   - **Step 3 — "Review & Send"**
     - Number badge: teal, white "3"
     - Icon: document with checkmark
     - Title: "Review & Send"
     - Text: "See the AI-generated formal letter, edit it if needed, confirm the category, and send. Anonymous by default."
   - **Step 4 — "Track Publicly"**
     - Number badge: teal, white "4"
     - Icon: tracking/radar
     - Title: "Track Publicly"
     - Text: "Get a tracking ID (DK-2026-XXXXXX). Check status anytime — no login needed. Share it with anyone."

5. **Bottom note** — Inter 400, 14px, `#94A3B8`, centered
   - "High-severity complaints are auto-dispatched. Low/medium go through official approval."

**Image spec:** 4 numbered icons. Steps 1,3,4 in teal; step 2 in violet (AI step). Flat line style.

---

### SLIDE 5 — AI Engine (Technical Deep Dive)

**Background:** Light — `#F8FAFC`
**Layout:** Left 50% diagram, right 50% feature list

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "THE AI ENGINE" (in violet `#6D28D9`)
3. **Headline** — Inter 700, 48px, "Powered by Alibaba Cloud DashScope"
4. **Left side — Architecture diagram:**
   - Box 1 (top): "Citizen Input" — white card, teal border, icon: chat bubble
   - Arrow down
   - Box 2: "Qwen-Plus LLM" — violet bg `#6D28D9`, white text, icon: brain. Subtext: "Classification + Routing + Summary"
   - Arrow down (split into two)
   - Box 3a: "Category + Severity" — white card
   - Box 3b: "Department Match" — white card
   - Arrow down from 3b
   - Box 4: "Formal Letter Generated" — teal bg `#009688`, white text
   - Side branch from Box 2: "Qwen-VL Plus" — violet tint `#F3E0FE` card, "Image Assessment (optional)"
   - Dotted line from Box 2 to "Offline Keyword Fallback" — muted card `#F1F5F9`, "If LLM is unavailable"

5. **Right side — Feature list (4 items):**
   - **Multilingual classification** — "Urdu script, Roman Urdu, English, or mixed — the LLM handles all three."
   - **Confidence-gated routing** — "Above 0.6 confidence → auto-route. Below → citizen confirms category. No hallucinated departments."
   - **Deterministic fallback** — "If the LLM is down, keyword rules classify and route. The system never fails silently."
   - **Vision assessment** — "Qwen-VL analyzes uploaded photos for visible damage and severity corroboration."
   - Each item: Inter 600 title 20px, Inter 400 body 16px `#64748B`, 24px spacing between

**Image spec:** Architecture boxes with icons. Use the specified colors. No photos.

---

### SLIDE 6 — Department Routing Knowledge Base

**Background:** Light — `#F8FAFC`
**Layout:** Full-width table/grid

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "ROUTING KNOWLEDGE BASE"
3. **Headline** — Inter 700, 48px, "16 departments. 4 cities. 6 categories."
4. **Sub-headline** — Inter 400, 20px, `#64748B`, "The AI selects from a curated, verified list — it never invents a department."
5. **City columns** (4 columns, equal width):
   - **Karachi** (column header: Inter 600, 20px, teal)
     - Sindh Solid Waste Management Board → garbage
     - Karachi Water & Sewerage Board → water, sewage
     - Karachi Metropolitan Corp → road, other
     - K-Electric → streetlight
   - **Lahore**
     - Lahore Waste Management Co → garbage
     - WASA Lahore → water, sewage
     - Lahore Development Authority → road, other
     - Metropolitan Corp Lahore → streetlight
   - **Islamabad**
     - Islamabad Waste Management Co → garbage
     - Metropolitan Corp Islamabad → water, sewage, streetlight
     - Capital Development Authority → road, other
   - **Faisalabad**
     - Faisalabad Waste Management Co → garbage
     - WASA Faisalabad → water, sewage
     - Metropolitan Corp Faisalabad → road, streetlight, other
   - Each department: white card, 12px radius, 1px border, 16px padding
     - Department name: Inter 600, 14px, `#0F172A`
     - Categories: Inter 400, 12px, `#64748B`, with small category icons
6. **National coverage note** — Bottom, Inter 400, 14px, `#94A3B8`
   - "+ National: Military Lands & Cantonment, National Highway Authority"

**Image spec:** 6 category mini-icons (16×16px): garbage (trash can), streetlight (lamp), water (droplet), sewage (waves), road (road sign), other (dots). Teal stroke.

---

### SLIDE 7 — Admin Dashboard (Product Showcase)

**Background:** Light — `#F8FAFC`
**Layout:** Full-bleed screenshot with annotations

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "GOVERNMENT PORTAL"
3. **Headline** — Inter 700, 40px, "A real-time dashboard for government officials"
4. **Screenshot** — Large browser mockup (1600×800px) showing the actual dashboard:
   - Show: sidebar with status counts, KPI cards (Resolved, Open, Needs Attention, Avg Ack Time), 7-day bar chart, donut progress, category bars, activity feed, complaint map
   - Browser frame: rounded 16px, 1px border `#E2E8F0`, shadow
5. **3 annotation callouts** (teal lines pointing to screenshot):
   - Callout 1 (top-right): "Live KPIs — resolved rate, open complaints, avg acknowledgment time"
   - Callout 2 (middle-right): "7-day filed vs resolved bar chart + category breakdown"
   - Callout 3 (bottom-right): "GPS-tagged complaint map with status-colored markers"
6. **Feature pills** (bottom row, 4 pills):
   - "Real-time SSE updates" | "CSV export" | "Filterable queue" | "Role-based access"

**Image spec:** Take an actual screenshot of `http://localhost:3000/dashboard.html` after logging in. Crop to the main content area. Place inside a browser chrome mockup.

---

### SLIDE 8 — Citizen Experience (Product Showcase)

**Background:** Light — `#F8FAFC`
**Layout:** 3 phone mockups side by side

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "CITIZEN EXPERIENCE"
3. **Headline** — Inter 700, 40px, "Designed for the citizen who has 10 minutes and no patience for forms."
4. **3 phone mockups** (375×812px iPhone frame, 24px gap):
   - **Phone 1 — "File a Complaint"**
     - Show the intake form with: voice mic button, complaint text area with Urdu text, city dropdown, photo upload area, GPS button
     - Label below phone: Inter 600, 16px, "Step 1: Describe"
     - Caption: Inter 400, 14px, `#64748B`, "Voice or text. Urdu or English. Anonymous by default."
   - **Phone 2 — "Review the Letter"**
     - Show the review page with: AI classification chips, formal letter preview, department card, send button
     - Label: "Step 2: Review"
     - Caption: "AI-generated formal letter. Editable. One tap to send."
   - **Phone 3 — "Track Publicly"**
     - Show the tracking page with: tracking ID in mono font, status stepper (Filed → Sent → Acknowledged → Resolved), department card
     - Label: "Step 3: Track"
     - Caption: "No login. Share the tracking ID with anyone."
   - Phone frame: `#0F172A`, 40px radius, 8px border, shadow

**Image spec:** Take screenshots of `file.html`, `review.html`, and `track.html` (or `sent.html`). Crop to mobile viewport (375px width). Place inside iPhone mockup frames.

---

### SLIDE 9 — Community Platform

**Background:** Light — `#F8FAFC`
**Layout:** Top headline, 2-column feature grid below

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "COMMUNITY PLATFORM"
3. **Headline** — Inter 700, 48px, "One complaint, amplified by the community."
4. **Sub-headline** — Inter 400, 20px, `#64748B`, "Public issues can be supported, discussed, and tracked — turning individual complaints into collective action."
5. **Left column — Screenshot mockup:**
   - Browser frame showing `community.html` with: category filter chips, issue cards grid, support/comment counts
   - 800×500px, rounded 12px, shadow
6. **Right column — 4 feature cards (stacked):**
   - **Public feed** — Icon: grid. "Browse public complaints with category filters, search, and sort by most supported or discussed."
   - **Support (upvote)** — Icon: heart/thumbs-up. "Logged-in citizens can support an issue once. Surface widely-felt problems."
   - **Comments** — Icon: chat. "Discuss issues publicly. Report spam or abuse. Admin moderation queue."
   - **Privacy-first** — Icon: shield. "No PII in the public feed. Anonymous complaints stay anonymous. Only the department sees citizen details."
   - Card style: white, 12px radius, 1px border, 20px padding, icon in teal circle 40px

**Image spec:** Screenshot of `community.html`. 4 flat line icons in teal circles.

---

### SLIDE 10 — Tech Architecture

**Background:** Dark — `#0F172A`
**Layout:** Centered architecture diagram

**Elements:**
1. **Slide number** — Top-right, white 60%
2. **Section label** — `#009688`, "TECH ARCHITECTURE"
3. **Headline** — Inter 700, 48px, white, "Zero-build. Portable. Production-shaped."
4. **Architecture diagram** (layered, top to bottom):
   - **Layer 1 — Frontend** (3 boxes side by side):
     - "Landing Page" | "Citizen Portal" | "Government Portal"
     - Subtext: "Vanilla HTML/CSS/JS — no build step"
     - Box style: `#1E293B` bg, 1px border `#E2E8F0` 20% opacity, white text
   - **Arrow down** (teal, with label "fetch / SSE")
   - **Layer 2 — API** (1 wide box):
     - "Express.js REST API"
     - Subtext: "Auth · Rate limiting · SSE live updates · File uploads"
     - Box style: teal border `#009688`, `#1E293B` bg
   - **Arrow down** (split into 3)
   - **Layer 3 — Services** (3 boxes):
     - "AI Classification" (violet border) — "Qwen-Plus + Qwen-VL (DashScope)"
     - "Email Dispatch" (teal border) — "Nodemailer SMTP"
     - "Escalation Engine" (warning border `#B45309`) — "Auto-escalate after 3 days"
   - **Arrow down**
   - **Layer 4 — Data** (1 wide box):
     - "JSON File DB (atomic writes) + File uploads"
     - Subtext: "Portable to any Node host — Alibaba Cloud ECS ready"
     - Box style: muted `#F1F5F9` 10% opacity bg
5. **Tech badges** (bottom row, pills):
   - "Node.js 18" | "Express 4" | "Qwen LLM" | "Nodemailer" | "Leaflet Maps" | "Google OAuth" | "Web Speech API"

**Image spec:** Architecture boxes. No photos. All diagram elements.

---

### SLIDE 11 — Key Features Summary

**Background:** Light — `#F8FAFC`
**Layout:** 3×3 feature grid

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "KEY FEATURES"
3. **Headline** — Inter 700, 48px, "Everything a citizen needs. Everything an official needs."
4. **9 feature cards** (3 columns × 3 rows, 24px gap):
   - Row 1:
     - **Urdu-First** — Icon: language/globe. "Default language is Urdu. RTL layout. English is the toggle."
     - **Voice Input** — Icon: microphone. "Speak instead of type. Browser SpeechRecognition for low-literacy users."
     - **Photo Evidence + AI** — Icon: camera. "Upload up to 5 photos. Qwen-VL analyzes the first image for visible damage."
   - Row 2:
     - **Smart Routing** — Icon: route/fork. "AI selects from 16 verified departments. Deterministic fallback prevents errors."
     - **Anonymous by Default** — Icon: shield. "No name, no phone, no email required. Citizens choose if they want to be identified."
     - **Formal Letter** — Icon: document. "AI drafts a professional, dated, addressed complaint letter. Citizen can edit before sending."
   - Row 3:
     - **Public Tracking** — Icon: radar. "Tracking ID works without login. Timestamped status trail with official notes."
     - **Community Feed** — Icon: people. "Public issues with support, comments, and moderation. Collective visibility."
     - **Live Dashboard** — Icon: chart. "Real-time KPIs, 7-day trends, GPS map, CSV export. SSE-powered updates."
   - Card style: white, 20px radius, 1px border `#E2E8F0`, 24px padding, shadow
   - Icon: 32px, in teal circle `#E6F4F3` 56px diameter
   - Title: Inter 600, 18px, `#0F172A`
   - Text: Inter 400, 14px, `#64748B`, line-height 22px

**Image spec:** 9 flat line icons (32×32px) in teal circles. 2px stroke. Colors: `#009688` for citizen features, `#6D28D9` for AI features (Smart Routing, Photo Evidence + AI, Formal Letter).

---

### SLIDE 12 — Impact & Metrics

**Background:** Light — `#F8FAFC`
**Layout:** Top headline, 4 large metric cards, bottom quote

**Elements:**
1. **Slide number** — Top-right
2. **Section label** — "IMPACT"
3. **Headline** — Inter 700, 48px, "What DarKhwast delivers"
4. **4 metric cards** (horizontal, equal width, 24px gap):
   - **Card 1** — Big number: Inter 800, 64px, `#009688`, "4"
     - Label: Inter 600, 16px, "Cities served"
     - Sub: Inter 400, 14px, `#64748B`, "Karachi, Lahore, Islamabad, Faisalabad"
   - **Card 2** — Big number: "16"
     - Label: "Departments routed"
     - Sub: "Verified knowledge base — no hallucinated routing"
   - **Card 3** — Big number: "3"
     - Label: "Languages"
     - Sub: "Urdu, Roman Urdu, English — mixed input accepted"
   - **Card 4** — Big number: "< 2 min"
     - Label: "Time to file"
     - Sub: "From description to stamped, routed complaint"
   - Card style: white, 20px radius, 1px border, 32px padding, center-aligned, shadow
5. **Bottom quote** — Source Serif 4 italic, 24px, `#0F172A`, centered, max-width 1000px
   - "In Pakistan, a darkhwast is a typed, stamped, receipted petition. DarKhwast brings that idea online — for every citizen, in their own language."
   - Attribution: Inter 500, 14px, `#64748B`, "— Project Design Principle"

**Image spec:** No photos. Pure typographic + numeric. The big numbers are the visual.

---

### SLIDE 13 — What Makes Us Different

**Background:** Dark — `#0F172A`
**Layout:** Centered comparison

**Elements:**
1. **Slide number** — Top-right, white 60%
2. **Section label** — `#009688`, "WHY DARHWAST"
3. **Headline** — Inter 700, 48px, white, "Not another complaint form. A translation layer."
4. **Comparison table** (2 columns, dark theme):
   - **Left column header:** Inter 600, 20px, `#94A3B8`, "Traditional complaint systems"
   - **Right column header:** Inter 600, 20px, `#009688`, "DarKhwast"
   - Row 1: "Citizen must know the department" | "AI figures out the department"
   - Row 2: "English-only forms" | "Urdu-first, multilingual input"
   - Row 3: "Account required to file" | "No account needed — anonymous by default"
   - Row 4: "No public tracking" | "Public tracking ID — no login, shareable"
   - Row 5: "Static forms with dropdowns" | "Free-text → AI classification + formal letter"
   - Row 6: "No community visibility" | "Public feed with support, comments, moderation"
   - Row 7: "Manual routing by staff" | "AI routing with human-in-the-loop fallback"
   - Row style: alternating `#1E293B` and `#0F172A` backgrounds, 16px padding, 1px bottom border `rgba(255,255,255,.06)`
   - Left text: Inter 400, 16px, `#94A3B8`
   - Right text: Inter 500, 16px, white
   - Right checkmark: `#009688` check icon before each right-column item

**Image spec:** 7 small checkmark icons (16×16px) in teal for the right column. No photos.

---

### SLIDE 14 — Closing / Call to Action

**Background:** Dark — `#0F172A`
**Layout:** Centered, minimal

**Elements:**
1. **Logo** — Top-center, 48px height, white
2. **Big statement** — Inter 700, 56px, white, centered, max-width 1200px
   - "Every citizen deserves a darkhwast that works."
3. **Urdu line** — Noto Nastaliq Urdu, 36px, `#009688`, centered
   - "ہر شہری کا حق ہے — اس کی آواز پہنچے"
   - Translation: "Every citizen has the right — to be heard"
4. **CTA pills** (centered, 16px gap):
   - Pill 1: "Try the demo" — teal bg `#009688`, white text, 999px radius, 16px/32px padding
   - Pill 2: "darkhwast.pk" — `#1E293B` bg, 1px border `#009688`, teal text, 999px radius
5. **Demo credentials** (bottom, Inter 400, 14px, `rgba(255,255,255,.72)`, centered):
   - "Citizen: demo.citizen@darkhwast.pk / darkhwast2026"
   - "Official: demo@darkhwast.pk / darkhwast2026"
6. **Team line** — Inter 500, 16px, `#009688`, centered
   - "Team Darkhwast Ali Baba · Bano Qabil × Alibaba Cloud Launch AI Hackathon 2026"
7. **Bottom teal line** — 2px, `#009688`, full width with 96px margin

**Image spec:** No photos. Pure typographic closing. The teal-on-dark with Urdu calligraphy is the visual.

---

## IMAGE SPECIFICATIONS SUMMARY

### Screenshots to capture (for slides 7, 8, 9)

1. **Dashboard screenshot** (Slide 7):
   - URL: `http://localhost:3000/dashboard.html`
   - Login first: `demo@darkhwast.pk` / `darkhwast2026`
   - Viewport: 1440×900px
   - Capture: full page below the header
   - Place in: browser chrome mockup (1600×800px)

2. **File complaint screenshot** (Slide 8, Phone 1):
   - URL: `http://localhost:3000/file.html`
   - Viewport: 375×812px (mobile)
   - Capture: intake form with some Urdu text typed in

3. **Review screenshot** (Slide 8, Phone 2):
   - URL: `http://localhost:3000/review.html?id=<any-complaint-id>`
   - Viewport: 375×812px
   - Capture: review page with letter visible

4. **Track/sent screenshot** (Slide 8, Phone 3):
   - URL: `http://localhost:3000/track.html?tid=DK-2026-XXXXXX`
   - Viewport: 375×812px
   - Capture: tracking page with status stepper

5. **Community screenshot** (Slide 9):
   - URL: `http://localhost:3000/community.html`
   - Viewport: 1200×750px
   - Capture: feed with category chips and issue cards

### Custom icons needed (all flat line, 2px stroke)

| Icon | Slides | Color | Size |
|------|--------|-------|------|
| Microphone | 3, 4, 11 | `#009688` | 24-32px |
| Brain/Sparkle (AI) | 3, 5, 11 | `#6D28D9` | 24-32px |
| Document | 3, 11 | `#009688` | 24-32px |
| Envelope | 3 | `#009688` | 24px |
| Checkmark | 3, 13 | `#009688` | 16-24px |
| Confused person | 2 | `#009688` | 40px |
| Scattered papers | 2 | `#009688` | 40px |
| Clock with alert | 2 | `#009688` | 40px |
| Language/globe | 11 | `#009688` | 32px |
| Camera | 11 | `#6D28D9` | 32px |
| Route/fork | 11 | `#6D28D9` | 32px |
| Shield | 9, 11 | `#009688` | 32px |
| Radar | 11 | `#009688` | 32px |
| People | 9, 11 | `#009688` | 32px |
| Chart | 11 | `#009688` | 32px |
| Heart/thumbs-up | 9 | `#009688` | 32px |
| Chat bubble | 5, 9 | `#009688` | 24-32px |
| Trash can | 6 | `#009688` | 16px |
| Streetlight | 6 | `#009688` | 16px |
| Water droplet | 6 | `#009688` | 16px |
| Waves (sewage) | 6 | `#009688` | 16px |
| Road sign | 6 | `#009688` | 16px |
| Grid | 9 | `#009688` | 32px |
| Inbox | 4 | `#009688` | 24px |

### No photos needed
This deck is intentionally photo-free (matching the project's design principle: "no stock photos"). All visuals are: typography, screenshots of the actual product, flat line icons, and architecture diagrams.

---

## FIGMA PROMPT

Copy and paste this into Figma's AI tool (or use as a brief for a Figma designer):

---

**FIGMA DESIGN BRIEF — DarKhwast Pitch Deck**

Create a 14-slide pitch deck (16:9, 1920×1080px each) for "DarKhwast" — an AI civic-complaint routing platform for Pakistan. The design language is "digital darkhwast" (a formal petition, modernized): clean, institutional, trustworthy, with teal accents on dark slate.

**GLOBAL STYLES:**

Fonts (Google Fonts):
- Headings/Body: Inter (weights 400, 500, 600, 700, 800)
- Monospace (tracking IDs): IBM Plex Mono (600)
- Quotes: Source Serif 4 (400, italic)
- Urdu: Noto Nastaliq Urdu (400)

Colors:
- Primary: #009688 (teal) — brand, CTAs, accents
- Primary Hover: #00796B
- Primary Tint: #E6F4F3 — light card backgrounds
- Background (light slides): #F8FAFC
- Background (dark slides): #0F172A
- Surface (cards): #FFFFFF
- Surface Muted: #F1F5F9
- Text Primary: #0F172A
- Text Secondary: #64748B
- Text Tertiary: #94A3B8
- Border: #E2E8F0
- AI Accent: #6D28D9 (violet) — used only for AI-related elements
- AI Tint: #F3E0FE
- Success: #0F766E
- Warning: #B45309
- Error: #B91C1C

Layout:
- Slide padding: 80px top/bottom, 96px left/right
- Card radius: 20px (large), 12px (small), 999px (pills)
- Card shadow: 0 1px 3px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.04)
- Card border: 1px solid #E2E8F0
- Grid: 12-column, 24px gutter
- Logo: top-left, 32-40px height, on every slide

Type scale:
- Display: Inter 800, 72-80px
- H1: Inter 700, 48px
- H2: Inter 600, 32px
- H3: Inter 600, 24px
- Body: Inter 400, 18-20px, line-height 28-32px
- Caption: Inter 500, 14px
- Micro label: Inter 600, 11px, uppercase, letter-spacing 0.08em
- Mono: IBM Plex Mono 600, 16-24px
- Urdu: Noto Nastaliq Urdu 400, 24-48px

**SLIDE LIST:**

1. **Cover (dark #0F172A):** Logo top-left. Centered: eyebrow "BANO QABIL × ALIBABA CLOUD LAUNCH AI HACKATHON 2026" in teal 14px uppercase. Title "DarKhwast" Inter 800 80px white. Subtitle "AI Complaint Router for Local Government" Inter 400 32px white 72%. Urdu "درخواست — ہر شہری کے لیے" Noto Nastaliq 48px teal. Tagline "Describe the problem. We'll take it to the right office." Source Serif italic 24px white 72%. Bottom: team name, teal 2px line.

2. **Problem (light):** Headline "Citizens don't know which department to call." Left: text + sub-headline about broken streetlights bouncing between departments. Right: 3 white cards with teal-circle icons (confused person, scattered papers, clock) — "Wrong department", "Fragmented records", "No accountability".

3. **Solution (dark):** Centered big statement "DarKhwast turns one sentence into a formal, routed, trackable complaint." Below: 5 horizontal pills connected by teal arrows: "Describe" → "AI Classifies" (violet) → "Letter Drafted" → "Routed" → "Tracked". Pills are #1E293B bg with teal border.

4. **How It Works (light):** 4 horizontal step cards with numbered badges (1,2,3,4). Step 2 badge is violet (AI step). Steps: Describe (mic icon), AI Classifies & Routes (brain icon, violet), Review & Send (document icon), Track Publicly (radar icon). Each card: white, 20px radius, 32px padding.

5. **AI Engine (light):** Headline "Powered by Alibaba Cloud DashScope" (section label in violet). Left: vertical architecture diagram — Citizen Input → Qwen-Plus LLM (violet box) → Category+Severity / Department Match → Formal Letter (teal box). Side branches: Qwen-VL (violet tint) and Offline Fallback (muted). Right: 4 feature descriptions (multilingual, confidence-gated, deterministic fallback, vision assessment).

6. **Routing Knowledge Base (light):** Headline "16 departments. 4 cities. 6 categories." 4 city columns (Karachi, Lahore, Islamabad, Faisalabad) each with department cards listing name → categories. Small category icons (trash, lamp, droplet, waves, road, dots) in teal.

7. **Admin Dashboard (light):** Headline "A real-time dashboard for government officials." Large browser mockup screenshot of the dashboard (sidebar, KPIs, bar chart, donut, map, activity feed). 3 teal annotation callouts pointing to KPIs, charts, and map. Bottom: 4 feature pills (SSE updates, CSV export, filterable queue, role-based access).

8. **Citizen Experience (light):** Headline "Designed for the citizen who has 10 minutes." 3 iPhone mockups side by side: File Complaint (intake form with Urdu text + mic), Review Letter (formal letter + department card), Track Publicly (status stepper + tracking ID in mono font). Labels below each phone.

9. **Community Platform (light):** Headline "One complaint, amplified by the community." Left: browser screenshot of community feed with category chips and issue cards. Right: 4 feature cards with teal-circle icons — Public feed, Support/upvote, Comments, Privacy-first.

10. **Tech Architecture (dark):** Headline "Zero-build. Portable. Production-shaped." Layered diagram: Frontend (3 boxes: Landing, Citizen Portal, Gov Portal) → Express API (teal border) → Services (3 boxes: AI Classification violet, Email teal, Escalation warning) → Data (JSON DB). Bottom: tech badges pills (Node.js, Express, Qwen, Nodemailer, Leaflet, Google OAuth, Web Speech API).

11. **Key Features (light):** Headline "Everything a citizen needs. Everything an official needs." 3×3 grid of 9 feature cards, each with icon in teal circle: Urdu-First, Voice Input, Photo Evidence+AI (violet icon), Smart Routing (violet), Anonymous by Default, Formal Letter (violet), Public Tracking, Community Feed, Live Dashboard.

12. **Impact (light):** Headline "What DarKhwast delivers." 4 large metric cards: "4 Cities served", "16 Departments routed", "3 Languages", "< 2 min Time to file". Big numbers in Inter 800 64px teal. Bottom: serif italic quote about darkhwast being a typed, stamped petition brought online.

13. **Why DarKhwast (dark):** Headline "Not another complaint form. A translation layer." 2-column comparison table: left "Traditional complaint systems" (muted gray text), right "DarKhwast" (white text with teal checkmarks). 7 rows comparing: department knowledge, language, account requirement, tracking, form type, community, routing.

14. **Closing (dark):** Logo top-center. Big statement "Every citizen deserves a darkhwast that works." Urdu "ہر شہری کا حق ہے — اس کی آواز پہنچے" in teal Nastaliq 36px. CTA pills: "Try the demo" (teal bg) and "darkhwast.pk" (dark bg, teal border). Demo credentials in white 72%. Team line in teal. Bottom teal 2px line.

**DESIGN RULES:**
- No stock photos. No gradients. No flag green. No chat bubbles. No gamification elements.
- Use flat line icons only (2px stroke, rounded caps).
- Dark slides (#0F172A) for: Cover, Solution, Architecture, Why DarKhwast, Closing.
- Light slides (#F8FAFC) for: Problem, How It Works, AI Engine, Routing, Dashboard, Citizen Experience, Community, Features, Impact.
- Alternating dark/light creates rhythm: dark, light, dark, light, light, light, light, light, light, dark, light, light, dark, dark.
- Every slide has the DarKhwast logo top-left (white on dark slides, original on light slides).
- Slide numbers top-right: "01 / 14" format, Inter 600 11px, color matches slide theme (white 60% on dark, #94A3B8 on light).
- Section labels (uppercase, 11px, letter-spacing 0.08em) above each headline: teal on light slides, teal on dark slides.
- Urdu text appears on slides 1, 3 (optional), and 14 — using Noto Nastaliq Urdu font, always in teal #009688.
- Screenshots should be placed inside browser chrome mockups (rounded 12-16px, 1px border, shadow) or phone mockups (iPhone frame, #0F172A, 40px radius).
- All diagrams use boxes with 1px borders, 12-20px radius, and connecting arrows in teal #009688.
- AI-related elements always use violet #6D28D9 to visually distinguish from citizen/government features in teal.

---

## VERIFICATION CHECKLIST

- [ ] 14 slides total, 16:9 (1920×1080)
- [ ] Every slide has logo top-left
- [ ] Every slide has slide number top-right ("XX / 14")
- [ ] Every slide has section label + headline
- [ ] Dark/light alternation: dark(1), light(2), dark(3), light(4), light(5), light(6), light(7), light(8), light(9), dark(10), light(11), light(12), dark(13), dark(14)
- [ ] Urdu text on slides 1, 14 (and optionally 3)
- [ ] AI elements in violet #6D28D9 throughout
- [ ] All other accents in teal #009688
- [ ] Screenshots on slides 7, 8, 9 (from actual running app)
- [ ] Architecture diagram on slide 5 (AI) and slide 10 (tech)
- [ ] Comparison table on slide 13
- [ ] Metric cards on slide 12
- [ ] 3×3 feature grid on slide 11
- [ ] Department grid on slide 6
- [ ] Flow diagrams on slides 3, 4
- [ ] No stock photos, no gradients, no flag green
- [ ] Fonts: Inter (primary), IBM Plex Mono (IDs), Source Serif 4 (quotes), Noto Nastaliq Urdu (Urdu)
- [ ] Demo credentials on slide 14
- [ ] Team name on slides 1 and 14
- [ ] Hackathon name on slide 1
