



import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// ===== Core send function (generic, সব email এর জন্য reusable) =====
// export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT) || 587,
//     secure: process.env.SMTP_PORT === "465",
//     // family: 4,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });

//   const info = await transporter.sendMail({
//     from: `"${process.env.APP_NAME || "সবজিহাট"}" <${process.env.SMTP_USER}>`,
//     to,
//     subject,
//     html,
//   });

//   console.log("EMAIL SENT:", info.messageId);
// };

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    family: 4, // IPv4 ফোর্স করার জন্য
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  } as any); // <--- এখানে 'as any' যোগ করে দিলে টাইপস্ক্রিপ্ট আর কোনো বাধা দিবে না

  const info = await transporter.sendMail({
    from: `"${process.env.APP_NAME || "সবজিহাট"}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log("EMAIL SENT:", info.messageId);
};
// ===== Base Template Wrapper (সব email এই layout এর ভেতরে বসবে) =====
const baseTemplate = (bodyContent: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background-color:#619D23; padding: 28px 32px; text-align:center;">
              <h1 style="margin:0; color:#FFFFFF; font-size:22px; letter-spacing: 0.5px;">সবজিহাট</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC; padding: 20px 32px; text-align:center;">
              <p style="margin:0; color:#94A3B8; font-size:12px;">
                &copy; ${new Date().getFullYear()} সবজিহাট. All rights reserved.
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

// ===== Reusable Button component =====
const emailButton = (url: string, label: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
  <tr>
    <td align="center" style="border-radius:8px; background-color:#619D23;">
      <a href="${url}" target="_blank"
        style="display:inline-block; padding: 14px 32px; color:#FFFFFF; text-decoration:none; font-size:15px; font-weight:bold; border-radius:8px;">
        ${label}
      </a>
    </td>
  </tr>
</table>
`;

// ===== Verification Email =====
export const sendVerificationEmail = async (
  to: string,
  firstName: string,
  code: string
) => {
  const body = `
    <h2 style="margin:0 0 12px; color:#1E293B; font-size:20px;">Hi ${firstName},</h2>
    <p style="margin:0 0 20px; color:#4B5966; font-size:15px; line-height:1.6;">
      Thanks for registering with সবজিহাট! Use this verification code to activate your account.
    </p>

    <div style="margin: 0 0 24px; padding: 20px 16px; background-color:#F8FAFC; border-radius:10px; text-align:center;">
      <p style="margin:0 0 8px; color:#94A3B8; font-size:12px; letter-spacing:1px; text-transform:uppercase;">Your code</p>
      <p style="margin:0; color:#1E293B; font-size:32px; font-weight:bold; letter-spacing:10px;">${code}</p>
    </div>

    <p style="margin:0; color:#94A3B8; font-size:13px; line-height:1.6;">
      This code will expire in 10 minutes. If you didn't create an account with সবজিহাট, you can safely ignore this email.
    </p>
  `;

  await sendEmail({
    to,
    subject: "Your verification code - সবজিহাট",
    html: baseTemplate(body),
  });
};

// ===== Reset Password Email =====
export const sendResetPasswordEmail = async (
  to: string,
  firstName: string,
  resetUrl: string
) => {
  const body = `
    <h2 style="margin:0 0 12px; color:#1E293B; font-size:20px;">Hi ${firstName},</h2>
    <p style="margin:0 0 20px; color:#4B5966; font-size:15px; line-height:1.6;">
      We received a request to reset your সবজিহাট account password. Click the button below to set a new password.
    </p>

    ${emailButton(resetUrl, "Reset Password")}

    <p style="margin:0 0 8px; color:#94A3B8; font-size:13px; line-height:1.6;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 20px; color:#619D23; font-size:13px; word-break:break-all;">
      ${resetUrl}
    </p>

    <div style="background-color:#FEF3C7; border-left: 3px solid #F59E0B; padding: 12px 16px; border-radius:6px; margin-bottom: 20px;">
      <p style="margin:0; color:#92400E; font-size:13px; line-height:1.5;">
        This link will expire in <strong>15 minutes</strong>. If you didn't request a password reset, please ignore this email — your password will remain unchanged.
      </p>
    </div>
  `;

  await sendEmail({
    to,
    subject: "Reset your password - সবজিহাট",
    html: baseTemplate(body),
  });
};