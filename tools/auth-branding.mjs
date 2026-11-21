#!/usr/bin/env node
// Brands every Supabase Auth email and SMS with the app's own name (instead of "Supabase Auth", Netlify, Twilio etc.).
// Sets, through the Supabase Management API (PATCH /v1/projects/{ref}/config/auth):
//   - Hebrew RTL email templates + subjects that carry the app name (sign-up, code / sign-in link, password reset,
//     email change, re-authentication, invite). The code email includes both the 6-digit code and the link.
//   - SMS text: "<code> הוא קוד הכניסה שלך ל-<App>".
//   - Optional: custom SMTP (needed for the sender NAME in the inbox to be the app name) and Twilio SMS (phone sign-in).
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_... node tools/auth-branding.mjs --project <ref> --app "Easy Record" [--dry-run]
// Optional env, applied only when set:
//   SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM          (e.g. Resend: smtp.resend.com 465 resend <api key> no-reply@yourdomain)
//   TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_MESSAGING_SERVICE_SID   (the Messaging Service holds the sender ID, e.g. "EasyRecord")
// The access token is created at https://supabase.com/dashboard/account/tokens. Nothing is stored by this script.

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const project = arg('--project'), app = arg('--app'), dry = args.includes('--dry-run');
if (!project || !app) { console.error('usage: node tools/auth-branding.mjs --project <ref> --app "<App name>" [--dry-run]'); process.exit(2); }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const A = esc(app);
const wrap = (title, body) => `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;padding:24px;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#1b1b1b">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">
<div style="font-size:20px;font-weight:bold;margin-bottom:12px">${A}</div>
<h2 style="font-size:18px;margin:0 0 12px">${title}</h2>${body}
<p style="font-size:13px;color:#666;margin-top:24px">אם לא ביקשת את זה, אפשר להתעלם מהודעה זו.<br>${A}</p></div></body></html>`;
const btn = (label) => `<p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#12302d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${label}</a></p>`;
const code = `<p style="font-size:15px">הקוד שלך:</p><p style="font-size:30px;font-weight:bold;letter-spacing:6px;direction:ltr;text-align:center;margin:8px 0">{{ .Token }}</p>`;

const cfg = {
  mailer_subjects_confirmation: `אישור ההרשמה ל-${app}`,
  mailer_templates_confirmation_content: wrap(`אישור ההרשמה ל-${A}`, `<p>כדי להשלים את ההרשמה, לחץ על הכפתור:</p>${btn('אישור ההרשמה')}`),
  mailer_subjects_magic_link: `{{ .Token }} — קוד הכניסה שלך ל-${app}`,
  mailer_templates_magic_link_content: wrap(`כניסה ל-${A}`, `${code}<p>אפשר להזין את הקוד באפליקציה, או ללחוץ על הכפתור כדי להיכנס:</p>${btn(`כניסה ל-${A}`)}<p style="font-size:13px;color:#666">הקוד והקישור תקפים לזמן קצר ולשימוש אחד.</p>`),
  mailer_subjects_recovery: `איפוס הסיסמה ב-${app}`,
  mailer_templates_recovery_content: wrap(`איפוס הסיסמה ב-${A}`, `<p>קיבלנו בקשה לאפס את הסיסמה שלך. לחץ על הכפתור כדי לבחור סיסמה חדשה:</p>${btn('בחירת סיסמה חדשה')}`),
  mailer_subjects_email_change: `אישור שינוי כתובת האימייל ב-${app}`,
  mailer_templates_email_change_content: wrap(`שינוי כתובת האימייל ב-${A}`, `<p>כדי לאשר את הכתובת החדשה {{ .NewEmail }}, לחץ על הכפתור:</p>${btn('אישור הכתובת החדשה')}`),
  mailer_subjects_reauthentication: `{{ .Token }} — קוד האימות שלך ל-${app}`,
  mailer_templates_reauthentication_content: wrap(`אימות ב-${A}`, code),
  mailer_subjects_invite: `הוזמנת ל-${app}`,
  mailer_templates_invite_content: wrap(`הוזמנת ל-${A}`, `<p>כדי ליצור את החשבון שלך, לחץ על הכפתור:</p>${btn('יצירת חשבון')}`),
  sms_template: `{{ .Code }} הוא קוד הכניסה שלך ל-${app}. אין למסור אותו לאף אחד.`,
};

const E = process.env;
if (E.SMTP_HOST) {
  for (const k of ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) if (!E[k]) { console.error(`missing ${k}`); process.exit(2); }
  Object.assign(cfg, { smtp_host: E.SMTP_HOST, smtp_port: String(E.SMTP_PORT), smtp_user: E.SMTP_USER, smtp_pass: E.SMTP_PASS,
    smtp_admin_email: E.SMTP_FROM, smtp_sender_name: app });
}
if (E.TWILIO_ACCOUNT_SID) {
  for (const k of ['TWILIO_AUTH_TOKEN', 'TWILIO_MESSAGING_SERVICE_SID']) if (!E[k]) { console.error(`missing ${k}`); process.exit(2); }
  Object.assign(cfg, { external_phone_enabled: true, sms_provider: 'twilio', sms_twilio_account_sid: E.TWILIO_ACCOUNT_SID,
    sms_twilio_auth_token: E.TWILIO_AUTH_TOKEN, sms_twilio_message_service_sid: E.TWILIO_MESSAGING_SERVICE_SID, sms_otp_exp: 300 });
}

const shown = Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, /pass|token/i.test(k) ? '***' : v]));
if (dry) { console.log(JSON.stringify(shown, null, 2)); process.exit(0); }
if (!E.SUPABASE_ACCESS_TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)'); process.exit(2); }
const r = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(project)}/config/auth`, {
  method: 'PATCH', headers: { authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cfg) });
const t = await r.text();
if (!r.ok) { console.error(`failed: HTTP ${r.status} ${t.slice(0, 500)}`); process.exit(1); }
console.log(`done: ${Object.keys(cfg).length} settings updated for ${app} (${project}).`
  + (E.SMTP_HOST ? ' Emails now come from "' + app + '".' : ' Email sender name: needs custom SMTP (SMTP_* env).')
  + (E.TWILIO_ACCOUNT_SID ? ' SMS sign-in enabled.' : ' SMS: needs Twilio (TWILIO_* env).'));
