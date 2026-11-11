/**
 * Email delivery for the Reset Password sequence.
 *
 * Uses Resend when RESEND_API_KEY is set; otherwise logs the reset link to the
 * server console so the flow is fully testable in local/dev environments.
 */
export type EmailResult = {
  delivered: boolean;
  provider: "resend" | "console";
};

export async function sendResetLink(email: string, link: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[password-reset] reset link for ${email}: ${link}`);
    return { delivered: false, provider: "console" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Dalil Al-Ahkam <onboarding@resend.dev>",
        to: [email],
        subject: "إعادة تعيين كلمة المرور — دليل الأحكام / Reset your password",
        text: [
          "لإعادة تعيين كلمة المرور، افتح الرابط التالي:",
          link,
          "",
          "To reset your password, open this link:",
          link,
          "",
          "الرابط صالح لمدة ساعة واحدة. / This link expires in one hour.",
        ].join("\n"),
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("[password-reset] Resend failed:", response.status, body);
      console.info(`[password-reset] fallback link for ${email}: ${link}`);
      return { delivered: false, provider: "console" };
    }
    return { delivered: true, provider: "resend" };
  } catch (error) {
    console.warn("[password-reset] email delivery failed:", error);
    console.info(`[password-reset] fallback link for ${email}: ${link}`);
    return { delivered: false, provider: "console" };
  }
}
