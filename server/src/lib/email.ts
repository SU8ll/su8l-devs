import { config } from '../config.js';

const hasApiKey = !!(config.smtp.pass && config.smtp.user);
console.log(`[email] Brevo API configured: ${hasApiKey} (user=${config.smtp.user ? '***' : 'MISSING'}, from=${config.smtp.from || 'MISSING'})`);

function emailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background:#0b0e14; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; }
  .wrapper { max-width:600px; margin:0 auto; background:#131926; border:1px solid #1e293b; border-radius:12px; overflow:hidden; }
  .header { background:linear-gradient(135deg,#0ea5e9,#8b5cf6); padding:32px 24px; text-align:center; }
  .header img { width:72px; height:72px; border-radius:16px; background:#fff; padding:8px; box-shadow:0 4px 16px rgba(0,0,0,0.25); margin-bottom:12px; }
  .header h1 { color:#fff; font-size:24px; margin:0 0 4px 0; font-weight:700; }
  .header p { color:rgba(255,255,255,0.85); font-size:14px; margin:0; }
  .body { padding:32px 24px; color:#cbd5e1; font-size:15px; line-height:1.7; }
  .body h2 { color:#e2e8f0; font-size:18px; margin:0 0 16px 0; }
  .box { background:#1e293b; border:1px solid #334155; border-radius:8px; padding:16px 20px; margin:20px 0; }
  .box .label { color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .box .value { color:#f1f5f9; font-size:15px; font-weight:600; word-break:break-all; }
  .code { background:#0ea5e9; border-radius:8px; padding:20px; margin:20px 0; text-align:center; }
  .code .label { color:#bae6fd; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .code .value { color:#fff; font-size:36px; font-weight:800; letter-spacing:12px; font-family:Consolas,Menlo,monospace; }
  .warning { background:#451a03; border:1px solid #92400e; border-radius:8px; padding:16px 20px; margin:20px 0; }
  .warning h3 { color:#fbbf24; font-size:14px; margin:0 0 8px 0; }
  .warning p { color:#fde68a; font-size:13px; margin:0; line-height:1.6; }
  .footer { padding:20px 24px; text-align:center; color:#475569; font-size:12px; border-top:1px solid #1e293b; }
  .footer a { color:#0ea5e9; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="https://su8ldevs.eu.cc/logo.png" alt="SU8L DEVs" width="72" height="72" />
    <h1>SU8L DEVs</h1>
    <p>Cloud Bot Service Platform</p>
  </div>
  <div class="body">
    ${bodyHtml}
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} <a href="https://su8ldevs.eu.cc">SU8L DEVs</a>. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

async function sendBrevo(to: string, subject: string, html: string): Promise<boolean> {
  if (!hasApiKey) {
    console.warn('[email] Brevo API key not configured — skipping email');
    return false;
  }

  const payload = {
    sender: { name: 'SU8L DEVs', email: 'alghamdyy321@11868290.brevosend.com' },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.smtp.pass,
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Brevo API error ${res.status}:`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[email] Brevo API request failed:', err);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  username: string,
  code: string,
): Promise<boolean> {
  const ok = await sendBrevo(
    email,
    'SU8L DEVs — Verify Your Email',
    emailShell(`
      <h2>Hello ${username}!</h2>
      <p>Thanks for signing up. To complete your registration, enter the verification code below:</p>
      <div class="code">
        <div class="label">Your Verification Code</div>
        <div class="value">${code}</div>
      </div>
      <p style="color:#64748b; font-size:13px;">This code expires in <strong>10 minutes</strong>. If you did not request this, you can ignore this email.</p>
    `),
  );
  if (ok) console.log(`[email] Verification email sent to ${email}`);
  return ok;
}

export async function sendRecoveryEmail(
  email: string,
  username: string,
  code: string,
): Promise<boolean> {
  const ok = await sendBrevo(
    email,
    'SU8L DEVs — Account Recovery Code',
    emailShell(`
      <h2>Hello ${username}!</h2>
      <p>We received a request to recover your SU8L DEVs account. Use the code below to reset your password:</p>
      <div class="code">
        <div class="label">Your Recovery Code</div>
        <div class="value">${code}</div>
      </div>
      <p style="color:#64748b; font-size:13px;">This code expires in <strong>10 minutes</strong>. If you did not request this, you can ignore this email and your password will stay unchanged.</p>
    `),
  );
  if (ok) console.log(`[email] Recovery email sent to ${email}`);
  return ok;
}

export async function sendWelcomeEmail(
  email: string,
  username: string,
): Promise<boolean> {
  const ok = await sendBrevo(
    email,
    'Welcome to SU8L DEVs — Save Your Credentials!',
    emailShell(`
      <h2>Welcome, ${username}!</h2>
      <p>Your account has been created successfully on the SU8L DEVs platform. You can now sign in and start using our services.</p>
      <div class="box">
        <div class="label">Email Address</div>
        <div class="value">${email}</div>
      </div>
      <div class="box">
        <div class="label">Username</div>
        <div class="value">${username}</div>
      </div>
      <div class="warning">
        <h3>Important Notice — Keep Your Credentials Safe!</h3>
        <p>If you ever forget your password, username, or email, you can recover them through your registered email using the "Forgot password?" link on the sign-in page. Still, we recommend saving this information in a secure place.</p>
      </div>
      <p style="margin-top:24px; color:#64748b; font-size:13px;">If you did not create this account, you can simply ignore this email.</p>
    `),
  );
  if (ok) console.log(`[email] Welcome email sent to ${email}`);
  return ok;
}
