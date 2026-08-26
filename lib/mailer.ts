import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface EmailDetailItem {
  label: string;
  value: string;
}

export interface EmailTemplateData {
  recipientName?: string;
  subject: string;
  intro: string;
  highlight?: string;
  details?: EmailDetailItem[];
  footer?: string;
}

const smtpHost = process.env.MAIL_HOST || 'mail.dits.ro';
const smtpPort = parseInt(process.env.MAIL_PORT || '465', 10);
const smtpSecure = process.env.MAIL_SECURE === 'true' || smtpPort === 465;
const smtpUser = process.env.MAIL_USER || 'office@dits.ro';
const smtpPass = process.env.MAIL_PASS || 'gG4sr0gG.U~dLz76';

const smtpTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const fromName = options.fromName || process.env.MAIL_FROM_NAME || 'VVRobots Marketing Media';
  const fromEmail = options.fromEmail || process.env.MAIL_FROM_EMAIL || 'office@dits.ro';
  const replyTo = options.replyTo || process.env.MAIL_REPLY_TO || 'denisandreig500@gmail.com';
  const fromFormatted = `"${fromName}" <${fromEmail}>`;
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const info = await smtpTransporter.sendMail({
      from: fromFormatted,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: replyTo,
    });

    console.log(`[MarketingMedia][MAIL] Sent email to ${recipients.join(', ')} (MessageID: ${info.messageId})`);
    return { success: true, id: info.messageId };
  } catch (err: any) {
    console.error(`[MarketingMedia][MAIL] SMTP send failed:`, err);
    return { success: false, error: err.message };
  }
}

export async function sendPasswordResetCodeEmail(
  toEmail: string,
  code: string,
  recipientName?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const subject = 'Cod resetare parolă - VVRobots Marketing Media';
  const html = buildVVRobotsEmailHtml({
    recipientName: recipientName || toEmail,
    subject,
    intro: 'Ai solicitat resetarea parolei pentru contul tău VVRobots. Folosește codul de securitate de mai jos pentru a-ți seta o parolă nouă.',
    highlight: `Cod de securitate: ${code}`,
    details: [
      { label: 'Cont email', value: toEmail },
      { label: 'Valabilitate', value: '15 minute' },
      { label: 'Securitate', value: 'Nu trimite acest cod nimănui.' },
    ],
    footer: 'Dacă nu ai solicitat resetarea parolei, ignoră acest email. Parola ta va rămâne neschimbată.',
  });

  return sendEmail({
    to: toEmail,
    subject,
    html,
  });
}

export function buildVVRobotsEmailHtml(data: EmailTemplateData): string {
  const safeName = escHtml(data.recipientName || 'Utilizator');
  const safeSubject = escHtml(data.subject);
  const safeIntro = escHtml(data.intro);
  const safeHighlight = data.highlight ? escHtml(data.highlight) : null;
  const safeFooter = data.footer ? escHtml(data.footer) : null;

  let detailRows = '';
  if (data.details && data.details.length > 0) {
    detailRows = data.details
      .map(
        (item) => `<tr>
          <td style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.07);color:#00e575;font-weight:600;width:160px;font-size:13px;">${escHtml(item.label)}</td>
          <td style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.07);color:#f1f5f9;font-size:13px;">${escHtml(item.value)}</td>
        </tr>`
      )
      .join('');
  }

  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#0b0f17;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0f17;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#121b28;border-radius:16px;overflow:hidden;border:1px solid #1d2c3f;box-shadow:0 16px 32px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding:28px 24px;background:linear-gradient(135deg,#0b0f17 0%,#121b28 100%);color:#ffffff;border-bottom:1px solid #1d2c3f;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      VVROBOTS <span style="color:#00e575;">19116</span>
                    </span>
                    <span style="display:inline-block;margin-left:8px;padding:3px 8px;background:rgba(0,229,117,0.15);border:1px solid rgba(0,229,117,0.3);border-radius:6px;font-size:10px;font-weight:800;color:#00e575;letter-spacing:1px;vertical-align:middle;text-transform:uppercase;">Marketing Media</span>
                  </td>
                </tr>
              </table>
              <div style="font-size:20px;font-weight:800;line-height:1.3;margin-top:14px;color:#ffffff;">${safeSubject}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h2 style="margin:0 0 12px;font-size:17px;color:#f8fafc;">Salut, ${safeName}!</h2>
              <p style="margin:0 0 16px;color:#94a9c1;font-size:14px;line-height:1.6;">${safeIntro}</p>
              
              ${
                safeHighlight
                  ? `<div style="margin:0 0 20px;background:rgba(0,229,117,0.1);border:1px solid rgba(0,229,117,0.3);border-radius:12px;padding:16px;color:#00e575;font-weight:700;font-size:18px;text-align:center;letter-spacing:2px;">
                ${safeHighlight}
              </div>`
                  : ''
              }
              
              ${
                detailRows
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #1d2c3f;border-radius:12px;overflow:hidden;background:rgba(255,255,255,0.02);margin-bottom:20px;">
                ${detailRows}
              </table>`
                  : ''
              }

              ${safeFooter ? `<p style="margin:16px 0 0;color:#506882;font-size:13px;line-height:1.6;">${safeFooter}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;border-top:1px solid #1d2c3f;background:#0b0f17;color:#506882;font-size:12px;text-align:center;">
              Email automat trimis de <strong style="color:#00e575;">VVRobots 19116 Marketing Media Platform</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}
