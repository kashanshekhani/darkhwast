// AI photo assessment via Qwen-VL (DashScope).
// When a citizen uploads evidence photos, the vision model analyzes the first
// image and returns: visible issues, severity assessment, description, and
// whether the photo supports the complaint category.
//
// Silently skipped when no DASHSCOPE_API_KEY is set (same degradation pattern
// as the text classifier in lib/classify.js).

const DASHSCOPE_VL_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

const VL_SYSTEM_PROMPT = `You are the visual assessment engine of DarKhwast, a civic complaint service in Pakistan.
Given an evidence photo from a citizen's complaint and the complaint text, return STRICT JSON only:
{
  "visible_issues": ["list of visible problems, e.g. overflowing garbage bin, pothole approximately 30cm deep"],
  "severity_assessment": "low" | "medium" | "high",
  "description": "one sentence describing what the photo shows",
  "supports_complaint": true | false
}
Rules:
- Only describe what is actually visible in the photo. Never invent details.
- severity_assessment should reflect the visual evidence, not just the complaint text.
- supports_complaint = false if the photo does not appear related to the complaint category.
- Return ONLY the JSON object, no markdown, no explanation.`;

export async function assessImage({ imageDataUrl, complaintText, category }) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) return null;

  const response = await fetch(DASHSCOPE_VL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.VL_MODEL || 'qwen-vl-plus',
      messages: [
        { role: 'system', content: VL_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Complaint: ${complaintText}\nCategory: ${category}` },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DashScope VL HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  // Strip markdown code fences if present, then parse JSON
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
