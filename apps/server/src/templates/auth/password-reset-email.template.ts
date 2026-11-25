import { escapeHtml, formatExpiry } from "../email-template.util.js";

export const createPasswordResetEmailTemplate = (resetUrl: string, ttlSeconds: number) => {
  const expiry = formatExpiry(ttlSeconds);
  const safeResetUrl = escapeHtml(resetUrl);
  const safeExpiry = escapeHtml(expiry);

  return {
    subject: "Reset your Instrimate password",
    message: [
      "We received a request to reset the password for your Instrimate account.",
      "Use this link to choose a new password:",
      resetUrl,
      `This link expires in ${expiry}.`,
      "If you didn't request a password reset, you can ignore this email. Your password won't change unless you use the link.",
      "For your security, don't share this link with anyone.",
    ].join("\n\n"),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your Instrimate password</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%; max-width:480px; border-collapse:collapse; background-color:#ffffff;">
            <tr>
              <td style="padding:32px 24px; color:#1f2937; font-family:Arial, Helvetica, sans-serif;">
                <h1 style="margin:0 0 16px; font-size:24px; line-height:30px;">Reset your password</h1>
                <p style="margin:0 0 20px; font-size:16px; line-height:24px;">We received a request to reset the password for your Instrimate account.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#1d4ed8" style="border-collapse:collapse;">
                  <tr>
                    <td align="center">
                      <a href="${safeResetUrl}" style="display:block; padding:14px 24px; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:bold; text-decoration:none;">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 8px; font-size:14px; line-height:21px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0; font-size:14px; line-height:21px; word-break:break-all;">
                  <a href="${safeResetUrl}" style="color:#1d4ed8; text-decoration:underline;">${safeResetUrl}</a>
                </p>
                <p style="margin:20px 0 0; font-size:16px; line-height:24px;">This link expires in <strong>${safeExpiry}</strong>.</p>
                <p style="margin:16px 0 0; color:#4b5563; font-size:14px; line-height:21px;">If you didn't request a password reset, you can ignore this email. Your password won't change unless you use the link.</p>
                <p style="margin:12px 0 0; color:#4b5563; font-size:14px; line-height:21px;">For your security, don't share this link with anyone.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};
