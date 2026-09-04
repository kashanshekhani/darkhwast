// Outbound dispatch (FR-5).
// Real SMTP when configured (Alibaba Cloud DirectMail or any provider);
// otherwise SIMULATED dispatch: logged to console, recorded in the dispatch
// log as simulated:true. Nothing leaves the machine in demo mode.

import nodemailer from 'nodemailer';
import { genId } from './util.js';

// Lazy-init: the transport is created on first use so that .env values
// loaded by server.js's loadEnv() (which runs AFTER this module is imported)
// are available. Creating it at import time would see empty process.env.
let transport = null;

function getTransport() {
  if (transport !== null) return transport;
  if (process.env.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } else {
    transport = false; // sentinel: simulated mode
  }
  return transport;
}

export const mailMode = () => (getTransport() ? 'smtp' : 'simulated');

export async function dispatchComplaintEmail({ to, subject, text }) {
  const t = getTransport();
  if (!t) {
    console.log('\n[mail:SIMULATED] --------------------------------------');
    console.log(`To      : ${to}`);
    console.log(`Subject : ${subject}`);
    console.log(text);
    console.log('[mail:SIMULATED] --------------------------------------\n');
    return { ok: true, simulated: true, message_id: 'sim-' + genId().slice(0, 12) };
  }
  const info = await t.sendMail({
    from: process.env.MAIL_FROM || 'DarKhwast <complaints@example.com>',
    to,
    subject,
    text,
  });
  return { ok: true, simulated: false, message_id: info.messageId };
}

export async function dispatchCitizenConfirmationEmail({ to, complaint }) {
  if (!to) return;
  const subject = `Confirmation: Complaint ${complaint.tracking_id} received`;
  const text = `Dear Citizen,

Your complaint has been successfully submitted and routed to the responsible department.

Tracking ID: ${complaint.tracking_id}
Category: ${complaint.category}
Assigned Department: ${complaint.department?.name || 'Pending'}
Submitted on: ${new Date(complaint.created_at).toLocaleString()}

You can track the status of your complaint at any time using your Tracking ID on our website.

Thank you,
DarKhwast AI Router`;

  if (!getTransport()) {
    console.log('\n[mail:SIMULATED] --- CITIZEN CONFIRMATION ---');
    console.log(`To      : ${to}`);
    console.log(`Subject : ${subject}`);
    console.log(text);
    console.log('[mail:SIMULATED] --------------------------------------\n');
    return { ok: true, simulated: true };
  }

  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || 'DarKhwast <complaints@example.com>',
      to,
      subject,
      text,
    });
    return { ok: true, simulated: false };
  } catch (err) {
    console.error('[mail] Citizen confirmation failed:', err);
    return { ok: false, error: err.message };
  }
}
