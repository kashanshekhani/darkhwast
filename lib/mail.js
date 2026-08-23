// Outbound dispatch (FR-5).
// Real SMTP when configured (Alibaba Cloud DirectMail or any provider);
// otherwise SIMULATED dispatch: logged to console, recorded in the dispatch
// log as simulated:true. Nothing leaves the machine in demo mode.

import nodemailer from 'nodemailer';
import { genId } from './util.js';

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export const mailMode = () => (transport ? 'smtp' : 'simulated');

export async function dispatchComplaintEmail({ to, subject, text }) {
  if (!transport) {
    console.log('\n[mail:SIMULATED] --------------------------------------');
    console.log(`To      : ${to}`);
    console.log(`Subject : ${subject}`);
    console.log(text);
    console.log('[mail:SIMULATED] --------------------------------------\n');
    return { ok: true, simulated: true, message_id: 'sim-' + genId().slice(0, 12) };
  }
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM || 'DarKhwast <complaints@example.com>',
    to,
    subject,
    text,
  });
  return { ok: true, simulated: false, message_id: info.messageId };
}
