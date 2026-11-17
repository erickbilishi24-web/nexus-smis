import { notifyOwner } from "./_core/notification";

export const OFFICIAL_SENDER_EMAIL = "nexus.smis@gmail.com";
export const OFFICIAL_SENDER = `NEXUS SMIS <${OFFICIAL_SENDER_EMAIL}>`;
const OFFICIAL_LOGO_URL = "https://kenyansmis-8jwcu8tn.manus.space/manus-storage/NEXUS-official-logo_e914a58f.png";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export function renderBrandedEmail(subject: string, text: string) {
  const paragraphs = text.split(/\n\s*\n/).map(paragraph => `<p style="margin:0 0 16px;line-height:1.65;color:#40574e;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f7f4ed;font-family:Arial,sans-serif;color:#193d32;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f7f4ed;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffefa;border:1px solid #d8e6dc;border-radius:18px;overflow:hidden;"><tr><td style="padding:24px;background:#123f35;text-align:center;"><img src="${OFFICIAL_LOGO_URL}" width="64" height="64" alt="NEXUS SMIS logo" style="display:block;margin:0 auto 12px;border-radius:14px;" /><div style="color:#fff;font-size:19px;font-weight:800;letter-spacing:3px;">NEXUS <span style="color:#e7bd6d;">·</span> SMIS</div></td></tr><tr><td style="padding:32px 28px;"><h1 style="margin:0 0 22px;font-size:24px;color:#193d32;">${escapeHtml(subject)}</h1>${paragraphs}</td></tr><tr><td style="padding:18px 28px;background:#eef6ef;color:#61736a;font-size:12px;line-height:1.6;">NEXUS SMIS · One platform for every school operation.<br />Contact us: <a href="mailto:${OFFICIAL_SENDER_EMAIL}" style="color:#1d6a57;">${OFFICIAL_SENDER_EMAIL}</a> · 0781170437</td></tr></table></td></tr></table></body></html>`;
}

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string; html?: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: OFFICIAL_SENDER, to: [input.to], subject: input.subject, text: input.text, html: input.html ?? renderBrandedEmail(input.subject, input.text) }) });
      if (response.ok) return true;
      console.warn(`[Email] Provider rejected message: ${response.status}`);
    } catch (error) { console.warn("[Email] Provider request failed", error); }
  }
  return notifyOwner({ title: input.subject, content: `Email delivery fallback for ${input.to}\n\n${input.text}` });
}
