import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

let _transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  } else {
    // Auto-create Ethereal test account for local dev (no config needed)
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info(
      { user: testAccount.user },
      '📧 No SMTP_HOST set — using Ethereal test email account',
    );
  }

  return _transporter;
}

export interface PaymentLinkEmailOptions {
  to: string;
  invoiceNo: string;
  customerName: string;
  total: number;
  currency?: string;
  paymentUrl: string;
  dueDate?: string;
}

export async function sendPaymentLinkEmail(opts: PaymentLinkEmailOptions): Promise<void> {
  const { to, invoiceNo, customerName, total, currency = 'CAD', paymentUrl, dueDate } = opts;

  const fromName = process.env.SMTP_FROM_NAME || 'Sparkly Billing';
  const fromEmail = process.env.SMTP_FROM || 'billing@sparkly.ca';

  const formattedTotal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(total);

  const dueDateLine = dueDate ? `<p style="color:#6b7280;margin:0 0 8px">Due: <strong>${dueDate}</strong></p>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Invoice ${invoiceNo}</title>
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr>
      <td style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Logo / Brand -->
        <p style="margin:0 0 32px;font-size:22px;font-weight:700;color:#1e40af;letter-spacing:-0.5px">
          ✦ Sparkly
        </p>

        <!-- Heading -->
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827">
          Invoice ${invoiceNo}
        </h1>
        <p style="color:#6b7280;margin:0 0 24px;font-size:15px">
          Hi ${customerName}, you have a payment due.
        </p>

        <!-- Amount box -->
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
          <p style="color:#6b7280;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px">Amount Due</p>
          <p style="color:#111827;font-size:32px;font-weight:800;margin:0">${formattedTotal}</p>
          ${dueDateLine}
        </div>

        <!-- CTA Button -->
        <div style="text-align:center;margin-bottom:28px">
          <a href="${paymentUrl}"
             style="display:inline-block;background:#1e40af;color:#ffffff;font-size:16px;font-weight:600;
                    text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:.2px">
            Pay Now →
          </a>
        </div>

        <!-- Fallback link -->
        <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 24px">
          Or copy this link:<br/>
          <a href="${paymentUrl}" style="color:#3b82f6;word-break:break-all">${paymentUrl}</a>
        </p>

        <!-- Footer -->
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px" />
        <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center">
          This payment link was sent by Sparkly on behalf of your service provider.<br/>
          If you have questions, please contact them directly.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Invoice ${invoiceNo}\n\nHi ${customerName},\n\nYou have a payment of ${formattedTotal} due${dueDate ? ` by ${dueDate}` : ''}.\n\nPay here: ${paymentUrl}\n\n— Sparkly Billing`;

  const subject = `Invoice ${invoiceNo} — Payment of ${formattedTotal} Due`;

  // ── Brevo HTTP API (works on Vercel serverless — SMTP is blocked there) ──
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Brevo API error ${res.status}: ${errBody}`);
    }

    logger.info({ to }, '📧 Email sent via Brevo HTTP API');
    return;
  }

  // ── Fallback: nodemailer (SMTP for local dev or Ethereal preview) ──────
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info({ previewUrl, to }, '📧 Email sent (Ethereal preview)');
    console.log('\n\x1b[36m━━━ EMAIL PREVIEW URL ━━━\x1b[0m');
    console.log(`\x1b[33mTo:\x1b[0m ${to}`);
    console.log(`\x1b[33mPreview:\x1b[0m ${previewUrl}`);
    console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
  } else {
    logger.info({ to, messageId: info.messageId }, '📧 Email sent');
  }
}
