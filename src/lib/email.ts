import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

export type Email = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

/**
 * Sends one email through Resend's HTTP API (no SDK needed).
 * In development without a key, emails go to EMAIL_DEV_OUTBOX as JSON files,
 * or are printed to the server log so links can still be copied.
 * Never throws: a failed email must not break signup or password reset.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  try {
    if (config.email.resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.email.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: config.email.from, to: [email.to], subject: email.subject, html: email.html, text: email.text, ...(email.headers ? { headers: email.headers } : {}) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.error("[email] Resend rejected the email", res.status, (await res.text()).slice(0, 300));
        return false;
      }
      return true;
    }
    if (config.email.devOutbox) {
      await mkdir(config.email.devOutbox, { recursive: true });
      const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${email.to.replace(/[^a-z0-9@.-]/gi, "_")}.json`;
      await writeFile(path.join(config.email.devOutbox, file), JSON.stringify(email, null, 2));
      return true;
    }
    console.info(`[email] (not sent: RESEND_API_KEY is not set) to=${email.to} subject="${email.subject}"\n${email.text}`);
    return false;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, well-behaved transactional layout that renders in every mail client. */
export function layout({ heading, body, cta, url, footnote, unsubscribeUrl }: { heading: string; body: string; cta: string; url: string; footnote: string; unsubscribeUrl?: string }) {
  const app = config.appName.toUpperCase();
  const unsub = unsubscribeUrl
    ? `<br><br>You get these alerts because you list a business on ${esc(config.appName)}. <a href="${esc(unsubscribeUrl)}" style="color:#62636a">Turn off alerts</a>.`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0c0c0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e0da;border-radius:14px">
<tr><td style="padding:28px 28px 0;font-size:13px;font-weight:600;letter-spacing:0.2em;color:#825604">♛ ${esc(app)}</td></tr>
<tr><td style="padding:16px 28px 0;font-size:22px;font-weight:600;letter-spacing:-0.02em">${esc(heading)}</td></tr>
<tr><td style="padding:12px 28px 0;font-size:15px;line-height:1.55;color:#3a3a40">${esc(body)}</td></tr>
<tr><td style="padding:24px 28px 0"><a href="${esc(url)}" style="display:inline-block;background:#0c0c0e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${esc(cta)}</a></td></tr>
<tr><td style="padding:20px 28px 28px;font-size:12px;line-height:1.5;color:#62636a">${esc(footnote)}<br><br>If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all;color:#0c0c0e">${esc(url)}</span>${unsub}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}\n\n${cta}: ${url}\n\n${footnote}${unsubscribeUrl ? `\n\nTurn off alerts: ${unsubscribeUrl}` : ""}\n\n${config.appName}`;
  return { html, text };
}

export function verifyEmailMessage(to: string, name: string, url: string): Email {
  return {
    to,
    subject: `Confirm your email for ${config.appName}`,
    ...layout({
      heading: `Welcome, ${name.split(" ")[0]}`,
      body: "Confirm your email address to start upvoting and listing your business. It takes one click.",
      cta: "Confirm my email",
      url,
      footnote: "This link works for 24 hours. If you didn't create an account, you can ignore this email.",
    }),
  };
}

export function resetPasswordMessage(to: string, url: string): Email {
  return {
    to,
    subject: `Reset your ${config.appName} password`,
    ...layout({
      heading: "Reset your password",
      body: "Someone (hopefully you) asked to reset the password for this account. Choose a new one with the button below.",
      cta: "Choose a new password",
      url,
      footnote: "This link works for 1 hour and can be used once. If you didn't ask for this, ignore this email: your password stays the same.",
    }),
  };
}
