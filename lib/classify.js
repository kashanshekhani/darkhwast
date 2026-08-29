// Classification + routing (FR-2, FR-4).
//
// Primary path: Qwen via Alibaba Cloud DashScope (OpenAI-compatible endpoint).
// Fallback path: offline keyword rules for Urdu / Roman Urdu / English so the
// product works with zero API keys (demo insurance per PRD section 8).
//
// Routing is SELECTION, not invention: the LLM may only pick a department from
// the curated knowledge base passed to it; anything invalid falls back to the
// deterministic resolver.

import { CITIES } from './seed.js';

export const CATEGORIES = ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other'];
export const SEVERITIES = ['low', 'medium', 'high'];
export const CONFIDENCE_THRESHOLD = 0.6;

export const CATEGORY_PHRASE = {
  garbage: 'Uncollected garbage and waste',
  streetlight: 'Broken streetlight / public lighting failure',
  water: 'Water supply shortage',
  sewage: 'Sewage and drainage problem',
  road: 'Road damage',
  other: 'Civic issue',
};

const KEYWORDS = {
  garbage: ['garbage', 'trash', 'waste', 'rubbish', 'kachra', 'kachraa', 'safai', 'کچرا', 'صفائی', 'خاکروب', 'بدبودار'],
  streetlight: ['streetlight', 'street light', 'street-light', 'streetlights', 'lamp', 'bulb', 'light out', 'light band', 'batti', 'andhera', 'roshni', 'اندھیرا', 'بتی', 'اسٹریٹ لائٹ', 'سٹریٹ لائٹ', 'روشنی'],
  water: ['water', 'paani', 'pani', 'water supply', 'nul', 'نل', 'پانی', 'ٹینکر', 'پانی کی فراہمی'],
  sewage: ['sewage', 'sewer', 'sewerage', 'drainage', 'blocked drain', 'nali', 'naliyan', 'گندا پانی', 'نالی', 'سویج', 'آلودگی'],
  road: ['road', 'pothole', 'potholes', 'gaddha', 'broken road', 'road damage', 'paved', 'سڑک', 'روڈ', 'گڑھا', 'سڑک ٹوٹی'],
};

function countHits(lower) {
  const hits = {};
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    hits[cat] = words.reduce((n, w) => (lower.includes(w.toLowerCase()) ? n + 1 : n), 0);
  }
  return hits;
}

function ruleSeverity(category, text) {
  const t = text.toLowerCase();
  const danger = ['accident', 'حادثہ', 'بیماری', 'dengue', 'ڈینگی', 'بچوں', 'children', ' بیمار', 'sick', 'injury'];
  const isDanger = danger.some((w) => t.includes(w.toLowerCase()));
  if (isDanger) return 'high';
  switch (category) {
    case 'sewage': return 'high';
    case 'water': return /no water|نہیں|shortage|قلت|بند/.test(t) ? 'high' : 'medium';
    case 'garbage': return 'medium';
    case 'road': return 'medium';
    case 'streetlight': return /اندھیرا|andhera|dark|accident|حادثہ/.test(t) ? 'medium' : 'low';
    default: return 'low';
  }
}

export function fallbackClassify(rawText, city, area) {
  const lower = String(rawText).toLowerCase();
  const hits = countHits(lower);
  let best = 'other';
  let bestHits = 0;
  for (const [cat, n] of Object.entries(hits)) {
    if (n > bestHits) { best = cat; bestHits = n; }
  }
  const cityEn = CITIES[city]?.en || city;
  const cityUr = CITIES[city]?.ur || city;
  const place = area ? `${area}, ` : '';
  const category = bestHits > 0 ? best : 'other';
  const confidence = bestHits > 0 ? Math.min(0.9, 0.65 + 0.1 * bestHits) : 0.35;

  // Build a meaningful summary using the first ~100 chars of the complaint
  const excerpt = String(rawText).trim().replace(/\s+/g, ' ');
  const shortExcerpt = excerpt.length > 100 ? excerpt.slice(0, 100).replace(/\s+\S*$/, '…') : excerpt;
  const summary_en = `Complaint regarding ${CATEGORY_PHRASE[category].toLowerCase()} in ${place}${cityEn}: "${shortExcerpt}"`;
  const summary_ur = `${place}${cityUr} میں ${category === 'other' ? 'ایک شہری مسئلے' : CATEGORY_PHRASE_UR[category]} کے بارے میں شکایت: "${shortExcerpt}"`;

  return {
    category,
    severity: ruleSeverity(category, rawText),
    confidence,
    summary_en,
    summary_ur,
    location_description: `${area ? area + ', ' : ''}${cityEn}`,
    source: 'rules',
    raw: { engine: 'keyword-rules', hits },
  };
}

