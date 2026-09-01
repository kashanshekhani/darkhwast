// Auto-escalation engine: complaints that haven't been acknowledged within
// N days (configurable via ESCALATION_DAYS, default 3) are flagged as
// escalated so they surface prominently in the dashboard and queue.

import { nowIso } from './util.js';

const ESCALATION_DAYS = Number(process.env.ESCALATION_DAYS || 3);

// Complaints eligible for escalation: sent or acknowledged, not already
// escalated, and the last status event is older than the threshold.
export function findEscalatable(complaints, events) {
  const now = Date.now();
  return complaints.filter((c) => {
    if (!['sent', 'acknowledged'].includes(c.status)) return false;
    if (c.escalation_level && c.escalation_level >= 1) return false;
    // Find the last status event for this complaint
    const complaintEvents = events
      .filter((e) => e.complaint_id === c.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastEvent = complaintEvents[complaintEvents.length - 1];
    if (!lastEvent) return false;
    const ageDays = (now - new Date(lastEvent.created_at).getTime()) / 86400000;
    return ageDays >= ESCALATION_DAYS;
  });
}

// Escalate eligible complaints: set escalation_level, add a system event,
// and broadcast to SSE clients. Returns the number of complaints escalated.
export function escalate(db, addEvent, broadcastEvent) {
  const escalatable = findEscalatable(db.complaints, db.status_events);
  for (const c of escalatable) {
    c.escalation_level = 1;
    c.escalated_at = nowIso();
    addEvent(c.id, c.status, c.status, 'system', `Auto-escalated: no acknowledgment for ${ESCALATION_DAYS}+ days`);
    if (broadcastEvent) {
      broadcastEvent('complaint:escalated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
    }
  }
  return escalatable.length;
}

export { ESCALATION_DAYS };
