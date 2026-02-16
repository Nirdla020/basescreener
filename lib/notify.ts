export async function notifyEmail(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BaseScreener <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
  } catch {
    // ignore
  }
}