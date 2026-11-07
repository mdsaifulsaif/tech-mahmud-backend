import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// ===== Core send function =====
export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    family: 4, // Force IPv4
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  } as any);

  const senderName = process.env.APP_NAME || "Tech Mahmud";
  const info = await transporter.sendMail({
    from: `"${senderName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log("EMAIL SENT:", info.messageId);
};

// ===== Base Template Wrapper (Modern Tech Mahmud Design) =====
const baseTemplate = (bodyContent: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tech Mahmud</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" style="max-width:520px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;" cellpadding="0" cellspacing="0">

          <!-- Accent Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #2563EB 0%, #06B6D4 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:#0F172A; padding: 28px 32px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align:middle; padding-right:12px;">
                    <div style="width:38px; height:38px; background:linear-gradient(135deg, #2563EB 0%, #06B6D4 100%); border-radius:10px; text-align:center; line-height:38px; font-weight:900; font-size:17px; color:#FFFFFF; display:inline-block; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);">
                      TM
                    </div>
                  </td>
                  <td style="vertical-align:middle; text-align:left;">
                    <div style="font-size:20px; font-weight:800; color:#FFFFFF; letter-spacing:-0.5px; line-height:1.2;">
                      Tech Mahmud
                    </div>
                    <div style="font-size:10px; font-weight:600; color:#93C5FD; text-transform:uppercase; letter-spacing:1.5px; line-height:1.2; margin-top:2px;">
                      Gadgets & Lifestyle
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; background-color:#FFFFFF;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC; padding: 24px 32px; text-align:center; border-top: 1px solid #E2E8F0;">
              <p style="margin:0 0 8px; color:#475569; font-size:12px; font-weight:600;">
                Tech Mahmud • Official Gadget & Lifestyle Portal
              </p>
              <p style="margin:0 0 12px; color:#94A3B8; font-size:11px;">
                &copy; ${new Date().getFullYear()} Tech Mahmud Ltd. All rights reserved.
              </p>
              <p style="margin:0; font-size:11px;">
                <a href="${process.env.CLIENT_URL || "https://tech-mahmud-frontend.vercel.app"}" target="_blank" style="color:#2563EB; text-decoration:none; font-weight:600;">Visit Website</a>
                <span style="color:#CBD5E1; margin: 0 8px;">•</span>
                <span style="color:#94A3B8;">Nationwide Delivery & Support</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ===== Reusable Primary Button =====
const emailButton = (url: string, label: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto;">
  <tr>
    <td align="center" style="border-radius:10px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
      <a href="${url}" target="_blank"
        style="display:inline-block; padding: 14px 36px; color:#FFFFFF; text-decoration:none; font-size:15px; font-weight:bold; letter-spacing: 0.3px; border-radius:10px;">
        ${label}
      </a>
    </td>
  </tr>
</table>
`;

// ===== 1. Verification OTP Email =====
export const sendVerificationEmail = async (
  to: string,
  firstName: string,
  code: string
) => {
  const body = `
    <h2 style="margin:0 0 12px; color:#0F172A; font-size:22px; font-weight:700; letter-spacing:-0.5px;">
      Welcome to Tech Mahmud, ${firstName || "there"}! 👋
    </h2>
    <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">
      Thank you for creating an account with us. Please use the verification code below to confirm your email and activate your account.
    </p>

    <!-- Verification Code Box -->
    <div style="margin: 0 0 24px; padding: 24px 20px; background-color:#F8FAFC; border: 1px dashed #CBD5E1; border-radius:12px; text-align:center;">
      <div style="margin:0 0 10px; color:#64748B; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">
        Your Verification Code
      </div>
      <div style="margin:0; color:#0F172A; font-size:36px; font-weight:800; letter-spacing:12px; font-family: 'SF Pro Display', -apple-system, monospace; padding-left:12px;">
        ${code}
      </div>
      <div style="margin-top:10px; display:inline-block; padding: 4px 12px; background-color:#EFF6FF; border-radius:20px; color:#2563EB; font-size:11px; font-weight:600;">
        ⏱ Valid for 10 minutes
      </div>
    </div>

    <!-- Security Guidance -->
    <p style="margin:0 0 8px; color:#64748B; font-size:13px; line-height:1.6;">
      Enter this code on the verification page to complete your signup process.
    </p>
    <p style="margin:0; color:#94A3B8; font-size:12px; line-height:1.6;">
      If you did not sign up for an account with Tech Mahmud, you can safely ignore this email.
    </p>
  `;

  await sendEmail({
    to,
    subject: `Your Verification Code: ${code} - Tech Mahmud`,
    html: baseTemplate(body),
  });
};

// ===== 2. Reset Password Email =====
export const sendResetPasswordEmail = async (
  to: string,
  firstName: string,
  resetUrl: string
) => {
  const body = `
    <h2 style="margin:0 0 12px; color:#0F172A; font-size:22px; font-weight:700; letter-spacing:-0.5px;">
      Reset Your Password
    </h2>
    <p style="margin:0 0 20px; color:#475569; font-size:15px; line-height:1.6;">
      Hello ${firstName || "Customer"}, we received a request to reset the password for your Tech Mahmud account. Click the button below to choose a new password.
    </p>

    ${emailButton(resetUrl, "Reset Password")}

    <div style="background-color:#FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 16px; border-radius:8px; margin: 24px 0;">
      <p style="margin:0; color:#92400E; font-size:13px; line-height:1.5;">
        <strong>Security Notice:</strong> This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email. Your current password remains completely secure.
      </p>
    </div>

    <p style="margin:0 0 8px; color:#94A3B8; font-size:12px; line-height:1.6;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    <p style="margin:0; color:#2563EB; font-size:12px; word-break:break-all;">
      ${resetUrl}
    </p>
  `;

  await sendEmail({
    to,
    subject: "Reset your password - Tech Mahmud",
    html: baseTemplate(body),
  });
};
