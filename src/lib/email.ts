import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Music Academy Pro" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset Your Password – Music Academy Pro",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0A0A0A; padding: 40px; border-radius: 12px;">
        <h1 style="color: #D4AF37; text-align: center; font-size: 24px;">Music Academy Pro</h1>
        <p style="color: #EDEDED; font-size: 16px; line-height: 1.6;">
          You requested a password reset. Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #D4AF37; color: #0A0A0A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">
          If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}
