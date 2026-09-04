// Manual Google Sign-In (OAuth 2.0 authorization-code flow) with zero new
// dependencies. The authorization code is exchanged with Google's token
// endpoint server-side over TLS, and the profile is read from Google's
// userinfo endpoint with the returned access token — per the OAuth2/OIDC
// spec that back channel makes separate ID-token signature verification
// unnecessary: tokens only ever come from Google directly.
//
// Configure with GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (see .env.example).
// SESSION_SECRET signs the OAuth state parameter; a one-time handoff code
// carries the session token back to the page without cookies or tokens in URLs.

import crypto from 'node:crypto';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

const STATE_TTL_MS = 10 * 60e3; // OAuth state valid for 10 minutes

export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const redirectUri = (origin) => `${String(origin).replace(/\/+$/, '')}/auth/google/callback`;

export function authUrl(origin, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

// state = timestamp + HMAC-SHA256(timestamp, SESSION_SECRET). Proves the
// callback belongs to a flow this server started, within the time window.
const stateSecret = () => process.env.SESSION_SECRET || 'darkhwast-dev-secret-change-me';

export function signState() {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', stateSecret()).update(ts).digest('hex');
  return `${ts}.${sig}`;
}

export function verifyState(state) {
  const [ts, sig] = String(state || '').split('.');
  if (!ts || !sig || !/^\d+$/.test(ts) || !/^[0-9a-f]+$/i.test(sig)) return false;
  if (Math.abs(Date.now() - Number(ts)) > STATE_TTL_MS) return false;
  const expected = crypto.createHmac('sha256', stateSecret()).update(ts).digest('hex');
  const a = Buffer.from(sig.toLowerCase(), 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Exchange the one-time authorization code for tokens + the Google profile.
export async function exchangeCode(code, origin) {
  const body = new URLSearchParams({
    code: String(code || ''),
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri(origin),
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) throw new Error(`google token exchange failed (${tokenRes.status})`);
  const tokens = await tokenRes.json();
  const infoRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) throw new Error(`google userinfo failed (${infoRes.status})`);
  const info = await infoRes.json();
  return {
    sub: info.sub,
    email: String(info.email || '').toLowerCase(),
    email_verified: Boolean(info.email_verified),
    name: String(info.name || '').trim() || String(info.email || '').split('@')[0] || 'Citizen',
  };
}

// ---------------------------------------------------------------------------
// One-time handoff codes. The OAuth callback redirects to
// /signin.html?google=1&h=<code>; the page exchanges h exactly once via
// POST /api/auth/google/exchange for the real Bearer token. 60s TTL, single
// use — no tokens or user data ever sit in a URL, referrer or browser history.
// ---------------------------------------------------------------------------
const HANDOFF_TTL_MS = 60e3;
const handoffCodes = new Map(); // code -> { token, userId, expiresAt }

export function issueHandoffCode({ token, userId }) {
  const now = Date.now();
  for (const [code, entry] of handoffCodes) {
    if (entry.expiresAt <= now) handoffCodes.delete(code);
  }
  const code = crypto.randomBytes(24).toString('base64url');
  handoffCodes.set(code, { token, userId, expiresAt: now + HANDOFF_TTL_MS });
  return code;
}

export function redeemHandoffCode(code) {
  const key = String(code || '');
  const entry = handoffCodes.get(key);
  if (!entry) return null;
  handoffCodes.delete(key); // single use, always
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}
