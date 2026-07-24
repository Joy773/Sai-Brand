import nodemailer from "nodemailer";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendVerificationEmailOptions = {
  to: string;
  name?: string;
  verificationLink: string;
};

export type SendContactEmailOptions = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  inquiryType: string;
  message: string;
};

export type SendPasswordResetEmailOptions = {
  to: string;
  name?: string;
  resetLink: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.",
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from: process.env.SMTP_FROM?.trim() || user,
  };
}

function createTransport() {
  const { host, port, secure, auth } = getSmtpConfig();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });
}

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD,
  );
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailOptions) {
  const { from } = getSmtpConfig();
  const transport = createTransport();

  return transport.sendMail({
    from,
    to,
    subject,
    html,
    text:
      text ||
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    replyTo,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  verificationLink,
}: SendVerificationEmailOptions) {
  const displayName = name?.trim() || "there";

  const html = `
    <div style="margin:0;padding:0;background:#f7f1ea;font-family:Georgia,'Times New Roman',serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e6d8c8;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;background:#1f3d2b;color:#fffdf9;">
                  <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">sa'i by German Care</p>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Verify your email</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Hi ${displayName},
                  </p>
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Thanks for creating your account. Please confirm your email address by clicking the button below.
                  </p>
                  <p style="margin:0 0 28px;text-align:center;">
                    <a href="${verificationLink}" style="display:inline-block;background:#1f3d2b;color:#fffdf9;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:700;">
                      Verify email
                    </a>
                  </p>
                  <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#5c6b61;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;color:#8a6a2f;">
                    ${verificationLink}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return sendEmail({
    to,
    subject: "Verify your sa'i account",
    html,
    text: `Hi ${displayName},\n\nThanks for creating your account. Verify your email by opening this link:\n${verificationLink}\n`,
  });
}

export async function sendContactEmail({
  firstName,
  lastName,
  email,
  phone,
  inquiryType,
  message,
}: SendContactEmailOptions) {
  const { from } = getSmtpConfig();
  const recipient =
    process.env.CONTACT_TO_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    from;
  const fullName = `${firstName} ${lastName ?? ""}`.trim() || firstName;
  const submittedAt = new Date().toLocaleString();
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone?.trim() || "N/A");
  const safeInquiry = escapeHtml(inquiryType);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

  const html = `
    <div style="margin:0;padding:0;background:#f7f1ea;font-family:Georgia,'Times New Roman',serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e6d8c8;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;background:#1f3d2b;color:#fffdf9;">
                  <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">sa'i by German Care</p>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;">New contact message</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;color:#1f3d2b;font-size:15px;line-height:1.6;">
                  <p style="margin:0 0 12px;"><strong>Name:</strong> ${safeName}</p>
                  <p style="margin:0 0 12px;"><strong>Email:</strong> ${safeEmail}</p>
                  <p style="margin:0 0 12px;"><strong>Phone:</strong> ${safePhone}</p>
                  <p style="margin:0 0 12px;"><strong>Inquiry:</strong> ${safeInquiry}</p>
                  <p style="margin:0 0 12px;"><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
                  <p style="margin:20px 0 8px;"><strong>Message:</strong></p>
                  <p style="margin:0;padding:16px;background:#f7f1ea;border-radius:12px;">${safeMessage}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return sendEmail({
    to: recipient,
    subject: `Contact form: ${inquiryType} — ${fullName}`,
    html,
    text: [
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${phone?.trim() || "N/A"}`,
      `Inquiry: ${inquiryType}`,
      `Submitted: ${submittedAt}`,
      "",
      message,
    ].join("\n"),
    replyTo: email,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: SendPasswordResetEmailOptions) {
  const displayName = escapeHtml(name?.trim() || "there");

  const html = `
    <div style="margin:0;padding:0;background:#f7f1ea;font-family:Georgia,'Times New Roman',serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e6d8c8;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;background:#1f3d2b;color:#fffdf9;">
                  <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">sa'i by German Care</p>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Reset your password</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Hi ${displayName},
                  </p>
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
                  </p>
                  <p style="margin:0 0 28px;text-align:center;">
                    <a href="${resetLink}" style="display:inline-block;background:#1f3d2b;color:#fffdf9;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:700;">
                      Reset password
                    </a>
                  </p>
                  <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#5c6b61;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin:0 0 20px;font-size:13px;line-height:1.5;word-break:break-all;color:#8a6a2f;">
                    ${resetLink}
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#5c6b61;">
                    If you did not request a password reset, you can ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  return sendEmail({
    to,
    subject: "Reset your sa'i password",
    html,
    text: `Hi ${name?.trim() || "there"},\n\nWe received a request to reset your password. Open this link to choose a new one (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, you can ignore this email.\n`,
  });
}
