import nodemailer from "nodemailer";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Optional EmailJS template override for this send */
  templateId?: string;
  /** Extra EmailJS template variables */
  templateParams?: Record<string, string>;
};

export type SendVerificationEmailOptions = {
  to: string;
  name?: string;
  otp: string;
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

export type SendAdminOtpEmailOptions = {
  to: string;
  otp: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlToText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDefaultRecipient() {
  return (
    process.env.CONTACT_TO_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "info@german-care.com"
  );
}

function getEmailJsConfig() {
  const serviceId =
    process.env.EMAILJS_SERVICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim();
  const publicKey =
    process.env.EMAILJS_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim();
  const defaultTemplateId =
    process.env.EMAILJS_TEMPLATE_ID?.trim() ||
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim();
  const privateKey =
    process.env.EMAILJS_PRIVATE_KEY?.trim() ||
    process.env.EMAILJS_ACCESS_TOKEN?.trim();

  if (!serviceId || !publicKey || !defaultTemplateId) {
    return null;
  }

  return {
    serviceId,
    publicKey,
    defaultTemplateId,
    privateKey,
    contactTemplateId:
      process.env.EMAILJS_CONTACT_TEMPLATE_ID?.trim() ||
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim() ||
      defaultTemplateId,
    verificationTemplateId:
      process.env.EMAILJS_VERIFICATION_TEMPLATE_ID?.trim() ||
      process.env.NEXT_PUBLIC_EMAILJS_VERIFICATION_TEMPLATE_ID?.trim() ||
      defaultTemplateId,
    resetTemplateId:
      process.env.EMAILJS_RESET_TEMPLATE_ID?.trim() ||
      process.env.NEXT_PUBLIC_EMAILJS_RESET_TEMPLATE_ID?.trim() ||
      defaultTemplateId,
    adminOtpTemplateId:
      process.env.EMAILJS_ADMIN_OTP_TEMPLATE_ID?.trim() ||
      process.env.NEXT_PUBLIC_EMAILJS_ADMIN_OTP_TEMPLATE_ID?.trim() ||
      defaultTemplateId,
  };
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD,
  );
}

export function isEmailConfigured() {
  return Boolean(getEmailJsConfig()) || isSmtpConfigured();
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
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

async function sendViaEmailJs({
  to,
  subject,
  html,
  text,
  replyTo,
  templateId,
  templateParams = {},
}: SendEmailOptions) {
  const config = getEmailJsConfig();

  if (!config) {
    throw new Error(
      "EmailJS is not configured. Set EMAILJS_SERVICE_ID (or NEXT_PUBLIC_EMAILJS_SERVICE_ID), EMAILJS_PUBLIC_KEY, and EMAILJS_TEMPLATE_ID.",
    );
  }

  const toAddress = Array.isArray(to) ? to.join(", ") : to;
  const plainText = text || htmlToText(html);

  const payload: Record<string, unknown> = {
    service_id: config.serviceId,
    template_id: templateId || config.defaultTemplateId,
    user_id: config.publicKey,
    template_params: {
      to_email: toAddress,
      user_email: toAddress,
      reply_to: replyTo || toAddress,
      subject,
      message: plainText,
      html_content: html,
      html,
      title: subject,
      // Default email to recipient; callers can override (e.g. contact form).
      email: toAddress,
      ...templateParams,
    },
  };

  if (config.privateKey) {
    payload.accessToken = config.privateKey;
  }

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `EmailJS failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
}

async function sendViaSmtp({
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
    text: text || htmlToText(html),
    replyTo,
  });
}

export async function sendEmail(options: SendEmailOptions) {
  const emailJs = getEmailJsConfig();

  if (emailJs) {
    try {
      await sendViaEmailJs(options);
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[sendEmail] EmailJS failed, trying SMTP fallback", error);

      if (!isSmtpConfigured()) {
        throw error;
      }
    }
  }

  if (!isSmtpConfigured()) {
    throw new Error(
      "No email provider configured. Set EmailJS (EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_TEMPLATE_ID) or SMTP_* vars.",
    );
  }

  return sendViaSmtp(options);
}

export async function sendVerificationEmail({
  to,
  name,
  otp,
}: SendVerificationEmailOptions) {
  const displayName = escapeHtml(name?.trim() || "there");
  const plainName = name?.trim() || "there";
  const safeOtp = escapeHtml(otp);
  const emailJs = getEmailJsConfig();
  const subject = "Verify your sa'i account";
  const text = `Hi ${plainName},\n\nYour 4-digit email confirmation code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not create an account, you can ignore this email.\n`;

  const html = `
    <div style="margin:0;padding:0;background:#f7f1ea;font-family:Georgia,'Times New Roman',serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e6d8c8;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;background:#1f3d2b;color:#fffdf9;">
                  <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">sa'i by German Care</p>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Confirm your email</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Hi ${displayName},
                  </p>
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Use this 4-digit code to confirm your email address. It expires in 10 minutes.
                  </p>
                  <p style="margin:0 0 28px;text-align:center;font-size:36px;letter-spacing:0.35em;font-weight:700;color:#1f3d2b;">
                    ${safeOtp}
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#5c6b61;">
                    If you did not create an account, you can ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  if (!emailJs) {
    throw new Error(
      "EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_TEMPLATE_ID.",
    );
  }

  return sendViaEmailJs({
    to,
    subject,
    html,
    text,
    templateId: emailJs.verificationTemplateId,
    templateParams: {
      name: plainName,
      otp,
      code: otp,
      passcode: otp,
    },
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
  const emailJs = getEmailJsConfig();
  const recipient = getDefaultRecipient();
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
    templateId: emailJs?.contactTemplateId,
    templateParams: {
      // EmailJS "Contact Us" template variables
      name: fullName,
      title: `Contact form: ${inquiryType} — ${fullName}`,
      time: submittedAt,
      // Customer email must win over recipient for {{email}} / Reply-To
      email,
      from_name: fullName,
      from_email: email,
      phone: phone?.trim() || "N/A",
      inquiry_type: inquiryType,
      inquiryType,
      submitted_at: submittedAt,
      message,
    },
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: SendPasswordResetEmailOptions) {
  const displayName = escapeHtml(name?.trim() || "there");
  const emailJs = getEmailJsConfig();

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

  if (!emailJs) {
    throw new Error(
      "EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_TEMPLATE_ID.",
    );
  }

  return sendViaEmailJs({
    to,
    subject: "Reset your sa'i password",
    html,
    text: `Hi ${name?.trim() || "there"},\n\nWe received a request to reset your password. Open this link to choose a new one (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, you can ignore this email.\n`,
    templateId: emailJs.resetTemplateId,
    templateParams: {
      name: name?.trim() || "there",
      reset_link: resetLink,
      link: resetLink,
    },
  });
}

export async function sendAdminOtpEmail({ to, otp }: SendAdminOtpEmailOptions) {
  const safeOtp = escapeHtml(otp);
  const emailJs = getEmailJsConfig();

  const html = `
    <div style="margin:0;padding:0;background:#f7f1ea;font-family:Georgia,'Times New Roman',serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e6d8c8;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;background:#1f3d2b;color:#fffdf9;">
                  <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">sa'i by German Care</p>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Admin password reset code</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Hi Admin,
                  </p>
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#1f3d2b;">
                    Use this 4-digit code to reset your admin password. It expires in 10 minutes.
                  </p>
                  <p style="margin:0 0 28px;text-align:center;font-size:36px;letter-spacing:0.35em;font-weight:700;color:#1f3d2b;">
                    ${safeOtp}
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#5c6b61;">
                    If you did not request this code, you can ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  if (!emailJs) {
    throw new Error(
      "EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_TEMPLATE_ID.",
    );
  }

  return sendViaEmailJs({
    to,
    subject: "Your admin password reset code",
    html,
    text: `Hi Admin,\n\nYour 4-digit admin password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.\n`,
    templateId: emailJs.adminOtpTemplateId,
    templateParams: {
      otp,
      code: otp,
      passcode: otp,
    },
  });
}
