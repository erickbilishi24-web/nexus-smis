import { notifyOwner } from "./_core/notification";

export const OFFICIAL_SENDER_EMAIL = "nexus.smis@gmail.com";

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: OFFICIAL_SENDER_EMAIL, to: [input.to], subject: input.subject, text: input.text }) });
      if (response.ok) return true;
      console.warn(`[Email] Provider rejected message: ${response.status}`);
    } catch (error) { console.warn("[Email] Provider request failed", error); }
  }
  return notifyOwner({ title: input.subject, content: `Email delivery fallback for ${input.to}\n\n${input.text}` });
}
