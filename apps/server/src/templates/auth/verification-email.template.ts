import { escapeHtml, formatExpiry } from "../email-template.util.js";

export const createVerificationEmailTemplate = (code: string, ttlSeconds: number) => {
  const expiry = formatExpiry(ttlSeconds);
  const safeCode = escapeHtml(code);
  const safeExpiry = escapeHtml(expiry);

  return {
    subject: "Verify your Instrimate email",
    message: [
      "Welcome to Instrimate!",
      "Enter this one-time code to verify your email address:",
      code,
      `This code expires in ${expiry}.`,
      "If you didn't create an Instrimate account, you can ignore this email.",
    ].join("\n\n"),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your Instrimate email</title>
    <style type="text/css">
      @media only screen and (max-width: 480px) {
        .email-gutter { padding:16px 8px !important; }
        .email-card { width:100% !important; }
        .email-content { padding:24px 20px !important; }
        .email-heading { font-size:22px !important; line-height:28px !important; }
        .email-code { font-size:28px !important; letter-spacing:6px !important; }
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
                <h1 class="email-heading" style="margin:0 0 16px; font-size:24px; line-height:30px;">Verify your email</h1>
                <p style="margin:0 0 20px; font-size:16px; line-height:24px;">Welcome to Instrimate! Enter this one-time code to verify your email address:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="border-collapse:collapse;">
                  <tr>
                    <td align="center" style="padding:16px;">
                      <span class="email-code" style="color:#111827; font-family:Arial, Helvetica, sans-serif; font-size:32px; font-weight:bold; letter-spacing:8px;">${safeCode}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0; font-size:16px; line-height:24px;">This code expires in <strong>${safeExpiry}</strong>.</p>
                <p style="margin:16px 0 0; color:#4b5563; font-size:14px; line-height:21px;">If you didn't create an Instrimate account, you can ignore this email.</p>
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
