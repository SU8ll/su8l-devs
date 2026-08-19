import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter =
  config.gmail.user && config.gmail.pass
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.gmail.user, pass: config.gmail.pass },
      })
    : null;

function welcomeHtml(username: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background:#0b0e14; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; }
  .wrapper { max-width:600px; margin:0 auto; background:#131926; border:1px solid #1e293b; border-radius:12px; overflow:hidden; }
  .header { background:linear-gradient(135deg,#0ea5e9,#8b5cf6); padding:32px 24px; text-align:center; }
  .header h1 { color:#fff; font-size:24px; margin:0 0 4px 0; font-weight:700; }
  .header p { color:rgba(255,255,255,0.85); font-size:14px; margin:0; }
  .body { padding:32px 24px; color:#cbd5e1; font-size:15px; line-height:1.7; }
  .body h2 { color:#e2e8f0; font-size:18px; margin:0 0 16px 0; }
  .box { background:#1e293b; border:1px solid #334155; border-radius:8px; padding:16px 20px; margin:20px 0; }
  .box .label { color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .box .value { color:#f1f5f9; font-size:15px; font-weight:600; word-break:break-all; }
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
    <h1>SU8L DEVs</h1>
    <p>Cloud Bot Service Platform</p>
  </div>
  <div class="body">
    <h2>مرحباً ${username}!</h2>
    <p>تم إنشاء حسابك بنجاح في منصة SU8L DEVs. يمكنك الآن تسجيل الدخول والبدء في استخدام الخدمات.</p>

    <div class="box">
      <div class="label">البريد الإلكتروني</div>
      <div class="value">${email}</div>
    </div>
    <div class="box">
      <div class="label">اسم المستخدم</div>
      <div class="value">${username}</div>
    </div>

    <div class="warning">
      <h3>⚠ تنبيه هام — احفظ معلوماتك!</h3>
      <p>في حال فقدان كلمة المرور أو اسم المستخدم أو البريد الإلكتروني، <strong>SU8L DEVs لن تساعدك في استرجاعها.</strong> احفظ هذه المعلومات في مكان آمن.</p>
    </div>

    <p style="margin-top:24px; color:#64748b; font-size:13px;">إذا لم تنت أنت من قام بإنشاء هذا الحساب، يمكنك تجاهل هذا الإيميل.</p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} <a href="https://su8ldevs.eu.cc">SU8L DEVs</a>. جميع الحقوق محفوظة.</p>
  </div>
</div>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  email: string,
  username: string,
): Promise<boolean> {
  if (!transporter) {
    console.warn('[email] Gmail SMTP not configured — skipping welcome email');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"SU8L DEVs" <${config.gmail.user}>`,
      to: email,
      subject: 'مرحباً بك في SU8L DEVs — احفظ معلوماتك!',
      html: welcomeHtml(username, email),
    });
    console.log(`[email] Welcome email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('[email] Failed to send welcome email:', err);
    return false;
  }
}