export const CATEGORY_PHRASE_UR = {
  garbage: 'کچرا صفائی',
  streetlight: 'اسٹریٹ لائٹ',
  water: 'پانی کی فراہمی',
  sewage: 'گندے پانی اور نکاسی',
  road: 'سڑک کی خرابی',
  other: 'شہری مسئلہ',
};

// Deterministic ground-truth resolver: city department first, then national.
export function resolveDepartment(departments, cityId, category) {
  const city = departments.filter((d) => d.city === cityId && d.categories_covered.includes(category));
  if (city.length) return city[0];
  const natl = departments.filter((d) => d.coverage === 'national' && d.categories_covered.includes(category));
  return natl[0] || null;
}

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

const SYSTEM_PROMPT = `You are the classification and routing engine of DarKhwast, a civic complaint service for Pakistani local government.
Given a citizen's complaint (written in Urdu, Roman Urdu, English or a mix), a city and an area, plus a list of candidate government departments from a verified knowledge base, return STRICT JSON only, no markdown fences:
{
  "category": one of ["garbage","streetlight","water","sewage","road","other"],
  "severity": one of ["low","medium","high"] (high only for real public health or safety risk),
  "confidence": number 0-1 (your certainty about category),
  "summary_en": max 40 words, factual summary in English that MUST describe the citizen's specific complaint — not just the category or location. Include the key detail the citizen reported (e.g. 'streetlight not working for three nights', 'garbage not collected for a week'). Do NOT write 'Reported civic issue' or similar generic phrases.,
  "summary_ur": same specific factual summary in Urdu,
  "location_description": normalized location as "Area, City",
  "department_id": pick ONLY from the provided department ids, the one responsible for this category in this city; null if none fits,
  "routing_rationale": one short sentence explaining the choice
}
Rules:
- NEVER invent facts not present in the complaint (e.g. duration, number of people affected, exact street).
- summary_en and summary_ur MUST reflect what the citizen actually said, not a generic description.
- severity=high only for real public health or safety risk explicitly mentioned.
- If the complaint is not a civic issue (crime, politics, billing dispute), use category "other" with low confidence.`;

export async function llmClassify({ rawText, city, area, candidates }) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('DASHSCOPE_API_KEY not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'qwen-plus',
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              complaint: rawText,
              city: CITIES[city]?.en || city,
              area: area || null,
              departments: candidates.map((d) => ({ id: d.id, name: d.name, city: d.city === 'national' ? 'national' : CITIES[d.city]?.en, handles: d.categories_covered })),
            }),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`DashScope HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(content);
    if (!CATEGORIES.includes(parsed.category)) throw new Error('invalid category from model');
    if (!SEVERITIES.includes(parsed.severity)) parsed.severity = 'medium';
    parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    parsed.summary_en = String(parsed.summary_en || '').slice(0, 400);
    parsed.summary_ur = String(parsed.summary_ur || '').slice(0, 400);
    parsed.source = 'qwen';
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export async function classifyAndRoute({ rawText, city, area, departments }) {
  const candidates = departments.filter((d) => d.city === city || d.coverage === 'national');
  let out;
  try {
    out = await llmClassify({ rawText, city, area, candidates });
  } catch (e) {
    if (process.env.DASHSCOPE_API_KEY) console.warn('[classify] LLM failed, using rules fallback:', e.message);
    out = fallbackClassify(rawText, city, area);
  }

  // Department: LLM choice wins only if valid; otherwise deterministic resolve.
  let dept = null;
  if (out.department_id) {
    const d = candidates.find((x) => x.id === out.department_id);
    if (d) dept = d;
  }
  if (!dept || !dept.categories_covered.includes(out.category)) {
    dept = resolveDepartment(departments, city, out.category);
  }

  const cityEn = CITIES[city]?.en || city;
  const routing_rationale = dept
    ? `${dept.name} handles ${CATEGORY_PHRASE[out.category].toLowerCase()} in ${dept.city === city ? cityEn : dept.city === 'national' ? 'cantonment / national jurisdiction' : CITIES[dept.city]?.en || 'its jurisdiction'}.`
    : `No authority in the knowledge base covers this issue for ${cityEn}.`;

  return {
    category: out.category,
    severity: out.severity,
    confidence: out.confidence,
    summary_en: out.summary_en,
    summary_ur: out.summary_ur,
    location_description: out.location_description || `${area ? area + ', ' : ''}${cityEn}`,
    source: out.source,
    raw: out.raw || { engine: out.source },
    department: dept,
    routing_rationale,
  };
}
