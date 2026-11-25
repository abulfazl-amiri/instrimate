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
    <style type="text/css">
      @media only screen and (max-width: 480px) {
        .email-gutter { padding:16px 8px !important; }
        .email-card { width:100% !important; }
        .email-content { padding:24px 20px !important; }
        .email-heading { font-size:22px !important; line-height:28px !important; }
        .email-reset-url { font-size:12px !important; line-height:18px !important; word-break:break-all !important; }
      }
    </style>
  </head>
  <body bgcolor="#f3f4f6" style="margin:0; padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="width:100%; border-collapse:collapse;">
      <tr>
        <td class="email-gutter" align="center" style="padding:24px 12px;">
          <table class="email-card" role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%; max-width:480px; border-collapse:collapse;">
            <tr>
              <td class="email-content" style="padding:32px 24px; color:#1f2937; font-family:Arial, Helvetica, sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                  <tr>
                    <td style="padding-bottom:16px;">
                      <h1 class="email-heading" style="margin:0; font-size:24px; line-height:30px;">Reset your password</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:20px; font-size:16px; line-height:24px;">
                      <p style="margin:0;">We received a request to reset the password for your Instrimate account.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:20px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000">
                        <tr>
                          <td align="center" bgcolor="#000000" style="padding:14px 24px; background-color:#000000;">
                            <a href="${safeResetUrl}" style="color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:bold; text-decoration:none;">Reset password</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:8px; color:#4b5563; font-size:14px; line-height:21px;">
                      <p style="margin:0;">If the button doesn't work, copy and paste this link into your browser:</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="email-reset-url" style="padding-bottom:20px; font-size:14px; line-height:21px; overflow-wrap:anywhere; word-wrap:break-word;">
                      <a href="${safeResetUrl}" style="color:#1d4ed8;">${safeResetUrl}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:16px; font-size:16px; line-height:24px;">
                      <p style="margin:0;">This link expires in <strong>${safeExpiry}</strong>.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px; color:#4b5563; font-size:14px; line-height:21px;">
                      <p style="margin:0;">If you didn't request a password reset, you can ignore this email. Your password won't change unless you use the link.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#4b5563; font-size:14px; line-height:21px;">
                      <p style="margin:0;">For your security, don't share this link with anyone.</p>
                    </td>
                  </tr>
                </table>
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
